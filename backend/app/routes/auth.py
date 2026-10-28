
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.database import connect
from app.dependencies import get_current_user
from app.security import (
    create_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=1024)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: Literal["patient", "admin"]
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(data: RegisterRequest):
    full_name = data.full_name.strip()
    email = str(data.email).strip().lower()

    if len(full_name) < 2:
        raise HTTPException(400, "Enter a valid full name.")

    try:
        password_hash = hash_password(data.password)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    conn = connect()
    try:
        cursor = conn.execute(
            """
            INSERT INTO users (email, full_name, password_hash, role)
            VALUES (?, ?, ?, 'patient')
            """,
            (email, full_name, password_hash),
        )
        conn.commit()

        return {
            "id": cursor.lastrowid,
            "email": email,
            "full_name": full_name,
            "role": "patient",
            "is_active": True,
        }

    except Exception as exc:
        conn.rollback()
        if "UNIQUE constraint failed: users.email" in str(exc):
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            ) from exc
        raise HTTPException(
            status_code=500,
            detail="Unable to create account.",
        ) from exc
    finally:
        conn.close()


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest):
    email = str(data.email).strip().lower()

    conn = connect()
    try:
        row = conn.execute(
            """
            SELECT id, email, full_name, password_hash, role, is_active
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()
    finally:
        conn.close()

    # Use the same error for an unknown email and a wrong password.
    if (
        row is None
        or not verify_password(data.password, row["password_hash"])
        or not row["is_active"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(row["id"], row["role"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 60 * 30,
        "user": {
            "id": row["id"],
            "email": row["email"],
            "full_name": row["full_name"],
            "role": row["role"],
            "is_active": bool(row["is_active"]),
        },
    }


@router.get("/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_current_user)):
    return {
        **user,
        "is_active": bool(user["is_active"]),
    }
