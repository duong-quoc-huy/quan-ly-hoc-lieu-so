import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from django.core.files.base import ContentFile
import logging

logger = logging.getLogger(__name__)

OFFICE_EXTENSIONS = {"pptx", "ppt", "docx", "doc", "xlsx", "xls"}

def get_libreoffice_path():
	"""Locates LibreOffice executable across Windows and Linux environments."""
	# 1. Check system PATH
	cmd = shutil.which("soffice") or shutil.which("libreoffice")
	if cmd:
		return cmd

	# 2. Windows Fallback Paths
	if os.name == "nt":
		windows_paths = [
			r"C:\Program Files\LibreOffice\program\soffice.exe",
			r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
		]
		for p in windows_paths:
			if os.path.exists(p):
				return p

	# 3. Linux/Ubuntu Fallback Paths
	linux_paths = ["/usr/bin/soffice", "/usr/bin/libreoffice"]
	for p in linux_paths:
		if os.path.exists(p):
			return p

	return None

def convert_office_to_pdf(material_instance) -> bool:
	"""Converts uploaded Office documents into a PDF preview asset for S3/Local storage."""
	if not material_instance.file or not material_instance.original_filename:
		return False

	extension = Path(material_instance.original_filename).suffix.lower().lstrip(".")
	if extension not in OFFICE_EXTENSIONS:
		return False

	soffice_cmd = get_libreoffice_path()
	if not soffice_cmd:
		logger.error("LibreOffice executable ('soffice') not found on this system.")
		return False

	with tempfile.TemporaryDirectory() as temp_dir:
		input_path = os.path.join(temp_dir, material_instance.original_filename)

		# Stream file from storage (Works for both local disk and AWS S3)
		try:
			material_instance.file.open("rb")
			material_instance.file.seek(0)
			with open(input_path, "wb") as f:
				for chunk in material_instance.file.chunks():
					f.write(chunk)
		except Exception as e:
			logger.error(f"Failed to read input file for conversion: {e}")
			return False

		cmd = [
                    soffice_cmd,
                    f"-env:UserInstallation=file://{temp_dir}/LibreOffice_Profile",
                    "--headless",
                    "--invisible",
                    "--nodefault",
                    "--nofirststartwizard",
                    "--nolockcheck",
                    "--nologo",
                    "--norestore",
                    "--convert-to",
                    "pdf",
                    input_path,
                    "--outdir",
                    temp_dir,
               ]
		try:
			subprocess.run(
				cmd,
				capture_output=True,
				timeout=120,
				check=True
			)
		except (subprocess.TimeoutExpired, subprocess.CalledProcessError) as e:
			logger.error(f"LibreOffice conversion failed: {e}")
			return False

		generated_pdf_name = Path(material_instance.original_filename).stem + ".pdf"
		output_pdf_path = os.path.join(temp_dir, generated_pdf_name)

		if os.path.exists(output_pdf_path):
			save_name = f"{Path(material_instance.original_filename).stem}_preview.pdf"
			with open(output_pdf_path, "rb") as pdf_file:
				# Saves generated PDF back to active storage (Local media or AWS S3)
				material_instance.converted_pdf.save(
					save_name,
					ContentFile(pdf_file.read()),
					save=True
				)
			return True

		return False
