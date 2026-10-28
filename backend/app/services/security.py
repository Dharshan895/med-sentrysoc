import hashlib
from pathlib import Path

from pypdf import PdfReader


SUSPICIOUS_MARKERS = [
    "/JavaScript",
    "/JS",
    "/OpenAction",
    "/Launch",
    "/EmbeddedFiles",
    "/RichMedia",
    "/SubmitForm",
    "/ImportData",
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(
            lambda: file.read(1024 * 1024),
            b""
        ):
            digest.update(chunk)

    return digest.hexdigest()


def existing_model_predict(path: Path):
    """
    Connect your trained PDF malware model here.

    Expected return format:

    {
        "label": "benign",
        "score": 0.02
    }

    Or:

    {
        "label": "malicious",
        "score": 0.97
    }

    Return None until the real model is connected.
    """

    return None


def inspect_pdf(path: Path) -> dict:
    file_hash = sha256_file(path)
    findings = []

    try:
        reader = PdfReader(
            str(path),
            strict=False
        )

        if reader.is_encrypted:
            findings.append(
                "Encrypted PDF requires further inspection"
            )

        # Inspect PDF catalog and document metadata.
        sample = str(
            reader.trailer.get("/Root", "")
        )

        sample += str(reader.metadata or "")

        # Inspect page annotations and additional actions.
        for page in reader.pages[:30]:
            try:
                sample += str(page.get("/Annots", ""))
                sample += str(page.get("/AA", ""))
            except Exception:
                findings.append(
                    "Some PDF structures could not be inspected"
                )

        for marker in SUSPICIOUS_MARKERS:
            if marker in sample:
                findings.append(
                    f"Suspicious PDF indicator: {marker}"
                )

    except Exception as exc:
        return {
            "status": "QUARANTINE",
            "sha256": file_hash,
            "findings": [
                f"PDF parsing failed: {type(exc).__name__}"
            ]
        }

    model_result = existing_model_predict(path)

    # Do not treat an unconnected model as a clean result.
    if model_result is None:
        findings.append(
            "Malware model is not connected; "
            "security verification is incomplete"
        )

        return {
            "status": "REVIEW_REQUIRED",
            "sha256": file_hash,
            "findings": findings
        }

    label = str(
        model_result.get("label", "")
    ).lower()

    if label in ("malicious", "malware", "infected"):
        findings.append(
            "The trained model classified this file as malicious"
        )

        status = "QUARANTINE"

    elif label in ("benign", "safe", "clean"):
        status = "CLEARED_BY_CONFIGURED_CHECKS"

    else:
        findings.append(
            "Model returned an unknown classification"
        )

        status = "REVIEW_REQUIRED"

    # A suspicious indicator requires further inspection,
    # even if the model predicts benign.
    if any(
        "Suspicious PDF indicator" in item
        for item in findings
    ):
        status = "QUARANTINE"

    return {
        "status": status,
        "sha256": file_hash,
        "findings": findings,
        "model_result": model_result
    }