from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document
from .tasks import process_pptx_task

class PPTXUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Create DB entry with pending status
        document = Document.objects.create(
            file=file_obj,
            original_filename=file_obj.name,
            status='pending'
        )

        # 2. Dispatch task to Celery queue via Redis
        process_pptx_task.delay(str(document.id))

        # 3. Respond instantly to avoid Nginx timeouts
        return Response({
            'id': str(document.id),
            'status': document.status,
            'message': 'File upload accepted. Processing in background.'
        }, status=status.HTTP_202_ACCEPTED)


class PPTXStatusView(APIView):
    def get(self, request, pk, *args, **kwargs):
        try:
            document = Document.objects.get(pk=pk)
            return Response({
                'id': str(document.id),
                'status': document.status,
                'original_filename': document.original_filename,
                'error_message': document.error_message,
                'created_at': document.created_at
            })
        except Document.DoesNotExist:
            return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
