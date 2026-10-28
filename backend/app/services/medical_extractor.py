import re
from typing import Any


DOCUMENT_PATTERNS = {
    "prescription": [
        r"\bprescription\b",
        r"\bRx\b",
        r"\bmedication\b",
        r"\bdosage\b",
        r"\btablets?\b",
        r"\bcapsules?\b",
        r"\brefill\b",
    ],
    "lab_report": [
        r"\blaboratory report\b",
        r"\blab report\b",
        r"\btest results?\b",
        r"\bhemoglobin\b",
        r"\bcomplete blood count\b",
        r"\bglucose\b",
        r"\bcholesterol\b",
        r"\breference range\b",
    ],
    "discharge_summary": [
        r"\bdischarge summary\b",
        r"\bdischarge diagnosis\b",
        r"\bdischarge instructions\b",
        r"\bhospital course\b",
        r"\bfollow[- ]up instructions\b",
    ],
    "scan_report": [
        r"\bradiology report\b",
        r"\bMRI\b",
        r"\bCT scan\b",
        r"\bultrasound\b",
        r"\bX-ray\b",
        r"\bimpression:\b",
        r"\bradiological findings\b",
    ],
    "clinical_note": [
        r"\bclinical notes?\b",
        r"\bchief complaint\b",
        r"\bmedical history\b",
        r"\bphysical examination\b",
        r"\bassessment and plan\b",
        r"\bvital signs\b",
    ],
}


def classify_document(text: str) -> str:
    """Classify a document using simple text-pattern matching."""
    if not text or not text.strip():
        return "unclassified"

    scores = {}

    for document_type, patterns in DOCUMENT_PATTERNS.items():
        scores[document_type] = sum(
            len(re.findall(pattern, text, flags=re.IGNORECASE))
            for pattern in patterns
        )

    best_type = max(scores, key=lambda name: scores[name])

    # Avoid assigning a type when no identifying terms are found.
    if scores[best_type] == 0:
        return "unclassified"

    return best_type


def extract_basic_fields(text: str) -> dict[str, Any]:
    """
    Extract basic candidate fields from document text.

    These are text matches, not medically verified facts.
    Always compare extracted values with the original document.
    """
    if not text:
        text = ""

    dates = list(dict.fromkeys(
        re.findall(
            r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"
            r"|\d{4}-\d{2}-\d{2})\b",
            text,
        )
    ))

    # Candidate laboratory measurements with units.
    # These are not interpreted as abnormal or normal.
    measurement_pattern = re.compile(
        r"\b("
        r"hemoglobin|haemoglobin|glucose|cholesterol|"
        r"platelets?|creatinine|urea|sodium|potassium|"
        r"wbc|rbc|hba1c|tsh|bilirubin"
        r")\b"
        r"[\s:=-]{0,20}"
        r"([<>]?\s*\d+(?:\.\d+)?)"
        r"\s*"
        r"(mg/dL|mg/dl|g/dL|g/dl|mmol/L|mmol/l|"
        r"mEq/L|mEq/l|%|IU/L|IU/l|10\^?[369]*/?u?L)?",
        flags=re.IGNORECASE,
    )

    measurements = []

    for match in measurement_pattern.finditer(text):
        measurements.append({
            "test": match.group(1),
            "value": match.group(2).strip(),
            "unit": match.group(3) or "",
            "source_text": text[
                max(0, match.start() - 50):
                min(len(text), match.end() + 50)
            ].replace("\n", " ").strip(),
        })

    # Candidate medicine mentions. These are not prescriptions
    # and must not be treated as verified medication instructions.
    medicine_pattern = re.compile(
        r"\b([A-Za-z][A-Za-z0-9-]{2,})\s+"
        r"(\d+(?:\.\d+)?)\s*"
        r"(mg|mcg|µg|g|ml|mL|IU)\b",
        flags=re.IGNORECASE,
    )

    medicines = []

    for match in medicine_pattern.finditer(text):
        medicines.append({
            "name_candidate": match.group(1),
            "strength": match.group(2),
            "unit": match.group(3),
            "source_text": text[
                max(0, match.start() - 40):
                min(len(text), match.end() + 40)
            ].replace("\n", " ").strip(),
        })

    return {
        "dates": dates,
        "measurements": measurements,
        "medicine_candidates": medicines,
        "verification_required": True,
        "note": (
            "Automatically extracted candidates may be incorrect. "
            "Verify all values against the original document."
        ),
    }
