
from app.database import connect, init_db
from app.services.rag_engine import index_document, answer_from_documents

TEST_TEXT = (
    "[Page 1]\n"
    "LAB REPORT\n"
    "Date: 2026-10-20\n"
    "Hemoglobin: 12.5 g/dL\n"
    "Glucose: 98 mg/dL\n"
)

document_id = None

try:
    init_db()

    # Create a synthetic test record. Its cleared status is used
    # only to exercise retrieval filtering in this local test.
    with connect() as con:
        cursor = con.execute(
            """
            INSERT INTO documents (
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
                "rag_test_sample.pdf",
                "TEST_ONLY_NOT_A_REAL_UPLOAD",
                "synthetic-test-hash",
                "CLEARED_BY_CONFIGURED_CHECKS",
                "Synthetic RAG test fixture only",
                "lab_report",
                TEST_TEXT,
            ),
        )
        document_id = cursor.lastrowid

        if document_id is None:
            raise RuntimeError("Failed to create the temporary test document.")

    print("Temporary document created:", document_id)

    count = index_document(document_id, TEST_TEXT)
    print("Chunks indexed:", count)

    if count == 0:
        raise RuntimeError("No text chunks were indexed.")

    print("\nAsking the RAG engine a question...")
    result = answer_from_documents(
        "What was the hemoglobin result?"
    )

    print("\nANSWER")
    print(result["answer"])

    print("\nSOURCES")
    for source in result.get("sources", []):
        print(
            f"Document: {source['filename']} | "
            f"Page: {source['page']} | "
            f"Snippet: {source['snippet']}"
        )

    if not result.get("sources"):
        print("No source citations were returned.")

finally:
    if document_id is not None:
        with connect() as con:
            con.execute(
                "DELETE FROM chunks WHERE document_id = ?",
                (document_id,),
            )
            con.execute(
                "DELETE FROM documents WHERE id = ?",
                (document_id,),
            )

        print("\nTemporary test records cleaned up.")
