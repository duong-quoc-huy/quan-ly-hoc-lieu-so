from django.urls import path
from .views import (
    FacultyListCreateView,
    MajorListView,
    CategoryListCreateView,
    CategoryDetailView,
    TeacherCategoryListCreateView,
    TeacherCategoryDetailView,
    MyCategoryListView,
    LessonListCreateView,
    LessonDetailView,
    LessonReviewView,
)

app_name = "curriculum"

urlpatterns = [
    path("faculties/", FacultyListCreateView.as_view(), name="faculty-list"),
    path("majors/", MajorListView.as_view(), name="major-list"),
    path("categories/", CategoryListCreateView.as_view(), name="category-list"),
    path("categories/<uuid:category_id>/", CategoryDetailView.as_view(), name="category-detail"),
    path("teacher-assignments/", TeacherCategoryListCreateView.as_view(), name="teacher-assignment-list"),
    path("teacher-assignments/<uuid:assignment_id>/", TeacherCategoryDetailView.as_view(), name="teacher-assignment-detail"),
    path("my-categories/", MyCategoryListView.as_view(), name="my-category-list"),
    path("lessons/", LessonListCreateView.as_view(), name="lesson-list"),
    path("lessons/<uuid:lesson_id>/", LessonDetailView.as_view(), name="lesson-detail"),
    path("lessons/<uuid:lesson_id>/review/", LessonReviewView.as_view(), name="lesson-review"),
]