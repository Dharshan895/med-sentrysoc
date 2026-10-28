import re
from pathlib import Path

import pymupdf as fitz
import pandas as pd


FEATURES = [
    "pdfsize",
    "metadata size",
    "pages",
    "xref Length",
    "title characters",
    "isEncrypted",
    "embedded files",
    "images",
    "text",
    "obj",
    "endobj",
    "stream",
    "endstream",
    "xref",
    "trailer",
    "startxref",
    "pageno",
    "encrypt",
    "ObjStm",
    "JS",
    "Javascript",
    "AA",
    "OpenAction",
    "Acroform",
    "JBIG2Decode",
    "RichMedia",
    "launch",
    "EmbeddedFile",
    "XFA",
    "Colors",
    "pdf_version",
]


def count_pattern(data: bytes, pattern: bytes) -> int:
    """Count occurrences of a PDF keyword, case-insensitively."""
    return len(re.findall(pattern, data, flags=re.IGNORECASE))


def extract_pdf_features(pdf_path: str | Path) -> pd.DataFrame:
    """
    Extract provisional structural features for the PDF malware model.

    WARNING:
    These definitions must be checked against the original training
    extractor before model predictions can be trusted.
    """
    path = Path(pdf_path)
    raw = path.read_bytes()

    with fitz.open(path) as doc:
        metadata = doc.metadata or {}
        metadata_size = len(
            str(metadata).encode("utf-8", errors="ignore")
        )

        title = metadata.get("title") or ""
        page_count = len(doc)

        image_count = 0
        text_length = 0
        colors_count = 0

        for page in doc:
            image_count += len(page.get_images(full=True))
            text_length += len(page.get_text())

            # Provisional estimate of color-related drawing usage.
            for drawing in page.get_drawings():
                if drawing.get("color") is not None:
                    colors_count += 1
                if drawing.get("fill") is not None:
                    colors_count += 1

        xref_length = doc.xref_length()
        encrypted = int(doc.is_encrypted)

        version_match = re.search(
            rb"%PDF-(\d+(?:\.\d+)?)", raw[:1024]
        )
        pdf_version = (
            float(version_match.group(1))
            if version_match
            else 0.0
        )

        # PDF keyword counts are provisional structural indicators.
        # They are not proof that the corresponding action executes.
        features = {
            "pdfsize": len(raw),
            "metadata size": metadata_size,
            "pages": page_count,
            "xref Length": xref_length,
            "title characters": len(title),
            "isEncrypted": encrypted,
            "embedded files": len(doc.embfile_names()),
            "images": image_count,
            "text": text_length,
            "obj": count_pattern(raw, rb"\bobj\b"),
            "endobj": count_pattern(raw, rb"\bendobj\b"),
            "stream": count_pattern(raw, rb"\bstream\b"),
            "endstream": count_pattern(raw, rb"\bendstream\b"),
            "xref": count_pattern(raw, rb"\bxref\b"),
            "trailer": count_pattern(raw, rb"\btrailer\b"),
            "startxref": count_pattern(raw, rb"\bstartxref\b"),
            "pageno": page_count,
            "encrypt": count_pattern(raw, rb"/Encrypt\b"),
            "ObjStm": count_pattern(raw, rb"/ObjStm\b"),
            "JS": count_pattern(raw, rb"/JS\b"),
            "Javascript": count_pattern(raw, rb"/JavaScript\b"),
            "AA": count_pattern(raw, rb"/AA\b"),
            "OpenAction": count_pattern(raw, rb"/OpenAction\b"),
            "Acroform": count_pattern(raw, rb"/AcroForm\b"),
            "JBIG2Decode": count_pattern(raw, rb"/JBIG2Decode\b"),
            "RichMedia": count_pattern(raw, rb"/RichMedia\b"),
            "launch": count_pattern(raw, rb"/Launch\b"),
            "EmbeddedFile": count_pattern(raw, rb"/EmbeddedFile\b"),
            "XFA": count_pattern(raw, rb"/XFA\b"),
            "Colors": colors_count,
            "pdf_version": pdf_version,
        }

    # Ensure the exact column order expected by the model.
    return pd.DataFrame(
        [[features[name] for name in FEATURES]],
        columns=FEATURES,
    )