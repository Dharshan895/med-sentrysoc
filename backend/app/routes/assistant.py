
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies import get_current_user
from app.services.rag_engine import answer_from_documents


router = APIRouter(prefix="/api/assistant", tags=["Assistant"])


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


@router.post("/ask")
def ask_assistant(
    data: AskRequest,
    user: dict = Depends(get_current_user),
):
    question = data.question.strip()

    if not question:
        raise HTTPException(400, "Question cannot be empty.")

    try:
        return answer_from_documents(
            question,
            patient_id=user["id"],
            is_admin=False,
        )
    except Exception as exc:
        # Log the underlying exception on the server in production.
        raise HTTPException(
            status_code=500,
            detail="Unable to answer the question right now.",
        ) from exc
