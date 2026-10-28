
import getpass
import sys
from pathlib import Path

# Support running this file from the backend root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import connect, init_db
from app.security import hash_password


def main():
    init_db()

    email = input("Admin email: ").strip().lower()
    full_name = input("Admin full name: ").strip()
    password = getpass.getpass("Admin password (12+ characters): ")
    confirmation = getpass.getpass("Confirm password: ")

    if password != confirmation:
        print("Passwords do not match.")
        return

    try:
        password_hash = hash_password(password)
    except ValueError as exc:
        print(exc)
        return

    conn = connect()
    try:
        conn.execute(
            """
            INSERT INTO users (email, full_name, password_hash, role)
            VALUES (?, ?, ?, 'admin')
            """,
            (email, full_name, password_hash),
        )
        conn.commit()
        print("Administrator account created.")

    except Exception as exc:
        conn.rollback()
        print(f"Could not create administrator: {exc}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
