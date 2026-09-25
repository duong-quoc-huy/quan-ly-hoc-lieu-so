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
    cmd = shutil.which("soffice") or shutil.which("libreoffice")
    if cmd:
        return cmd
    linux_paths = ["/usr/bin/soffice", "/usr/bin/libreoffice"]
    for p in linux_paths:
        if os.path.exists(p):
            return p
    return None

def convert_office_to_pdf(material_instance) -> bool:
    mat_id = getattr(material_instance, "pk", "unknown")

    if not material_instance.file or not material_instance.original_filename:
        logger.warning(f"[Material {mat_id}] Missing file object or original_filename.")
        return False

    extension = Path(material_instance.original_filename).suffix.lower().lstrip(".")
    if extension not in OFFICE_EXTENSIONS:
        logger.info(f"[Material {mat_id}] Extension '{extension}' is not in OFFICE_EXTENSIONS. Skipping.")
        return False

    soffice_cmd = get_libreoffice_path()
    if not soffice_cmd:
        logger.error(f"[Material {mat_id}] LibreOffice executable ('soffice') not found on system.")
        return False

    with tempfile.TemporaryDirectory() as temp_dir:
        input_path = os.path.join(temp_dir, material_instance.original_filename)

        try:
            material_instance.file.open("rb")
            material_instance.file.seek(0)
            with open(input_path, "wb") as f:
                for chunk in material_instance.file.chunks():
                    f.write(chunk)
        except Exception as e:
            logger.error(f"[Material {mat_id}] Failed to write input file: {e}")
            return False

        profile_dir = os.path.join(temp_dir, "LO_Profile")
        cmd = [
            soffice_cmd,
            f"-env:UserInstallation=file://{profile_dir}",
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

        custom_env = os.environ.copy()
        custom_env["DBUS_SESSION_BUS_ADDRESS"] = "/dev/null"
        custom_env["SAL_USE_VCLPLUGIN"] = "headless"

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                env=custom_env
            )
            if res.returncode != 0:
                logger.error(f"[Material {mat_id}] LibreOffice failed (exit code {res.returncode}). Stderr: {res.stderr}")
                return False
        except subprocess.TimeoutExpired:
            logger.error(f"[Material {mat_id}] LibreOffice conversion timed out after 120 seconds.")
            return False
        except Exception as e:
            logger.error(f"[Material {mat_id}] Subprocess execution exception: {e}")
            return False

        pdf_files = [f for f in os.listdir(temp_dir) if f.lower().endswith(".pdf")]
        if not pdf_files:
            logger.error(f"[Material {mat_id}] LibreOffice finished but no PDF was created. Stdout: {res.stdout} | Stderr: {res.stderr}")
            return False

        output_pdf_path = os.path.join(temp_dir, pdf_files[0])
        save_name = f"{Path(material_instance.original_filename).stem}_preview.pdf"

        try:
            with open(output_pdf_path, "rb") as pdf_file:
                material_instance.converted_pdf.save(
                    save_name,
                    ContentFile(pdf_file.read()),
                    save=True
                )
            logger.info(f"[Material {mat_id}] Successfully saved converted PDF '{save_name}' to database.")
            return True
        except Exception as e:
            logger.error(f"[Material {mat_id}] Failed to save PDF content to model instance: {e}")
            return False
