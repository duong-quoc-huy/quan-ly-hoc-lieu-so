from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.materials.models import Category, Material


class ModerationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="TestPassword123!",
            first_name="Admin",
            last_name="User",
            phone_number_1="0900000001",
            role=User.Role.ADMIN,
            must_change_password=False,
        )

        self.teacher = User.objects.create_user(
            email="teacher@example.com",
            password="TestPassword123!",
            first_name="Teacher",
            last_name="User",
            phone_number_1="0900000002",
            role=User.Role.TEACHER,
            must_change_password=False,
        )

        self.category = Category.objects.create(
            name="Computer Science",
            slug="computer-science",
        )

        # A stored-path placeholder is sufficient for these tests:
        # none of them open or download the file.
        self.material = Material.objects.create(
            owner=self.teacher,
            category=self.category,
            title="Design Patterns",
            description="Introduction to design patterns.",
            material_type=Material.Type.SLIDES,
            file="materials/test/design-patterns.pdf",
            original_filename="design-patterns.pdf",
            file_size=100,
        )

        self.approve_url = reverse(
            "moderation:material-approve",
            kwargs={"material_id": self.material.pk},
        )

        self.reject_url = reverse(
            "moderation:material-reject",
            kwargs={"material_id": self.material.pk},
        )

    def review_payload(self):
        return {
            "expected_updated_at": self.material.updated_at.isoformat()
        }

    def test_admin_can_approve_and_audit_is_created(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.approve_url,
            self.review_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.material.refresh_from_db()

        self.assertEqual(
            self.material.status,
            Material.Status.APPROVED,
        )
        self.assertEqual(
            self.material.reviewed_by_id,
            self.admin.pk,
        )
        self.assertIsNotNone(self.material.reviewed_at)
        self.assertEqual(self.material.rejection_reason, "")

        self.assertEqual(
            AuditLog.objects.filter(
                action=AuditLog.Action.MATERIAL_APPROVE,
                actor=self.admin,
                target_material=self.material,
            ).count(),
            1,
        )

    def test_teacher_cannot_approve(self):
        self.client.force_authenticate(user=self.teacher)

        response = self.client.post(
            self.approve_url,
            self.review_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_password_change_required_blocks_admin(self):
        self.admin.must_change_password = True
        self.admin.save(update_fields=["must_change_password"])

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.approve_url,
            self.review_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_rejection_requires_nonblank_reason(self):
        self.client.force_authenticate(user=self.admin)

        payload = self.review_payload()
        payload["rejection_reason"] = "   "

        response = self.client.post(
            self.reject_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.material.refresh_from_db()
        self.assertEqual(
            self.material.status,
            Material.Status.PENDING,
        )

    def test_admin_can_reject(self):
        self.client.force_authenticate(user=self.admin)

        payload = self.review_payload()
        payload["rejection_reason"] = "Please improve slide readability."

        response = self.client.post(
            self.reject_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.material.refresh_from_db()

        self.assertEqual(
            self.material.status,
            Material.Status.REJECTED,
        )
        self.assertEqual(
            self.material.rejection_reason,
            payload["rejection_reason"],
        )

        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditLog.Action.MATERIAL_REJECT,
                target_material=self.material,
                reason=payload["rejection_reason"],
            ).exists()
        )

    def test_stale_review_is_rejected(self):
        self.client.force_authenticate(user=self.admin)

        payload = self.review_payload()

        # Simulate an edit after the admin loaded the material.
        Material.objects.filter(pk=self.material.pk).update(
            title="Updated Design Patterns",
            updated_at=self.material.updated_at + timedelta(seconds=1),
        )

        response = self.client.post(
            self.approve_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_409_CONFLICT,
        )

        self.material.refresh_from_db()
        self.assertEqual(
            self.material.status,
            Material.Status.PENDING,
        )

    def test_material_cannot_be_reviewed_twice(self):
        self.client.force_authenticate(user=self.admin)

        payload = self.review_payload()

        first_response = self.client.post(
            self.approve_url,
            payload,
            format="json",
        )

        second_response = self.client.post(
            self.approve_url,
            payload,
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            second_response.status_code,
            status.HTTP_409_CONFLICT,
        )

    def test_deleted_material_cannot_be_approved(self):
        self.material.deleted_at = timezone.now()
        self.material.save(update_fields=["deleted_at", "updated_at"])

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.approve_url,
            self.review_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )