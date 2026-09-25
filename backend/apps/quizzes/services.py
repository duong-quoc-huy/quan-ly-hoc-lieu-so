from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.exceptions import APIException, ValidationError, PermissionDenied
from apps.curriculum.services import teacher_can_manage_lesson
from apps.audit.services import log_action
from apps.audit.models import AuditLog
from apps.curriculum.models import Lesson

from .models import Quiz, Question, Choice, QuizAttempt


class AttemptConflict(APIException):
    status_code = 409
    default_detail = "This attempt has already been submitted."
    default_code = "attempt_conflict"


def quiz_queryset():
    return Quiz.objects.prefetch_related("questions__choices")


def latest_quiz(lesson):
    """Returns the absolute latest quiz version (used by Teachers/Admins)."""
    return quiz_queryset().filter(lesson=lesson).order_by("-version").first()


def latest_approved_quiz(lesson):
    """Returns the latest approved and enabled quiz version (used by Students)."""
    return (
        quiz_queryset()
        .filter(lesson=lesson, status=Quiz.Status.APPROVED, is_enabled=True)
        .order_by("-version")
        .first()
    )


def quiz_is_open(quiz):
    now = timezone.now()

    if not quiz.is_enabled or quiz.status != Quiz.Status.APPROVED:
        return False

    if quiz.available_from is not None and now < quiz.available_from:
        return False

    if quiz.available_until is not None and now >= quiz.available_until:
        return False

    return True


def validate_quiz_can_start(quiz):
    now = timezone.now()

    if not quiz.is_enabled or quiz.status != Quiz.Status.APPROVED:
        raise ValidationError({"detail": "This quiz is currently disabled or pending review."})

    if quiz.available_from is not None and now < quiz.available_from:
        raise ValidationError({"detail": "This quiz is not available yet.", "available_from": quiz.available_from})

    if quiz.available_until is not None and now >= quiz.available_until:
        raise ValidationError({"detail": "This quiz is no longer available.", "available_until": quiz.available_until})


@transaction.atomic
def replace_lesson_quiz(*, lesson_id, teacher, data, request):
    lesson = get_object_or_404(Lesson.objects.select_for_update(), lesson_id=lesson_id)

    previous_version = (
        Quiz.objects.filter(lesson=lesson).order_by("-version").values_list("version", flat=True).first()
    )

    if not teacher_can_manage_lesson(teacher, lesson):
        raise PermissionDenied("You are not assigned to this subject.")

    if lesson.status != Lesson.Status.APPROVED:
        raise ValidationError("The lesson must be approved before creating a quiz.")

    quiz = Quiz.objects.create(
        lesson=lesson,
        version=(previous_version or 0) + 1,
        title=data["title"],
        pass_percentage=data["pass_percentage"],
        available_from=data.get("available_from"),
        available_until=data.get("available_until"),
        created_by=teacher,
        status=Quiz.Status.APPROVED,
        is_enabled=True,
    )

    for question_position, question_data in enumerate(data["questions"], start=1):
        question = Question.objects.create(
            quiz=quiz,
            text=question_data["text"],
            explanation=question_data.get("explanation", ""),
            position=question_position,
        )

        Choice.objects.bulk_create([
            Choice(
                question=question,
                text=choice_data["text"],
                is_correct=choice_data["is_correct"],
                position=choice_position,
            )
            for choice_position, choice_data in enumerate(
                question_data["choices"],
                start=1,
            )
        ])

    log_action(
        AuditLog.Action.QUIZ_CREATE,
        actor=teacher,
        target_quiz=quiz,
        request=request,
        reason=f"Quiz version {quiz.version} created for lesson {lesson.pk}.",
    )

    return quiz_queryset().get(pk=quiz.pk)


@transaction.atomic
def start_quiz_attempt(*, lesson_id, student, request):
    lesson = get_object_or_404(Lesson, lesson_id=lesson_id)

    quiz = latest_approved_quiz(lesson)

    if quiz is None:
        raise ValidationError({"detail": "This lesson does not have an active approved quiz."})

    validate_quiz_can_start(quiz)

    existing_attempt = (
        QuizAttempt.objects.filter(
            student=student, quiz=quiz, status=QuizAttempt.Status.IN_PROGRESS
        )
        .order_by("-started_at", "-attempt_id")
        .first()
    )

    if existing_attempt is not None:
        existing_attempt.quiz = quiz
        return existing_attempt, False

    total_questions = len(quiz.questions.all())

    if total_questions == 0:
        raise ValidationError({"detail": "This quiz has no questions."})

    attempt = QuizAttempt.objects.create(
        student=student, quiz=quiz, total_questions=total_questions
    )

    log_action(
        AuditLog.Action.QUIZ_START,
        actor=student,
        target_quiz=quiz,
        request=request,
        reason=f"Started quiz attempt {attempt.pk} for lesson {lesson_id}.",
    )

    return attempt, True


@transaction.atomic
def submit_quiz_attempt(*, attempt_id, student, answers, request):
    attempt = get_object_or_404(
        QuizAttempt.objects.select_related("quiz")
        .select_for_update(of=("self",))
        .filter(student=student),
        attempt_id=attempt_id,
    )

    if attempt.status != QuizAttempt.Status.IN_PROGRESS:
        raise AttemptConflict()

    questions = list(attempt.quiz.questions.prefetch_related("choices"))

    selected = {answer["question_id"]: answer["choice_id"] for answer in answers}

    if len(selected) != len(answers):
        raise ValidationError({"answers": "Duplicate question IDs are not allowed."})

    expected_question_ids = {question.pk for question in questions}

    if set(selected) != expected_question_ids:
        raise ValidationError({
            "answers": (
                "Answer every question in this quiz exactly once. "
                "Questions from other quizzes are not allowed."
            )
        })

    correct_count = 0

    for question in questions:
        choices = {choice.pk: choice for choice in question.choices.all()}
        selected_choice = choices.get(selected[question.pk])

        if selected_choice is None:
            raise ValidationError({
                "answers": f"The selected choice does not belong to question {question.pk}."
            })

        if selected_choice.is_correct:
            correct_count += 1

    total = len(questions)
    now = timezone.now()

    is_late = (
        attempt.quiz.available_until is not None and now >= attempt.quiz.available_until
    )

    if is_late:
        score_percentage = Decimal("0.00")
        passed = False
    else:
        score_percentage = (
            Decimal(correct_count) * Decimal("100") / Decimal(total)
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        passed = correct_count * 100 >= attempt.quiz.pass_percentage * total

    attempt.answers = {
        str(question_id): str(choice_id) for question_id, choice_id in selected.items()
    }
    attempt.correct_answers = correct_count
    attempt.score_percentage = score_percentage
    attempt.passed = passed
    attempt.is_late = is_late
    attempt.status = QuizAttempt.Status.SUBMITTED
    attempt.submitted_at = now

    attempt.save(
        update_fields=[
            "answers",
            "correct_answers",
            "score_percentage",
            "passed",
            "is_late",
            "status",
            "submitted_at",
        ]
    )

    log_action(
        AuditLog.Action.QUIZ_SUBMIT,
        actor=student,
        target_quiz=attempt.quiz,
        request=request,
        reason=f"Submitted quiz attempt {attempt.pk}.",
    )

    return attempt


@transaction.atomic
def remove_lesson_quiz(*, lesson_id, teacher, request):
    lesson = get_object_or_404(
        Lesson.objects.select_for_update(), lesson_id=lesson_id
    )

    previous_quiz = Quiz.objects.filter(lesson=lesson).order_by("-version").first()

    if previous_quiz is None or not previous_quiz.is_enabled:
        return

    disabled_quiz = Quiz.objects.create(
        lesson=lesson,
        version=previous_quiz.version + 1,
        title=previous_quiz.title,
        pass_percentage=previous_quiz.pass_percentage,
        available_from=previous_quiz.available_from,
        available_until=previous_quiz.available_until,
        created_by=teacher,
        status=Quiz.Status.APPROVED,
        is_enabled=False,
    )

    log_action(
        AuditLog.Action.QUIZ_DISABLE,
        actor=teacher,
        target_quiz=disabled_quiz,
        request=request,
        reason=f"Quiz disabled (version {disabled_quiz.version}) for lesson {lesson.pk}.",
    )