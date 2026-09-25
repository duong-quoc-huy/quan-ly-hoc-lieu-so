from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Material
from .tasks import convert_material_to_pdf_task

@receiver(post_save, sender=Material)
def handle_material_pdf_conversion(sender, instance, created, **kwargs):
    if created:
        convert_material_to_pdf_task.delay(instance.pk)
