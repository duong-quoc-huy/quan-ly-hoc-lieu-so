from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.materials.models import Category, Material

from .models import Quiz, QuizAttempt


class QuizTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.teacher = User.objects.create_user(
            email="quiz-teacher@example.com",
            password="TestPassword123!",
            first_name="Quiz",
            last_name="Teacher",
            phone_number_1="0910000001",
            role=User.Role.TEACHER,
            must_change_password=False,
        )

        cls.student = User.objects.create_user(
            email="quiz-student@example.com",
            password="TestPassword123!",
            first_name="Quiz",
            last_name="Student",
            phone_number_1="0910000002",
            role=User.Role.STUDENT,
            must_change_password=False,
        )

        cls.other_student = User.objects.create_user(
            email="other-student@example.com",
            password="TestPassword123!",
            first_name="Other",
            last_name="Student",
            phone_number_1="0910000003",
            role=User.Role.STUDENT,
            must_change_password=False,
        )

        cls.category = Category.objects.create(
            name="Computer Science",
            slug="quiz-computer-science",
        )

        cls.material = Material.objects.create(
            owner=cls.teacher,
            category=cls.category,
            title="Design Patterns",
            material_type=Material.Type.SLIDES,
            file="materials/test/design-patterns.pdf",
            original_filename="design-patterns.pdf",
            file_size=100,
        )

    def quiz_payload(self):
        return {
            "title": "Design Patterns Quiz",
            "pass_percentage": 60,
            "questions": [
                {
                    "text": "Which pattern allows only one instance?",
                    "explanation": "Singleton restricts instance creation.",
                    "choices": [
                        {"text": "Singleton", "is_correct": True},
                        {"text": "Observer", "is_correct": False},
                    ],
                },
            ],
        }

    def create_quiz(self):
        self.client.force_authenticate(user=self.teacher)

        response = self.client.put(
            reverse(
                "quizzes:teacher-material-quiz",
                kwargs={"material_id": self.material.pk},
            ),
            self.quiz_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        return Quiz.objects.get(pk=response.data["quiz_id"])

    def approve_material(self):
        # Fixture setup: moderation behavior has its own tests.
        Material.objects.filter(pk=self.material.pk).update(
            status=Material.Status.APPROVED
        )

    def start_attempt(self):
        self.client.force_authenticate(user=self.student)

        return self.client.post(
            reverse(
                "quizzes:start-attempt",
                kwargs={"material_id": self.material.pk},
            ),
            {},
            format="json",
        )

    def test_creating_quiz_returns_material_to_pending(self):
        self.approve_material()
        self.create_quiz()

        self.material.refresh_from_db()

        self.assertEqual(
            self.material.status,
            Material.Status.PENDING,
        )

    def test_question_requires_exactly_one_correct_choice(self):
        self.client.force_authenticate(user=self.teacher)

        payload = self.quiz_payload()
        payload["questions"][0]["choices"][1]["is_correct"] = True

        response = self.client.put(
            reverse(
                "quizzes:teacher-material-quiz",
                kwargs={"material_id": self.material.pk},
            ),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(Quiz.objects.count(), 0)

    def test_student_cannot_start_pending_material_quiz(self):
        self.create_quiz()

        response = self.start_attempt()

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_started_attempt_hides_correct_answers(self):
        self.create_quiz()
        self.approve_material()

        response = self.start_attempt()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        question = response.data["quiz"]["questions"][0]

        self.assertNotIn("explanation", question)

        for choice in question["choices"]:
            self.assertNotIn("is_correct", choice)

    def test_submission_scores_and_cannot_be_repeated(self):
        quiz = self.create_quiz()
        self.approve_material()

        start_response = self.start_attempt()
        attempt_id = start_response.data["attempt_id"]

        question = quiz.questions.get()
        correct_choice = question.choices.get(is_correct=True)

        url = reverse(
            "quizzes:submit-attempt",
            kwargs={"attempt_id": attempt_id},
        )

        payload = {
            "answers": [
                {
                    "question_id": str(question.pk),
                    "choice_id": str(correct_choice.pk),
                }
            ]
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["correct_answers"], 1)
        self.assertTrue(response.data["passed"])

        second_response = self.client.post(
            url,
            payload,
            format="json",
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_409_CONFLICT,
        )

    def test_student_cannot_read_another_students_attempt(self):
        self.create_quiz()
        self.approve_material()

        response = self.start_attempt()
        attempt_id = response.data["attempt_id"]

        self.client.force_authenticate(user=self.other_student)

        detail_response = self.client.get(
            reverse(
                "quizzes:my-attempt-detail",
                kwargs={"attempt_id": attempt_id},
            )
        )

        self.assertEqual(
            detail_response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_quiz_edit_preserves_old_attempt_version(self):
        first_quiz = self.create_quiz()
        self.approve_material()

        response = self.start_attempt()
        attempt_id = response.data["attempt_id"]

        second_quiz = self.create_quiz()

        attempt = QuizAttempt.objects.get(pk=attempt_id)

        self.assertEqual(first_quiz.version, 1)
        self.assertEqual(second_quiz.version, 2)
        self.assertEqual(attempt.quiz_id, first_quiz.pk)

        self.material.refresh_from_db()

        self.assertEqual(
            self.material.status,
            Material.Status.PENDING,
        )