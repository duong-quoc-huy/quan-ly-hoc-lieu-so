from django.db.models import Avg, Count, Q, OuterRef, Subquery
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import HasChangedPassword, IsAdmin, IsStudent, IsTeacher
from apps.curriculum.models import Lesson
from apps.curriculum.services import teacher_can_manage_lesson

from .models import Quiz, QuizAttempt
from .serializers import (
    QuizEditorSerializer,
    QuizSummarySerializer,
    QuizAttemptSummarySerializer,
    QuizAttemptDetailSerializer,
    SubmitQuizSerializer,
    TeacherQuizStatsSerializer,
    AvailableQuizSerializer,
)
from .throttles import QuizAuthoringThrottle, QuizStartThrottle, QuizSubmitThrottle
from .services import (
    latest_quiz,
    latest_approved_quiz,
    replace_lesson_quiz,
    start_quiz_attempt,
    submit_quiz_attempt,
    remove_lesson_quiz,
)


def get_teacher_lesson(lesson_id, user):
    """Standalone authorization helper for Teacher quiz endpoints."""
    lesson = get_object_or_404(Lesson.objects.select_related("category"), lesson_id=lesson_id)

    if not teacher_can_manage_lesson(user, lesson):
        raise PermissionDenied("You are not assigned to this subject.")

    if lesson.status != Lesson.Status.APPROVED:
        raise PermissionDenied("This lesson has not been approved yet. Quizzes can only be created for approved lessons.")

    return lesson


class AvailableQuizListView(generics.ListAPIView):
    serializer_class = AvailableQuizSerializer
    permission_classes = [IsStudent, HasChangedPassword]

    def get_queryset(self):
        latest_approved_version = (
            Quiz.objects.filter(
                lesson_id=OuterRef("lesson_id"),
                status=Quiz.Status.APPROVED,
                is_enabled=True,
            )
            .order_by("-version")
            .values("version")[:1]
        )

        return (
            Quiz.objects.filter(
                status=Quiz.Status.APPROVED,
                is_enabled=True,
                version=Subquery(latest_approved_version),
            )
            .select_related("lesson", "lesson__category")
            .annotate(question_count=Count("questions"))
            .order_by("lesson__title", "-version")
        )


class PublicLessonQuizView(generics.RetrieveAPIView):
    serializer_class = QuizSummarySerializer
    permission_classes = [AllowAny]

    def get_object(self):
        lesson = get_object_or_404(Lesson, lesson_id=self.kwargs["lesson_id"])
        quiz = latest_approved_quiz(lesson)

        if quiz is None:
            raise NotFound("This lesson does not have an active approved quiz.")

        return quiz


class TeacherLessonQuizView(generics.GenericAPIView):
    serializer_class = QuizEditorSerializer
    permission_classes = [IsTeacher, HasChangedPassword]

    def get(self, request, lesson_id):
        lesson = get_teacher_lesson(lesson_id, request.user)
        quiz = latest_quiz(lesson)

        if quiz is None:
            raise NotFound("This lesson does not have a quiz.")

        return Response(self.get_serializer(quiz).data)

    def put(self, request, lesson_id):
        lesson = get_teacher_lesson(lesson_id, request.user)
        
        # Pass lesson in serializer context for dual-layer validation
        serializer = self.get_serializer(
            data=request.data, 
            context={"request": request, "lesson": lesson}
        )
        serializer.is_valid(raise_exception=True)

        quiz = replace_lesson_quiz(
            lesson_id=lesson_id,
            teacher=request.user,
            data=serializer.validated_data,
            request=request,
        )

        return Response(self.get_serializer(quiz).data, status=status.HTTP_200_OK)

    def delete(self, request, lesson_id):
        get_teacher_lesson(lesson_id, request.user)
        remove_lesson_quiz(lesson_id=lesson_id, teacher=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_throttles(self):
        if self.request.method in {"PUT", "DELETE"}:
            return [QuizAuthoringThrottle()]
        return []


class AdminLessonQuizView(generics.GenericAPIView):
    serializer_class = QuizEditorSerializer
    permission_classes = [IsAdmin, HasChangedPassword]

    def get(self, request, lesson_id):
        lesson = get_object_or_404(Lesson, lesson_id=lesson_id)
        quiz = latest_quiz(lesson)

        if quiz is None:
            raise NotFound("This lesson does not have a quiz.")

        return Response(self.get_serializer(quiz).data)


class StartQuizAttemptView(generics.GenericAPIView):
    serializer_class = QuizAttemptDetailSerializer
    permission_classes = [IsStudent, HasChangedPassword]
    throttle_classes = [QuizStartThrottle]

    def post(self, request, lesson_id):
        attempt, created = start_quiz_attempt(
            lesson_id=lesson_id,
            student=request.user,
            request=request,
        )

        return Response(
            self.get_serializer(attempt).data,
            status=(status.HTTP_201_CREATED if created else status.HTTP_200_OK),
        )


class MyQuizAttemptListView(generics.ListAPIView):
    serializer_class = QuizAttemptSummarySerializer
    permission_classes = [IsStudent, HasChangedPassword]

    def get_queryset(self):
        return QuizAttempt.objects.filter(student=self.request.user).select_related("quiz")


class MyQuizAttemptDetailView(generics.RetrieveAPIView):
    serializer_class = QuizAttemptDetailSerializer
    permission_classes = [IsStudent, HasChangedPassword]
    lookup_field = "attempt_id"

    def get_queryset(self):
        return (
            QuizAttempt.objects.filter(student=self.request.user)
            .select_related("quiz")
            .prefetch_related("quiz__questions__choices")
        )


class SubmitQuizAttemptView(generics.GenericAPIView):
    serializer_class = SubmitQuizSerializer
    permission_classes = [IsStudent, HasChangedPassword]
    throttle_classes = [QuizSubmitThrottle]

    def post(self, request, attempt_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        attempt = submit_quiz_attempt(
            attempt_id=attempt_id,
            student=request.user,
            answers=serializer.validated_data["answers"],
            request=request,
        )

        return Response(QuizAttemptDetailSerializer(attempt).data, status=status.HTTP_200_OK)


class TeacherLessonQuizStatsView(generics.GenericAPIView):
    serializer_class = TeacherQuizStatsSerializer
    permission_classes = [IsTeacher, HasChangedPassword]

    def get(self, request, lesson_id):
        lesson = get_teacher_lesson(lesson_id, request.user)
        current_quiz = latest_quiz(lesson)
        attempts = QuizAttempt.objects.filter(quiz__lesson=lesson)

        submitted = Q(status=QuizAttempt.Status.SUBMITTED)

        stats = attempts.aggregate(
            total_attempts=Count("pk"),
            in_progress_attempts=Count("pk", filter=Q(status=QuizAttempt.Status.IN_PROGRESS)),
            submitted_attempts=Count("pk", filter=submitted),
            unique_participants=Count("student", distinct=True),
            passed_attempts=Count("pk", filter=submitted & Q(passed=True)),
            average_score=Avg("score_percentage", filter=submitted),
        )

        submitted_count = stats["submitted_attempts"]
        pass_rate = (
            round(stats["passed_attempts"] * 100 / submitted_count, 2)
            if submitted_count
            else None
        )
        average_score = stats["average_score"]

        data = {
            "lesson_id": lesson.pk,
            "current_version": (current_quiz.version if current_quiz else None),
            "quiz_enabled": bool(current_quiz and current_quiz.is_enabled and current_quiz.status == Quiz.Status.APPROVED),
            "quiz_versions": Quiz.objects.filter(lesson=lesson, status=Quiz.Status.APPROVED, is_enabled=True).count(),
            **stats,
            "average_score": (
                round(float(average_score), 2) if average_score is not None else None
            ),
            "pass_rate": pass_rate,
        }

        return Response(self.get_serializer(data).data)