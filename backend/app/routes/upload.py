from pathlib import Path
import re
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.config import settings
from app.database import connect
from app.services.security import inspect_pdf
from app.services.ocr_engine import extract_pdf_text
from app.services.medical_extractor import (
    classify_document,
    extract_basic_fields,
)
from app.services.rag_engine import index_document


router = APIRouter(
    prefix="/api",
    tags=["documents"]
)


def safe_filename(filename):
    return re.sub(
        r"[^A-Za-z0-9._-]+",
        "_",
        Path(filename).name
    )[:120] or "upload.pdf"


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    filename = safe_filename(
        file.filename or "upload.pdf"
    )

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted."
        )

    path = settings.rooted_path(
        settings.upload_dir
    ) / f"{uuid.uuid4().hex}_{filename}"

    size = 0

    try:
        with path.open("wb") as output:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                size += len(chunk)

                if size > settings.max_upload_mb * 1024 * 1024:
                    raise HTTPException(
                        status_code=413,
                        detail="File exceeds the upload limit."
                    )

                output.write(chunk)

    except Exception:
        path.unlink(missing_ok=True)
        raise

    finally:
        await file.close()

    with path.open("rb") as uploaded:
        if uploaded.read(5) != b"%PDF-":
            path.unlink(missing_ok=True)

            raise HTTPException(
                status_code=400,
                detail="Invalid PDF signature."
            )

    scan = inspect_pdf(path)

    # Fail closed: no OCR until the configured security
    # gateway has returned an approved status.
    if scan["status"] != "CLEARED_BY_CONFIGURED_CHECKS":
        quarantine_path = (
            settings.rooted_path(settings.quarantine_dir)
            / path.name
        )

        shutil.move(
            str(path),
            str(quarantine_path)
        )

        from app.database import get_connection
        with get_connection() as con:
            cursor = con.execute(
                """
                INSERT INTO documents
                (
                    original_name,
                    stored_name,
                    sha256,
                    security_status,
                    security_findings
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    filename,
                    str(quarantine_path),
                    scan["sha256"],
                    scan["status"],
                    "\n".join(scan["findings"]),
                )
            )

            document_id = cursor.lastrowid

        return {
            "document_id": document_id,
            "filename": filename,
            "security_status": scan["status"],
            "security_findings": scan["findings"],
            "message": (
                "Document quarantined or awaiting review. "
                "OCR was not executed."
            ),
        }

    extraction = extract_pdf_text(path)
    extracted_text = extraction["text"]

    document_type = classify_document(
        extracted_text
    )

    fields = extract_basic_fields(
        extracted_text
    )

    from app.database import get_connection
    with get_connection() as con:
        cursor = con.execute(
            """
            INSERT INTO documents
            (
                original_name,
                stored_name,
                sha256,
                security_status,
                security_findings,
                document_type,
                extracted_text
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                filename,
                str(path),
                scan["sha256"],
                scan["status"],
                "\n".join(scan["findings"]),
                document_type,
                extracted_text,
            )
        )

        document_id = cursor.lastrowid

    index_document(
        document_id,
        extracted_text
    )

    return {
        "document_id": document_id,
        "filename": filename,
        "sha256": scan["sha256"],
        "security_status": scan["status"],
        "document_type": document_type,
        "extracted_fields": fields,
        "pages": extraction["pages"],
        "message": (
            "Document processed. Verify medical "
            "information against the original PDF."
        ),
    }