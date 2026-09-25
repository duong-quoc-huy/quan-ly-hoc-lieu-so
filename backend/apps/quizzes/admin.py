# from django.contrib import admin

# from .models import Choice, Question, Quiz, QuizAttempt, QuizAttemptAnswer


# class ChoiceInline(admin.TabularInline):
#     model = Choice
#     extra = 2


# class QuestionInline(admin.StackedInline):
#     model = Question
#     extra = 1


# @admin.register(Quiz)
# class QuizAdmin(admin.ModelAdmin):
#     list_display = ("title", "material")
#     inlines = [QuestionInline]


# @admin.register(Question)
# class QuestionAdmin(admin.ModelAdmin):
#     list_display = ("text", "quiz", "order")
#     inlines = [ChoiceInline]


# @admin.register(QuizAttempt)
# class QuizAttemptAdmin(admin.ModelAdmin):
#     list_display = ("student", "quiz", "score", "completed_at")


# admin.site.register(QuizAttemptAnswer)
