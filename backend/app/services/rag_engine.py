import logging

import re
import sqlite3
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.database import connect

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_embedding_model():
    """Load the embedding model once and reuse it."""
    return SentenceTransformer(settings.embedding_model)


def embed_texts(texts: list[str]) -> np.ndarray:
    model = get_embedding_model()

    vectors = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return np.asarray(vectors, dtype=np.float32)


def split_document_pages(text: str) -> list[dict]:
    """Read page markers produced by the OCR engine."""
    matches = list(
        re.finditer(
            r"(?m)^\[Page\s+(\d+)\]\s*$",
            text,
        )
    )

    pages = []

    if not matches:
        if text.strip():
            pages.append({
                "page": "1",
                "text": text.strip(),
            })
        return pages

    for index, match in enumerate(matches):
        start = match.end()
        end = (
            matches[index + 1].start()
            if index + 1 < len(matches)
            else len(text)
        )

        page_text = text[start:end].strip()

        if page_text:
            pages.append({
                "page": match.group(1),
                "text": page_text,
            })

    return pages


def split_into_chunks(text: str, max_chars: int = 900) -> list[str]:
    """Split long pages into overlapping text chunks."""
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return []

    chunks = []
    start = 0
    overlap = 120

    while start < len(text):
        end = min(start + max_chars, len(text))

        # Prefer breaking at a word boundary.
        if end < len(text):
            boundary = text.rfind(" ", start, end)
            if boundary > start:
                end = boundary

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = max(end - overlap, start + 1)

    return chunks


def index_document(document_id: int, extracted_text: str) -> int:
    """
    Replace existing chunks for a document and store embeddings.
    Returns the number of indexed chunks.
    """
    page_chunks = []

    for page in split_document_pages(extracted_text):
        for chunk in split_into_chunks(page["text"]):
            page_chunks.append({
                "page": page["page"],
                "content": chunk,
            })

    with connect() as con:
        con.execute(
            "DELETE FROM chunks WHERE document_id = ?",
            (document_id,),
        )

    if not page_chunks:
        return 0

    vectors = embed_texts([
        item["content"] for item in page_chunks
    ])

    with connect() as con:
        con.executemany(
            """
            INSERT INTO chunks (document_id, page, content, embedding)
            VALUES (?, ?, ?, ?)
            """,
            [
                (
                    document_id,
                    item["page"],
                    item["content"],
                    sqlite3.Binary(vector.tobytes()),
                )
                for item, vector in zip(page_chunks, vectors)
            ],
        )

    return len(page_chunks)


def retrieve_relevant_chunks(
    question: str,
    top_k: int = 5,
    patient_id: int | None = None,
    is_admin: bool = False,
) -> list[dict]:
    """Retrieve the most semantically relevant stored passages."""
    question = question.strip()

    if not question:
        return []

    query_vector = embed_texts([question])[0]

    with connect() as con:
        if is_admin or patient_id is None:
            rows = con.execute(
                """
                SELECT
                    chunks.document_id,
                    chunks.page,
                    chunks.content,
                    chunks.embedding,
                    documents.original_name
                FROM chunks
                JOIN documents ON documents.id = chunks.document_id
                WHERE documents.security_status =
                    'CLEARED_BY_CONFIGURED_CHECKS'
                """
            ).fetchall()
        else:
            rows = con.execute(
                """
                SELECT
                    chunks.document_id,
                    chunks.page,
                    chunks.content,
                    chunks.embedding,
                    documents.original_name
                FROM chunks
                JOIN documents ON documents.id = chunks.document_id
                WHERE documents.security_status =
                    'CLEARED_BY_CONFIGURED_CHECKS'
                  AND documents.patient_id = ?
                """,
                (patient_id,),
            ).fetchall()

    scored = []

    for row in rows:
        raw_embedding = row["embedding"]

        if not raw_embedding:
            continue

        vector = np.frombuffer(
            raw_embedding,
            dtype=np.float32,
        )

        if vector.shape != query_vector.shape:
            continue

        # Embeddings were normalized when indexed.
        score = float(np.dot(query_vector, vector))

        scored.append({
            "document_id": row["document_id"],
            "filename": row["original_name"],
            "page": row["page"],
            "content": row["content"],
            "score": score,
        })

    scored.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return scored[:max(1, top_k)]


def select_answer_sentences(
    question: str,
    passages: list[dict],
    max_sentences: int = 4,
) -> list[dict]:
    """
    Rank source sentences by query-word overlap.

    This is a transparent extractive baseline, not an LLM-generated
    medical interpretation.
    """
    question_words = {
        word.lower()
        for word in re.findall(r"\b[a-zA-Z0-9]+\b", question)
        if len(word) > 2
    }

    candidates = []

    for passage in passages:
        sentences = re.split(
            r"(?<=[.!?])\s+|\n+",
            passage["content"],
        )

        for sentence in sentences:
            sentence = sentence.strip()

            if not sentence:
                continue

            words = {
                word.lower()
                for word in re.findall(
                    r"\b[a-zA-Z0-9]+\b",
                    sentence,
                )
                if len(word) > 2
            }

            overlap = len(question_words & words)

            candidates.append({
                "sentence": sentence,
                "document_id": passage["document_id"],
                "filename": passage["filename"],
                "page": passage["page"],
                "score": overlap,
                "similarity": passage["score"],
            })

    # Prefer sentences that match the question while retaining
    # semantic similarity as a secondary ranking signal.
    candidates.sort(
        key=lambda item: (
            item["score"],
            item["similarity"],
        ),
        reverse=True,
    )

    selected = []
    seen = set()

    for candidate in candidates:
        sentence = candidate["sentence"]
        key = sentence.casefold()

        if key in seen:
            continue

        seen.add(key)
        selected.append(candidate)

        if len(selected) >= max_sentences:
            break

    return selected



def generate_llm_answer(question: str, passages: list[dict]) -> str | None:
    """
    Generate an answer using Groq LLM grounded in the retrieved document passages.
    Returns None if Groq is not configured or fails, falling back to extractive answering.
    """
    api_key = (settings.groq_api_key or "").strip()
    if not api_key or "your_groq_api_key" in api_key:
        return None

    try:
        from groq import Groq

        client = Groq(api_key=api_key)

        context_blocks = []
        for p in passages[:5]:
            context_blocks.append(
                f"[Document: {p.get('filename', 'Unknown')} | Page: {p.get('page', '1')}]\n{p.get('content', '')}"
            )
        context_text = "\n\n".join(context_blocks)

        system_prompt = (
            "You are MediDoc AI, a clinical document assistant. "
            "Your role is to answer questions strictly based on the provided document passages.\n"
            "Rules:\n"
            "1. Answer concisely, professionally, and accurately using only the given context.\n"
            "2. Cite the source document name and page number when stating specific findings.\n"
            "3. If the context does not contain enough information to answer the question, clearly state that the provided documents do not contain the answer.\n"
            "4. Do not speculate or invent medical diagnoses."
        )

        user_content = (
            f"Context from uploaded documents:\n{context_text}\n\n"
            f"Question: {question}\n\n"
            "Please provide a clear and helpful clinical answer based on the context above."
        )

        response = client.chat.completions.create(
            model=settings.groq_model or "llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
            max_tokens=800,
        )

        answer_text = response.choices[0].message.content
        if answer_text and answer_text.strip():
            return answer_text.strip()
    except Exception as exc:
        logger.warning("Groq LLM generation failed, falling back to extractive answer: %s", exc)

    return None


def answer_from_documents(
    question: str,
    patient_id: int | None = None,
    is_admin: bool = False,
) -> dict:
    """Answer from indexed document evidence and return citations."""
    question = question.strip()

    if not question:
        return {
            "answer": "Please enter a question.",
            "sources": [],
        }

    passages = retrieve_relevant_chunks(
        question,
        patient_id=patient_id,
        is_admin=is_admin,
    )

    if not passages:
        return {
            "answer": (
                "I couldn't find any searchable passages in "
                "your processed documents. Upload and index a "
                "document that contains the requested information."
            ),
            "sources": [],
        }

    # 1. Attempt generation via Groq LLM if configured
    llm_answer = generate_llm_answer(question, passages)
    if llm_answer:
        sources = []
        seen_keys = set()
        for item in passages[:3]:
            key = (item["document_id"], item["page"])
            if key in seen_keys:
                continue
            seen_keys.add(key)
            sources.append({
                "document_id": item["document_id"],
                "filename": item["filename"],
                "page": item["page"],
                "snippet": item["content"][:350],
                "similarity": round(item["score"], 4),
            })
        return {
            "answer": llm_answer,
            "sources": sources,
            "answer_type": "generative",
            "medical_verification_required": True,
        }

    # 2. Extractive baseline fallback
    sentences = select_answer_sentences(question, passages)

    # If no sentence has useful lexical overlap, do not present
    # a weak match as a reliable answer.
    useful_sentences = [
        item for item in sentences
        if item["score"] > 0
    ]

    if not useful_sentences:
        return {
            "answer": (
                "I found related document passages, but couldn't "
                "identify a sufficiently direct answer. Try using "
                "the test name, medicine name, or wording from "
                "your document."
            ),
            "sources": [
                {
                    "document_id": item["document_id"],
                    "filename": item["filename"],
                    "page": item["page"],
                    "snippet": item["content"][:500],
                    "similarity": round(item["score"], 4),
                }
                for item in passages[:3]
            ],
        }

    answer = "Based on the uploaded document:\n" + "\n".join(
        f"- {item['sentence']}"
        for item in useful_sentences
    )

    sources = []
    seen_sources = set()

    for item in useful_sentences:
        key = (
            item["document_id"],
            item["page"],
        )

        if key in seen_sources:
            continue

        seen_sources.add(key)

        sources.append({
            "document_id": item["document_id"],
            "filename": item["filename"],
            "page": item["page"],
            "snippet": item["sentence"],
            "similarity": round(item["similarity"], 4),
        })

    return {
        "answer": answer,
        "sources": sources,
        "answer_type": "extractive",
        "medical_verification_required": True,
    }
