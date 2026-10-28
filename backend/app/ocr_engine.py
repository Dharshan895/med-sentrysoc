from pathlib import Path
from collections.abc import Mapping
from tempfile import TemporaryDirectory
import os

# Keep the existing PaddleOCR inference configuration.
os.environ.setdefault("FLAGS_use_mkldnn", "0")

import pymupdf as fitz
from paddleocr import PaddleOCR


# Initialize the OCR model once, rather than for every PDF.
_ocr_engine = None


def get_ocr_engine():
    global _ocr_engine

    if _ocr_engine is None:
        _ocr_engine = PaddleOCR(
            lang="en",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )

    return _ocr_engine


def recognize_image(image_path: str | Path) -> str:
    """Recognize text in a page image using PaddleOCR."""
    ocr = get_ocr_engine()
    results = ocr.predict(str(image_path))

    extracted_lines = []

    for item in results:
        data = getattr(item, "json", None)

        # Some PaddleOCR versions expose json as a property,
        # while others may expose a callable.
        if callable(data):
            data = data()

        if not isinstance(data, Mapping):
            continue

        page_data = data.get("res", data)

        if not isinstance(page_data, Mapping):
            continue

        lines = page_data.get("rec_texts", [])

        if isinstance(lines, list):
            for line in lines:
                if isinstance(line, str) and line.strip():
                    extracted_lines.append(line.strip())

    return "\n".join(extracted_lines)


def extract_pdf_text(pdf_path: str | Path) -> dict:
    """
    Extract text from a PDF page by page.

    Native text extraction is used when available.
    PaddleOCR is used when a page has no native text.
    """
    pdf_path = Path(pdf_path)

    if not pdf_path.is_file():
        raise FileNotFoundError(
            f"PDF not found: {pdf_path.resolve()}"
        )

    pages = []

    with fitz.open(pdf_path) as document:
        for index in range(document.page_count):
            page = document.load_page(index)
            page_number = index + 1

            native_text = page.get_text("text")

            if isinstance(native_text, str):
                native_text = native_text.strip()
            else:
                native_text = ""

            if native_text:
                text = native_text
                method = "native"
            else:
                with TemporaryDirectory(prefix="medidoc_ocr_") as temp_dir:
                    image_path = Path(temp_dir) / "page.png"

                    # Render at 2x resolution, as in your working test.
                    pixmap = page.get_pixmap(
                        matrix=fitz.Matrix(2, 2),
                        alpha=False,
                    )
                    pixmap.save(str(image_path))

                    text = recognize_image(image_path)
                    method = "paddleocr"

            pages.append({
                "page_number": page_number,
                "method": method,
                "text": text,
            })

    combined_text = "\n\n".join(
        f"[Page {page['page_number']}]\n{page['text']}"
        for page in pages
        if page["text"].strip()
    )

    return {
        "filename": pdf_path.name,
        "total_pages": len(pages),
        "extracted_pages": sum(
            bool(page["text"].strip()) for page in pages
        ),
        "text": combined_text,
        "pages": pages,
    }
