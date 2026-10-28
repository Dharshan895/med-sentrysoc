
print("STEP 1: Test script started", flush=True)

from pathlib import Path

print("STEP 2: Importing OCR engine...", flush=True)
from ocr_engine import extract_pdf_text

print("STEP 3: OCR engine imported", flush=True)

pdf_path = Path("sample.pdf")
print(f"STEP 4: Checking PDF: {pdf_path.resolve()}", flush=True)

if not pdf_path.is_file():
    raise FileNotFoundError(f"PDF not found: {pdf_path.resolve()}")

print("STEP 5: Extracting PDF text...", flush=True)
result = extract_pdf_text(pdf_path)

print("\nSTEP 6: Extraction completed", flush=True)
print("Filename:", result["filename"])
print("Total pages:", result["total_pages"])
print("Pages with extracted text:", result["extracted_pages"])

for page in result["pages"]:
    print(f"\n--- Page {page['page_number']} ({page['method']}) ---")
    print(page["text"][:1500] or "[No text extracted]")

print("\nOCR engine test completed.", flush=True)
