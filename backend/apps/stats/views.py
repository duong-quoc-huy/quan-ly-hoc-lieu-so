from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q

from apps.accounts.models import User
from apps.accounts.permissions import IsAdmin, HasChangedPassword
from apps.materials.models import Material, MaterialSubmission
from apps.quizzes.models import QuizAttempt
from apps.comments.models import Comment, CommentReport


class AdminSystemStatsView(APIView):
    permission_classes = [IsAdmin, HasChangedPassword]

    def get(self, request):
        user_stats = User.objects.aggregate(
            total_users=Count("pk"),
            students=Count("pk", filter=Q(role=User.Role.STUDENT)),
            teachers=Count("pk", filter=Q(role=User.Role.TEACHER)),
            admins=Count("pk", filter=Q(role=User.Role.ADMIN)),
            deactivated=Count("pk", filter=Q(is_active=False)),
        )

        # 1. Submission-level metrics (Pending, Approved, Rejected)
        submission_stats = MaterialSubmission.objects.filter(deleted_at__isnull=True).aggregate(
            pending=Count("pk", filter=Q(status=MaterialSubmission.Status.PENDING)),
            approved=Count("pk", filter=Q(status=MaterialSubmission.Status.APPROVED)),
            rejected=Count("pk", filter=Q(status=MaterialSubmission.Status.REJECTED)),
        )

        # 2. File-level metrics (Types & S3 Storage size)
        file_stats = Material.objects.filter(submission__deleted_at__isnull=True).aggregate(
            total_materials=Count("pk"),
            documents=Count("pk", filter=Q(material_type=Material.Type.DOCUMENT)),
            slides=Count("pk", filter=Q(material_type=Material.Type.SLIDES)),
            exercises=Count("pk", filter=Q(material_type=Material.Type.EXERCISE)),
            videos=Count("pk", filter=Q(material_type=Material.Type.VIDEO)),
            total_storage_bytes=Sum("file_size"),
        )

        # Ensure total_storage_bytes defaults to 0 if no files exist
        file_stats["total_storage_bytes"] = file_stats["total_storage_bytes"] or 0

        # Combine material metrics into a single dict expected by AdminDashboard.jsx
        material_stats = {
            **submission_stats,
            **file_stats,
        }

        quiz_stats = QuizAttempt.objects.aggregate(
            total_attempts=Count("pk"),
            submitted=Count("pk", filter=Q(status=QuizAttempt.Status.SUBMITTED)),
            passed=Count(
                "pk", filter=Q(status=QuizAttempt.Status.SUBMITTED, passed=True)
            ),
            average_score=Avg(
                "score_percentage", filter=Q(status=QuizAttempt.Status.SUBMITTED)
            ),
        )

        moderation_stats = {
            "pending_comment_reports": CommentReport.objects.count(),
            "total_comments": Comment.objects.filter(deleted_at__isnull=True).count(),
        }

        return Response(
            {
                "users": user_stats,
                "materials": material_stats,
                "quizzes": quiz_stats,
                "moderation": moderation_stats,
            }
        )