
import sqlite3
from contextlib import contextmanager

from app.config import settings


def connect():
    db_path = settings.rooted_path(settings.database_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(str(db_path), timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 30000")

    return connection


@contextmanager
def get_connection():
    connection = connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                full_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'patient'
                    CHECK (role IN ('patient', 'admin')),
                is_active INTEGER NOT NULL DEFAULT 1
                    CHECK (is_active IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL,
                sha256 TEXT,
                security_status TEXT,
                security_findings TEXT,
                document_type TEXT NOT NULL DEFAULT 'unclassified',
                extracted_text TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                page INTEGER,
                content TEXT NOT NULL,
                embedding BLOB,
                FOREIGN KEY(document_id)
                    REFERENCES documents(id) ON DELETE CASCADE
            )
        """)

        # Safe migration for databases created before authentication.
        document_columns = {
            row["name"]
            for row in conn.execute(
                "PRAGMA table_info(documents)"
            ).fetchall()
        }

        if "patient_id" not in document_columns:
            conn.execute(
                "ALTER TABLE documents ADD COLUMN patient_id INTEGER "
                "REFERENCES users(id) ON DELETE RESTRICT"
            )

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_patient_created
            ON documents(patient_id, created_at)
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_chunks_document
            ON chunks(document_id)
        """)
