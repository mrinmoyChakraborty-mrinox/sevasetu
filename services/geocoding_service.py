"""
services/geocoding_service.py

Server-side geocoding using the Ola Maps Places API.

Used by the AI report-processing pipeline to convert free-text locations
from Gemini into structured {city, lat, lng} objects.
"""

import logging
import os

import requests

logger = logging.getLogger(__name__)

_OLA_API_BASE = "https://api.olamaps.io"


def geocode_location(text: str, context: str = "") -> dict | None:
    """
    Forward-geocode a free-text location string using Ola Maps.

    If context is supplied, it is searched first as "text, context"; if that
    returns no usable result, the raw text is retried as a fallback.
    """
    if not text or not text.strip():
        return None

    api_key = os.environ.get("OLA_MAPS_API_KEY")
    if not api_key:
        logger.warning("[Geocoding] OLA_MAPS_API_KEY not set; skipping geocode.")
        return None

    location_text = text.strip()
    context_text = (context or "").strip()
    queries = [_contextual_query(location_text, context_text)]
    if queries[0] != location_text:
        queries.append(location_text)

    try:
        first = None
        used_query = queries[0]

        for query_text in queries:
            resp = requests.get(
                f"{_OLA_API_BASE}/places/v1/textsearch",
                params={"input": query_text, "api_key": api_key},
                timeout=8,
            )

            if resp.status_code != 200:
                logger.warning(
                    f"[Geocoding] Text search failed for {query_text!r} - "
                    f"HTTP {resp.status_code}: {resp.text[:200]}"
                )
                continue

            data = resp.json()
            results = data.get("results") or data.get("predictions") or []
            if results:
                first = results[0]
                used_query = query_text
                break

            logger.info(f"[Geocoding] No results for {query_text!r}")

        if not first:
            return None

        geo = first.get("geometry", {}).get("location", {})
        lat = geo.get("lat")
        lng = geo.get("lng")

        if lat is None or lng is None:
            logger.warning(f"[Geocoding] Missing geometry in result for {used_query!r}")
            return None

        city = _extract_city(first)
        logger.info(f"[Geocoding] {used_query!r} -> city={city!r} lat={lat} lng={lng}")
        return {"city": city, "lat": float(lat), "lng": float(lng)}

    except Exception as exc:
        logger.error(f"[Geocoding] Exception for {text!r}: {exc}")
        return None


def geocode_location_safe(text: str, context: str = "") -> dict:
    """
    Like geocode_location(), but always returns a location dict.
    """
    result = geocode_location(text, context=context)
    if result:
        return result
    return {"city": text or "", "lat": None, "lng": None}


def _contextual_query(text: str, context: str) -> str:
    """Append city/state context unless the location already includes it."""
    if not context:
        return text

    if context.lower() in text.lower():
        return text

    return f"{text}, {context}"


def _extract_city(place: dict) -> str:
    """
    Pull the most human-readable short name out of a Places result.
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
