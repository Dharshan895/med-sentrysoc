
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.config import settings
from app.database import connect
from app.dependencies import get_current_user, require_admin


router = APIRouter(tags=["Documents"])


def document_scope(user: dict):
    if user["role"] == "admin":
        return "", ()

    return " AND patient_id = ?", (user["id"],)


@router.get("/api/documents")
def list_documents(
    q: str = Query(default="", max_length=200),
    document_type: str | None = None,
    security_status: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user),
):
    scope_sql, scope_params = document_scope(user)
    filters = [scope_sql.lstrip() or "1=1"]
    params = list(scope_params)

    if q.strip():
        filters.append(
            "(original_name LIKE ? OR document_type LIKE ?)"
        )
        term = f"%{q.strip()}%"
        params.extend([term, term])

    if document_type:
        filters.append("document_type = ?")
        params.append(document_type)

    if security_status:
        filters.append("security_status = ?")
        params.append(security_status)

    where_clause = " AND ".join(filters)

    conn = connect()
    try:
        total = conn.execute(
            f"SELECT COUNT(*) FROM documents WHERE {where_clause}",
            params,
        ).fetchone()[0]

        rows = conn.execute(
            f"""
            SELECT id, original_name, security_status, document_type,
                   created_at, patient_id
            FROM documents
            WHERE {where_clause}
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (*params, limit, offset),
        ).fetchall()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "documents": [dict(row) for row in rows],
        }
    finally:
        conn.close()


@router.get("/api/documents/{document_id}")
def get_document(
    document_id: int,
    user: dict = Depends(get_current_user),
):
    scope_sql, scope_params = document_scope(user)

    conn = connect()
    try:
        row = conn.execute(
            f"""
            SELECT id, original_name, sha256, security_status,
                   security_findings, document_type, extracted_text,
                   created_at, patient_id
            FROM documents
            WHERE id = ? {scope_sql}
            """,
            (document_id, *scope_params),
        ).fetchone()

        if row is None:
            raise HTTPException(404, "Document not found.")

        return dict(row)
    finally:
        conn.close()


@router.get("/api/timeline")
def get_timeline(user: dict = Depends(get_current_user)):
    scope_sql, scope_params = document_scope(user)

    conn = connect()
    try:
        rows = conn.execute(
            f"""
            SELECT id, original_name, extracted_text, created_at
            FROM documents
            WHERE security_status = 'CLEARED_BY_CONFIGURED_CHECKS'
            {scope_sql}
            ORDER BY created_at DESC
            """,
            scope_params,
        ).fetchall()
    finally:
        conn.close()

    # These are extracted text candidates, not validated clinical results.
    import re

    measurement_pattern = re.compile(
        r"([A-Za-z][A-Za-z0-9 /()-]{1,45}?)"
        r"\s*[:=]\s*"
        r"(-?\d+(?:\.\d+)?)\s*"
        r"(mg/dL|g/dL|mmol/L|mmHg|%|mL|kg|cm|IU/L|U/L)?",
        re.IGNORECASE,
    )

    timeline = []

    for row in rows:
        for match in measurement_pattern.finditer(
            row["extracted_text"] or ""
        ):
            timeline.append({
                "document_id": row["id"],
                "document_name": row["original_name"],
                "document_created_at": row["created_at"],
                "test_or_field": match.group(1).strip(),
                "value": match.group(2),
                "unit": match.group(3) or "",
                "verification_required": True,
            })

    return {"timeline": timeline}


@router.delete("/api/documents/{document_id}")
def delete_document(
    document_id: int,
    user: dict = Depends(get_current_user),
):
    scope_sql, scope_params = document_scope(user)

    conn = connect()
    try:
        row = conn.execute(
            f"""
            SELECT id, stored_name, patient_id
            FROM documents
            WHERE id = ? {scope_sql}
            """,
            (document_id, *scope_params),
        ).fetchone()

        if row is None:
            raise HTTPException(404, "Document not found.")

        # Only permit deletion of files inside the managed directories.
        roots = [
            settings.rooted_path(settings.upload_dir).resolve(),
            settings.rooted_path(settings.quarantine_dir).resolve(),
        ]

        # stored_name is an absolute path string; resolve it directly.
        candidate = Path(row["stored_name"]).resolve()

        file_path = next(
            (
                candidate
                for root in roots
                if candidate != root and root in candidate.parents
            ),
            None,
        )

        conn.execute("BEGIN")
        conn.execute(
            "DELETE FROM chunks WHERE document_id = ?",
            (document_id,),
        )
        conn.execute(
            "DELETE FROM documents WHERE id = ?",
            (document_id,),
        )
        conn.commit()

    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    if file_path and file_path.is_file():
        try:
            file_path.unlink()
        except OSError:
            # Database access has been removed. Log and clean up the
            # orphaned file operationally if the filesystem deletion fails.
            pass

    return {"message": "Document deleted.", "document_id": document_id}


@router.get("/api/admin/unassigned-documents")
def list_unassigned_documents(
    admin: dict = Depends(require_admin),
):
    """Identify legacy records that need verified patient assignment."""
    conn = connect()
    try:
        rows = conn.execute(
            """
            SELECT id, original_name, security_status, document_type,
                   created_at
            FROM documents
            WHERE patient_id IS NULL
            ORDER BY created_at DESC
            """
        ).fetchall()

        return {"documents": [dict(row) for row in rows]}
    finally:
        conn.close()


@router.post("/api/admin/documents/{document_id}/assign/{patient_id}")
def assign_document(
    document_id: int,
    patient_id: int,
    admin: dict = Depends(require_admin),
):
    """Assign a legacy document only after verifying patient identity."""
    conn = connect()
    try:
        patient = conn.execute(
            "SELECT id FROM users WHERE id = ? AND role = 'patient'",
            (patient_id,),
        ).fetchone()

        if patient is None:
            raise HTTPException(404, "Patient not found.")

        document = conn.execute(
            "SELECT id, patient_id FROM documents WHERE id = ?",
            (document_id,),
        ).fetchone()

        if document is None:
            raise HTTPException(404, "Document not found.")

        if document["patient_id"] is not None:
            raise HTTPException(
                409,
                "Document already has an owner. Use a reviewed transfer workflow.",
            )

        conn.execute(
            "UPDATE documents SET patient_id = ? WHERE id = ?",
            (patient_id, document_id),
        )
        conn.commit()

        return {
            "message": "Document assigned.",
            "document_id": document_id,
            "patient_id": patient_id,
        }
    finally:
        conn.close()
