import logging
from celery import shared_task
from .models import Material
from .converters import convert_office_to_pdf

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=2)
def convert_material_to_pdf_task(self, material_id):
    """Asynchronously convert Office/PPTX materials to PDF via Celery."""
    try:
        material = Material.objects.get(pk=material_id)
        success = convert_office_to_pdf(material)
        if success:
            logger.info(f"Successfully converted material {material_id} to PDF.")
        else:
            logger.warning(f"PDF conversion skipped or returned False for material {material_id}.")
    except Material.DoesNotExist:
        logger.error(f"Material {material_id} not found for PDF conversion.")
    except Exception as exc:
        logger.exception(f"PDF conversion failed for material {material_id}: {exc}")
        raise self.retry(exc=exc, countdown=10)
