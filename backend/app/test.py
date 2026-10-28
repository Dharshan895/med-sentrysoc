import os
os.environ["FLAGS_use_mkldnn"] = "0"

from pathlib import Path
from collections.abc import Mapping

import pymupdf as fitz
from paddleocr import PaddleOCR

PDF_PATH = Path("C:/Users/hp/Desktop/Langsmith/med/backend/app/sample.pdf")

ocr = PaddleOCR(
    lang="en",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)

if not PDF_PATH.exists():
    raise FileNotFoundError(
        f"Cannot find PDF: {PDF_PATH.resolve()}"
    )

with fitz.open(PDF_PATH) as doc:
    for page_index in range(doc.page_count):
        page = doc.load_page(page_index)
        page_number = page_index + 1

        print(f"\n========== PAGE {page_number} ==========")

        # First, try extracting existing PDF text.
        raw_text = page.get_text("text")

        if isinstance(raw_text, str):
            text = raw_text.strip()
        else:
            text = ""

        if text:
            print("[Native PDF text]")
            print(text)
            continue

        if text:
            print("[Native PDF text]")
            print(text)
            continue

        # If no text exists, render the page for OCR.
        image_path = Path(f"_ocr_page_{page_number}.png")
        pix = page.get_pixmap(
            matrix=fitz.Matrix(2, 2),
            alpha=False,
        )
        pix.save(image_path)

        try:
            print("[PaddleOCR text]")
            results = ocr.predict(str(image_path))

            for item in results:
                data = item.json

                if not isinstance(data, Mapping):
                    continue

                page_data = data.get("res", data)

                if not isinstance(page_data, Mapping):
                    continue

                lines = page_data.get("rec_texts", [])

                if isinstance(lines, list):
                    for line in lines:
                        print(line)

        finally:
            image_path.unlink(missing_ok=True)

print("\nPDF processing completed.")
