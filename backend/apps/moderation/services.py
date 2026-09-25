from datetime import timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.audit.models import AuditLog
from apps.audit.services import log_action
from apps.materials.models import MaterialSubmission
from apps.quizzes.models import Quiz
from apps.curriculum.models import Lesson
from .exceptions import ReviewConflict

LOCK_EXPIRATION_MINUTES = 15


def acquire_review_lock(submission_id, admin_user):
    with transaction.atomic():
        submission = get_object_or_404(
            MaterialSubmission.objects
            .select_for_update(of=("self",))
            .select_related("review_locked_by")
            .filter(deleted_at__isnull=True),
            submission_id=submission_id,
        )

        now = timezone.now()

        if submission.review_locked_by_id:
            lock_is_active = (
                submission.review_locked_at
                and now - submission.review_locked_at
                < timedelta(minutes=LOCK_EXPIRATION_MINUTES)
            )

            if (
                lock_is_active
                and submission.review_locked_by_id != admin_user.pk
            ):
                locked_by_name = (
                    submission.review_locked_by.get_full_name()
                    or submission.review_locked_by.email
                )
                raise ReviewConflict(
                    f"This submission is currently being reviewed "
                    f"by Admin {locked_by_name}."
                )

        submission.review_locked_by = admin_user
        submission.review_locked_at = now

        submission.save(
            update_fields=[
                "review_locked_by",
                "review_locked_at",
                "updated_at",
            ]
        )

        return submission


def release_review_lock(submission_id, admin_user):
    with transaction.atomic():
        submission = get_object_or_404(
            MaterialSubmission.objects
            .select_for_update(of=("self",))
            .filter(deleted_at__isnull=True),
            submission_id=submission_id,
        )

        if submission.review_locked_by_id == admin_user.pk:
            submission.review_locked_by = None
            submission.review_locked_at = None

            submission.save(
                update_fields=[
                    "review_locked_by",
                    "review_locked_at",
                    "updated_at",
                ]
            )

        return submission


@transaction.atomic
def review_submission(
    *,
    submission_id,
    reviewer,
    expected_updated_at,
    decision,
    rejection_reason="",
    request=None,
):
    submission = (
        MaterialSubmission.objects
        .select_for_update(of=("self",))
        .select_related("review_locked_by", "lesson")  # Add "lesson" here
        .filter(
            submission_id=submission_id,
            deleted_at__isnull=True,
        )
        .first()
    )

    if submission is None:
        raise NotFound("Material submission not found.")

    if submission.updated_at != expected_updated_at and submission.review_locked_by_id != reviewer.pk:
        raise ReviewConflict(
            "The submission was updated by another user. Please reload it."
        )

    if submission.status != MaterialSubmission.Status.PENDING:
        raise ReviewConflict(
            "Only pending submissions can be reviewed."
        )

    now = timezone.now()

    submission.status = decision
    submission.reviewed_by = reviewer
    submission.reviewed_at = now
    submission.rejection_reason = (
        rejection_reason
        if decision == MaterialSubmission.Status.REJECTED
        else ""
    )
    submission.review_locked_by = None
    submission.review_locked_at = None

    submission.save(update_fields=[
        "status",
        "reviewed_by",
        "reviewed_at",
        "rejection_reason",
        "review_locked_by",
        "review_locked_at",
        "updated_at",
    ])

    # --- AUTO-APPROVE / REJECT PARENT PROPOSED LESSON ---
    if submission.lesson and submission.lesson.status == Lesson.Status.PENDING:
        lesson = submission.lesson
        lesson.status = (
            Lesson.Status.APPROVED 
            if decision == MaterialSubmission.Status.APPROVED 
            else Lesson.Status.REJECTED
        )
        lesson.reviewed_by = reviewer
        lesson.reviewed_at = now
        if decision == MaterialSubmission.Status.REJECTED:
            lesson.rejection_reason = rejection_reason
            
        lesson.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason", "updated_at"])

        # Audit log for lesson approval
        if decision == MaterialSubmission.Status.APPROVED:
            log_action(
                AuditLog.Action.LESSON_APPROVE,
                actor=reviewer,
                target_lesson=lesson,
                request=request,
                reason=f"Auto-approved proposed lesson '{lesson.title}' via material review.",
            )

    action = (
        AuditLog.Action.MATERIAL_APPROVE
        if decision == MaterialSubmission.Status.APPROVED
        else AuditLog.Action.MATERIAL_REJECT
    )

    log_action(
        action,
        actor=reviewer,
        target_material=submission.files.first(),
        request=request,
        reason=rejection_reason or f"Submission {decision}",
    )

    return submission


@transaction.atomic
def review_quiz(
    *,
    quiz_id,
    reviewer,
    expected_updated_at,
    decision,
    rejection_reason="",
    request=None,
):
    quiz = (
        Quiz.objects
        .select_for_update(of=("self",))
        .select_related("lesson")
        .filter(quiz_id=quiz_id)
        .first()
    )

    if quiz is None:
        raise NotFound("Quiz not found.")

    if quiz.updated_at != expected_updated_at:
        raise ReviewConflict(
            "The quiz was changed. Please reload it."
        )

    quiz.status = decision
    quiz.reviewed_by = reviewer
    quiz.reviewed_at = timezone.now()
    quiz.rejection_reason = (
        rejection_reason
        if decision == Quiz.Status.REJECTED
        else ""
    )
    quiz.is_enabled = decision == Quiz.Status.APPROVED
    quiz.save()

    log_action(
        AuditLog.Action.QUIZ_APPROVE
        if decision == Quiz.Status.APPROVED
        else AuditLog.Action.QUIZ_REJECT,
        actor=reviewer,
        target_quiz=quiz,
        request=request,
        reason=rejection_reason or f"Quiz {decision}",
    )

    return quiz