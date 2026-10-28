from pathlib import Path

import fitz
import numpy as np
from PIL import Image

from app.config import settings


_ocr = None


def get_ocr():
    global _ocr

    if _ocr is None:
        from paddleocr import PaddleOCR

        _ocr = PaddleOCR(
            lang=settings.ocr_lang,
            use_doc_orientation_classify=True,
            use_doc_unwarping=False,
            use_textline_orientation=True,
        )

    return _ocr


def get_recognized_text(result):
    """
    Read recognized strings from common PaddleOCR 3.x
    result structures.
    """

    data = getattr(result, "json", result)

    if callable(data):
        data = data()

    if isinstance(data, str):
        import json

        try:
            data = json.loads(data)
        except ValueError:
            return []

    if isinstance(data, dict):
        data = data.get("res", data)

        if isinstance(data, dict):
            texts = data.get("rec_texts", [])

            if isinstance(texts, list):
                return [
                    str(text)
                    for text in texts
                    if str(text).strip()
                ]

    return []


def extract_pdf_text(path: Path) -> dict:
    document = fitz.open(path)
    pages = []
    ocr = None

    try:
        for page_index, page in enumerate(document):

            # Prefer native extraction for digital PDFs.
            native_text = page.get_text("text").strip()

            if len(native_text) >= 30:
                pages.append({
                    "page": page_index + 1,
                    "method": "native_text",
                    "text": native_text,
                })

                continue

            # Render scanned pages to images for OCR.
            if ocr is None:
                ocr = get_ocr()

            pixmap = page.get_pixmap(
                matrix=fitz.Matrix(2.5, 2.5),
                alpha=False
            )

            image = Image.frombytes(
                "RGB",
                (pixmap.width, pixmap.height),
                pixmap.samples
            )

            results = ocr.predict(
                input=np.array(image)
            )

            recognized_lines = []

            for result in results:
                recognized_lines.extend(
                    get_recognized_text(result)
                )

            pages.append({
                "page": page_index + 1,
                "method": "paddleocr",
                "text": "\n".join(recognized_lines),
            })

    finally:
        document.close()

    full_text = "\n\n".join(
        f"[Page {page['page']}]\n{page['text']}"
        for page in pages
        if page["text"]
    )

    return {
        "text": full_text,
        "pages": pages,
    }