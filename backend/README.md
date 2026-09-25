# Backend — Hệ thống Quản lý và Chia sẻ Học liệu số

Django + Django REST Framework API.

## Apps
- `apps/accounts` — custom `User` model with `role` (student/teacher/admin)
- `apps/materials` — `EducationLevel`, `Category`, `Material`, `Download`
- `apps/quizzes` — `Quiz`, `Question`, `Choice`, `QuizAttempt`, `QuizAttemptAnswer`
- `apps/moderation` — `ModerationLog` (approve/reject audit trail)
- `apps/stats` — no models; aggregation views over `Download` / `QuizAttempt`

## Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # then fill in real values
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

By default (no `DB_ENGINE` set) it runs on local sqlite so you can start coding
immediately. Set `DB_ENGINE=postgres` in `.env` plus your Aiven connection
details when you're ready to point at the real database.

## What's stubbed vs. built
- Models, admin registration, and settings (DRF, JWT auth, CORS, Postgres) are complete and migration-tested.
- `apps/*/urls.py` are empty placeholders — serializers/viewsets/permissions per role are the next step.
- JWT auth endpoints are live: `POST /api/auth/login/`, `POST /api/auth/refresh/`.
