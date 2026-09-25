from pathlib import Path
from zipfile import BadZipFile, ZipFile

from django.conf import settings
from django.core.exceptions import ValidationError

DOC_EXTENSIONS = {"pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx"}
VIDEO_EXTENSIONS = {"mp4", "webm", "mov", "mkv"}
ALLOWED_EXTENSIONS = DOC_EXTENSIONS | VIDEO_EXTENSIONS

OLE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


def validate_material_file(upload):
	doc_max_size = getattr(settings, "MATERIAL_MAX_UPLOAD_SIZE", 50 * 1024 * 1024)
	video_max_size = getattr(settings, "MATERIAL_VIDEO_MAX_UPLOAD_SIZE", 500 * 1024 * 1024)

	if upload.size == 0:
		raise ValidationError("The uploaded file is empty.")

	extension = Path(upload.name).suffix.lower().lstrip(".")

	if extension not in ALLOWED_EXTENSIONS:
		raise ValidationError("Allowed file formats: PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, MP4, WEBM, MOV, MKV.")

	if extension in VIDEO_EXTENSIONS:
		if upload.size > video_max_size:
			raise ValidationError(f"Video file size must not exceed {video_max_size // (1024 * 1024)} MB.")
		return

	if upload.size > doc_max_size:
		raise ValidationError(f"Document file size must not exceed {doc_max_size // (1024 * 1024)} MB.")

	original_position = upload.tell()

	try:
		upload.seek(0)
		header = upload.read(8)
		upload.seek(0)

		if extension == "pdf":
			if not header.startswith(b"%PDF-"):
				raise ValidationError("The file does not appear to be a PDF.")

		elif extension in {"doc", "ppt", "xls"}:
			if header != OLE_SIGNATURE:
				raise ValidationError("The file does not appear to be a supported legacy Office document.")

		else:
			required_entry = {
				"docx": "word/document.xml", 
				"pptx": "ppt/presentation.xml", 
				"xlsx": "xl/workbook.xml"
			}[extension]

			try:
				with ZipFile(upload) as archive:
					names = set(archive.namelist())
					if "[Content_Types].xml" not in names or required_entry not in names:
						raise ValidationError("The file structure does not match its extension.")

			except BadZipFile as exc:
				raise ValidationError("The Office document is not a valid ZIP-based document.") from exc

	finally:
		upload.seek(original_position)