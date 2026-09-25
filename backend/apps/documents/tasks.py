import logging
from celery import shared_task
from .models import Document

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_pptx_task(self, document_id):
    """Background task for processing uploaded PPTX files."""
    try:
        doc = Document.objects.get(id=document_id)
        doc.status = 'processing'
        doc.save(update_fields=['status'])

        # ========================================================
        # YOUR PPTX PROCESSING LOGIC HERE
        # Example using python-pptx:
        # from pptx import Presentation
        # prs = Presentation(doc.file.path)
        # for slide in prs.slides:
        #     # process text or extract shapes/images
        # ========================================================

        doc.status = 'completed'
        doc.save(update_fields=['status'])
        logger.info(f"Successfully processed PPTX: {document_id}")
        return f"Processed {document_id}"

    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found in database.")
        return f"Document {document_id} missing"

    except Exception as exc:
        logger.exception(f"Error processing PPTX {document_id}: {exc}")
        doc = Document.objects.get(id=document_id)
        doc.status = 'failed'
        doc.error_message = str(exc)
        doc.save(update_fields=['status', 'error_message'])
        # Retry after 10 seconds if transient network/disk error
        raise self.retry(exc=exc, countdown=10)
