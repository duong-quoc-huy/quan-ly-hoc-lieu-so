import traceback
from django.db.models import Q
from django.http import Http404
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response

from apps.accounts.permissions import IsActiveUser, HasChangedPassword
from apps.audit.models import AuditLog
from apps.audit.services import log_action
from apps.materials.models import Material, MaterialSubmission
from .models import Comment, CommentReport
from .serializers import CommentSerializer, CommentReportSerializer


class MaterialCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser, HasChangedPassword]

    def get_queryset(self):
        target_id = self.kwargs["material_id"]
        # Match comments directly on Material OR via parent MaterialSubmission
        return Comment.objects.filter(
            Q(material_id=target_id) | Q(material__submission_id=target_id),
            parent__isnull=True, 
            deleted_at__isnull=True
        ).select_related("author").prefetch_related("replies__author")

    def perform_create(self, serializer):
        try:
            target_id = self.kwargs["material_id"]
            
            # 1. Try finding Material directly by primary key
            material = Material.objects.filter(pk=target_id).first()
            
            # 2. If target_id is a MaterialSubmission ID, get its attached Material file
            if not material:
                material = Material.objects.filter(submission_id=target_id).first()

            if not material:
                raise Http404(f"No Material or MaterialSubmission found matching ID {target_id}")

            serializer.save(
                author=self.request.user,
                material=material
            )
        except Exception as e:
            print("=== COMMENT CREATION ERROR TRACEBACK ===")
            traceback.print_exc()
            print("=======================================")
            raise e


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser, HasChangedPassword]
    lookup_field = "comment_id"
    queryset = Comment.objects.filter(deleted_at__isnull=True)

    def perform_destroy(self, instance):
        user = self.request.user
        is_staff_action = user.role in ["admin", "teacher"] and instance.author != user

        if not is_staff_action and instance.author != user:
            self.permission_denied(self.request, message="You can only delete your own comments.")

        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at", "updated_at"])

        if is_staff_action:
            log_action(
                AuditLog.Action.COMMENT_DELETE if hasattr(AuditLog.Action, 'COMMENT_DELETE') else "COMMENT_DELETE",
                actor=user,
                request=self.request,
                reason=f"{user.role.capitalize()} removed comment by user {instance.author_id}",
            )


class CommentPinToggleView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsActiveUser, HasChangedPassword]

    def post(self, request, comment_id):
        if request.user.role not in ["admin", "teacher"]:
            return Response({"detail": "Only teachers and admins can pin comments."}, status=status.HTTP_403_FORBIDDEN)

        comment = get_object_or_404(Comment, comment_id=comment_id, deleted_at__isnull=True)
        comment.is_pinned = not comment.is_pinned
        comment.pinned_by = request.user if comment.is_pinned else None
        comment.pinned_at = timezone.now() if comment.is_pinned else None
        comment.save(update_fields=["is_pinned", "pinned_by", "pinned_at", "updated_at"])

        log_action(
            "COMMENT_PIN" if comment.is_pinned else "COMMENT_UNPIN",
            actor=request.user,
            request=request,
            reason=f"Comment {'pinned' if comment.is_pinned else 'unpinned'} by {request.user.role}",
        )

        return Response(CommentSerializer(comment).data)


class CommentReportView(generics.CreateAPIView):
    serializer_class = CommentReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveUser, HasChangedPassword]

    def perform_create(self, serializer):
        comment = get_object_or_404(Comment, comment_id=self.kwargs["comment_id"], deleted_at__isnull=True)
        serializer.save(reporter=self.request.user, comment=comment)


class CommentListAPIView(generics.ListAPIView):
    serializer_class = CommentSerializer
    
    def get_queryset(self):
        target_id = self.kwargs.get("material_id")
        return (
            Comment.objects
            .filter(
                Q(material_id=target_id) | Q(material__submission_id=target_id),
                parent__isnull=True, 
                deleted_at__isnull=True
            )
            .select_related("author")
            .prefetch_related("replies__author")
            .order_by("-is_pinned", "-created_at")
        )