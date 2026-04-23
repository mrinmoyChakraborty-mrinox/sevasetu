"""
services/gemini_service.py
════════════════════════════════════════════════════════════════
Uses Gemini 1.5 Flash to extract community needs from field reports.
Supports: PDF images (via ImageKit URL), DOCX text, raw text.

Returns a list of need dicts matching the Firestore schema in
firebase_services.save_extracted_needs_draft().
"""

import os
import json
import logging
import re

logger = logging.getLogger(__name__)

# ── Gemini model to use ──────────────────────────────────────
GEMINI_MODEL = "gemini-2.5-flash"


# ══════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ══════════════════════════════════════════════════════════════


import google.generativeai as genai
from google.genai import types   # new SDK uses google.genai

def extract_needs_from_url(image_url: str, file_type: str = "") -> list[dict]:
    ft        = (file_type or "").lower().strip(".")
    mime_type = "application/pdf" if ft == "pdf" else \
                "image/png"       if ft == "png" else \
                "image/jpeg"      # default for jpg/jpeg/unknown
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return []

    client = genai.Client(api_key=api_key)

    # Detect whether this is a PDF or an image
    lower_url = image_url.lower().split("?")[0]   # strip query params before checking
    is_pdf    = lower_url.endswith(".pdf")
    mime_type = "application/pdf" if is_pdf else _detect_image_mime(lower_url)
    # In generate_content call inside extract_needs_from_url:
    generation_config = genai.types.GenerationConfig(
        response_mime_type = "application/json",
        thinking_config    = {"thinking_budget": 8192}  # mid-range, enough for inference
    )
    try:
        if ft == "docx":
            text = _extract_docx_text(image_url)   # download + parse
            response = client.models.generate_content(
                model    = "gemini-1.5-flash",
                contents = [f"Field report content:\n\n{text}\n\n{_build_prompt()}"],
            )
            return _parse_response(response.text.strip())
        
        response = client.models.generate_content(
            model    = "gemini-1.5-flash",
            contents = [
                types.Part.from_uri(
                    file_uri  = image_url,   # Gemini fetches this itself — no download needed
                    mime_type = mime_type,
                ),
                _build_prompt(),
            ],
        )
        return _parse_response(response.text.strip())

    except Exception as e:
        logger.error(f"Gemini extraction error: {e}")
        return []


def _detect_image_mime(url: str) -> str:
    if url.endswith(".png"):  return "image/png"
    if url.endswith(".jpg") or url.endswith(".jpeg"): return "image/jpeg"
    return "image/jpeg"   # safe default for ImageKit URLs


def _extract_docx_text(url: str) -> str:
    import urllib.request
    import io
    from docx import Document   # pip install python-docx
    with urllib.request.urlopen(url, timeout=15) as resp:
        data = resp.read()
    doc  = Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())[:8000]
# ══════════════════════════════════════════════════════════════
# PROMPT
# ══════════════════════════════════════════════════════════════

def _build_prompt() -> str:
    return """
You are an AI assistant for SevaSetu, an NGO volunteer coordination platform.

Analyze this field report image and extract ALL distinct community needs mentioned.
For each need, output a JSON object.

Return ONLY a valid JSON array. No markdown, no code fences, no explanations.
If no needs are found, return an empty array: []

Each object must have these exact fields:
{
  "title":               "Short descriptive title (max 10 words)",
  "description":         "Detailed description of the need (2-4 sentences)",
  "category":            "One of: Healthcare | Education | Logistics | Food & Nutrition | Shelter | Mental Health | Water & Sanitation | Environment | Other",
  "urgency_score":       8,
  "urgency_label":       "HIGH",
  "urgency_inferred":    true,
  "urgency_reason":      "Brief reason why this urgency was inferred",
  "required_skills":     ["Skill 1", "Skill 2"],
  "location":            "Specific location mentioned, or empty string",
  "beneficiaries":       "Who will benefit (e.g. '120 families', 'elderly residents')",
  "estimated_people":    120,
  "deadline_suggestion": "immediate | urgent | planned"
}

Urgency scoring guide:
- 9-10: Life-threatening, immediate medical/food/water crisis
- 7-8:  Serious issue affecting health or safety
- 5-6:  Moderate issue with near-term impact
- 3-4:  Planning-stage or non-urgent
- 1-2:  Long-term / informational

Required skills should be practical volunteer skills such as:
First Aid, Medical, Teaching, Driving, Logistics, Counseling,
Construction, Cooking, IT Support, Translation, etc.

Extract as many distinct needs as mentioned in the report. Be specific.
"""


# ══════════════════════════════════════════════════════════════
# RESPONSE PARSER
# ══════════════════════════════════════════════════════════════

def _parse_response(raw: str) -> list[dict]:
    """
    Safely parse Gemini's response.
    Handles accidental markdown fences and trailing commas.
    """
    if not raw:
        return []

    # Strip markdown code fences
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last fence lines
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    # Find JSON array
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if not match:
        logger.warning(f"No JSON array found in Gemini response: {text[:200]}")
        return []

    json_str = match.group(0)

    # Fix common JSON issues: trailing commas before } or ]
    json_str = re.sub(r',\s*([}\]])', r'\1', json_str)

    try:
        needs = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON: {e}\nRaw: {json_str[:400]}")
        return []

    if not isinstance(needs, list):
        return []

    # Validate and sanitize each need
    sanitized = []
    for n in needs:
        if not isinstance(n, dict):
            continue
        if not n.get("title"):
            continue

        sanitized.append({
            "title":               str(n.get("title", ""))[:120],
            "description":         str(n.get("description", "")),
            "category":            str(n.get("category", "Other")),
            "urgency_score":       int(n.get("urgency_score", 5)),
            "urgency_label":       str(n.get("urgency_label", "MEDIUM")).upper(),
            "urgency_inferred":    bool(n.get("urgency_inferred", True)),
            "urgency_reason":      str(n.get("urgency_reason", "")),
            "required_skills":     [str(s) for s in (n.get("required_skills") or [])],
            "location":            str(n.get("location", "")),
            "beneficiaries":       str(n.get("beneficiaries", "")),
            "estimated_people":    _to_int(n.get("estimated_people")),
            "deadline_suggestion": str(n.get("deadline_suggestion", "planned")),
        })

    logger.info(f"Gemini extracted {len(sanitized)} needs.")
    return sanitized


def _to_int(val):
    try:
        return int(val) if val is not None else None
    except (TypeError, ValueError):
        return None


# ══════════════════════════════════════════════════════════════
# PDF HELPER (optional — only if PyMuPDF is installed)
# ══════════════════════════════════════════════════════════════

def _pdf_first_page_bytes(pdf_bytes: bytes) -> tuple[bytes, str]:
    """Convert the first page of a PDF to a JPEG image bytes."""
    try:
        import fitz  # PyMuPDF
        import io
        doc  = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc.load_page(0)
        mat  = fitz.Matrix(2.0, 2.0)   # 2x zoom for better OCR quality
        pix  = page.get_pixmap(matrix=mat, alpha=False)
        doc.close()
        return pix.tobytes("jpeg"), "image/jpeg"
    except ImportError:
        raise RuntimeError("PyMuPDF not installed")