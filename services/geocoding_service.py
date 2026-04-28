"""
services/geocoding_service.py
════════════════════════════════════════════════════════════════════
Server-side geocoding using the OlaMaps Places API.

Used by the AI report-processing pipeline to convert the plain-text
location strings that Gemini extracts (e.g. "vidyasagapur durga
mandir, kharagpur") into structured { city, lat, lng } objects that
match the format used when NGOs pin a location manually.

Public functions
────────────────
  geocode_location(text)  →  {"city": str, "lat": float, "lng": float}
                             or None if the lookup fails / no results

API used: OlaMaps Text Search
  POST https://api.olamaps.io/places/v1/textsearch
  Query param: input=<text>
  Response: results[0].geometry.location  +  formatted_address
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

_OLA_API_BASE = "https://api.olamaps.io"


def geocode_location(text: str) -> dict | None:
    """
    Forward-geocode a free-text location string using OlaMaps.

    Returns a dict  { city: str, lat: float, lng: float }
    or None on failure / empty results.

    The function is intentionally lenient — if any step fails it
    returns None so callers can fall back to storing the raw string.
    """
    if not text or not text.strip():
        return None

    api_key = os.environ.get("OLA_MAPS_API_KEY")
    if not api_key:
        logger.warning("[Geocoding] OLA_MAPS_API_KEY not set — skipping geocode.")
        return None

    try:
        resp = requests.get(
            f"{_OLA_API_BASE}/places/v1/textsearch",
            params={"input": text.strip(), "api_key": api_key},
            timeout=8,
        )

        if resp.status_code != 200:
            logger.warning(
                f"[Geocoding] Text search failed for {text!r} — "
                f"HTTP {resp.status_code}: {resp.text[:200]}"
            )
            return None

        data = resp.json()
        results = data.get("results") or data.get("predictions") or []

        if not results:
            logger.info(f"[Geocoding] No results for {text!r}")
            return None

        first = results[0]

        # ── Extract lat/lng ───────────────────────────────────────
        geo = first.get("geometry", {}).get("location", {})
        lat = geo.get("lat")
        lng = geo.get("lng")

        if lat is None or lng is None:
            logger.warning(f"[Geocoding] Missing geometry in result for {text!r}")
            return None

        # ── Extract a clean city / short name ────────────────────
        # Prefer address_components locality, fall back to first
        # comma-separated part of formatted_address.
        city = _extract_city(first)

        logger.info(
            f"[Geocoding] '{text}' → city={city!r}  lat={lat}  lng={lng}"
        )
        return {"city": city, "lat": float(lat), "lng": float(lng)}

    except Exception as exc:
        logger.error(f"[Geocoding] Exception for {text!r}: {exc}")
        return None


def geocode_location_safe(text: str) -> dict:
    """
    Like geocode_location() but always returns a dict.
    Falls back to  { city: text, lat: None, lng: None }
    so Firestore writes never fail due to a missing location.
    """
    result = geocode_location(text)
    if result:
        return result
    # Preserve the raw text as city so it's still searchable
    return {"city": text or "", "lat": None, "lng": None}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _extract_city(place: dict) -> str:
    """
    Pull the most human-readable short name out of a Places result.

    Priority:
    1. address_components with type "locality"
    2. address_components with type "administrative_area_level_2"
    3. First token of formatted_address
    4. place name field
    """
    components = place.get("address_components") or []
    for comp in components:
        types = comp.get("types") or []
        if "locality" in types:
            return comp.get("long_name", "")

    for comp in components:
        types = comp.get("types") or []
        if "administrative_area_level_2" in types:
            return comp.get("long_name", "")

    formatted = place.get("formatted_address", "")
    if formatted:
        return formatted.split(",")[0].strip()

    return place.get("name", "")
