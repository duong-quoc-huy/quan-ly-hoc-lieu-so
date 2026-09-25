import django_filters

from apps.curriculum.models import Category

from .models import Material, MaterialSubmission


class MaterialSubmissionFilter(django_filters.FilterSet):
    lesson = django_filters.UUIDFilter(
        field_name="lesson__lesson_id"
    )
    category = django_filters.UUIDFilter(
        method="filter_category"
    )
    major = django_filters.UUIDFilter(
        field_name="lesson__category__major__major_id"
    )
    faculty = django_filters.UUIDFilter(
        field_name="lesson__category__major__faculty__faculty_id"
    )
    material_type = django_filters.ChoiceFilter(
        choices=Material.Type.choices,
        method="filter_material_type",
    )

    class Meta:
        model = MaterialSubmission
        fields = [
            "lesson",
            "category",
            "major",
            "faculty",
            "material_type",
        ]

    def filter_category(self, queryset, name, value):
        category_ids = {value}
        frontier = {value}

        while frontier:
            child_ids = set(
                Category.objects.filter(
                    parent_id__in=frontier
                ).values_list("pk", flat=True)
            )
            frontier = child_ids - category_ids
            category_ids.update(frontier)

        return queryset.filter(
            lesson__category_id__in=category_ids
        )


    def filter_material_type(self, queryset, name, value):
        return queryset.filter(
            files__material_type=value
        ).distinct()


class MyMaterialSubmissionFilter(MaterialSubmissionFilter):
    status = django_filters.ChoiceFilter(
        choices=MaterialSubmission.Status.choices
    )

    class Meta(MaterialSubmissionFilter.Meta):
        fields = [
            "lesson",
            "category",
            "major",
            "faculty",
            "material_type",
            "status",
        ]