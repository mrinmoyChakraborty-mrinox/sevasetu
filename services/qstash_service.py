"""
services/qstash_service.py
════════════════════════════════════════════════════════════════════
Thin wrapper around the Upstash QStash HTTP API.

Environment variables required
───────────────────────────────
  QSTASH_TOKEN                — from Upstash console → QStash → Tokens
  QSTASH_CURRENT_SIGNING_KEY  — for verifying incoming callbacks
  QSTASH_NEXT_SIGNING_KEY     — for key rotation
  APP_BASE_URL                — e.g. https://sevasetu.vercel.app
                                (no trailing slash)

FIX LOG
───────
v2  Lazy-init the Receiver so it always reads env vars at call time,
    not at module import time (Vercel injects env vars after import).
    Also: request_body is bytes — decode to str before passing to SDK.
    The old code had `receiver = Receiver(...)` at module level which
    read env vars as empty strings and caused "bad signature" 401s.
"""

import os
import json
import logging

import requests

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
QSTASH_PUBLISH_URL = "https://qstash-us-east-1.upstash.io"
_TOKEN             = None   # loaded lazily


def _token() -> str:
    global _TOKEN
    if not _TOKEN:
        _TOKEN = os.environ.get("QSTASH_TOKEN", "")
        if not _TOKEN:
            raise RuntimeError(
                "QSTASH_TOKEN environment variable is not set. "
                "Get it from https://console.upstash.com/qstash"
            )
    return _TOKEN


def _base_url() -> str:
    url = os.environ.get("APP_BASE_URL", "").rstrip("/")
    if not url:
        raise RuntimeError(
            "APP_BASE_URL environment variable is not set. "
            "Set it to your Vercel deployment URL, e.g. https://sevasetu.vercel.app"
        )
    return url


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC HELPERS — one function per job type
# ═════════════════════════════════════════════════════════════════════════════

def enqueue_report_processing(
    report_id: str,
    ngo_uid:   str,
    image_url: str,
    file_name: str,
    file_type: str,
) -> bool:
    """Tell QStash to POST /api/internal/process-report in ~2 seconds."""
    return _publish(
        endpoint   = "/api/internal/process-report",
        body       = {
            "report_id": report_id,
            "ngo_uid":   ngo_uid,
            "image_url": image_url,
            "file_name": file_name,
            "file_type": file_type,
        },
        delay_secs = 2,
        retries    = 3,
    )


def enqueue_matching(need_id: str, need_data: dict) -> bool:
    """Tell QStash to POST /api/internal/run-matching in ~3 seconds."""
    # Strip Firestore SERVER_TIMESTAMP sentinels — not JSON-serialisable
    safe_need = {
        k: (None if hasattr(v, "__class__") and "Sentinel" in type(v).__name__ else v)
        for k, v in need_data.items()
    }
    return _publish(
        endpoint   = "/api/internal/run-matching",
        body       = {"need_id": need_id, "need_data": safe_need},
        delay_secs = 3,
        retries    = 2,
    )


# ═════════════════════════════════════════════════════════════════════════════
# SIGNATURE VERIFICATION
# ═════════════════════════════════════════════════════════════════════════════

def verify_qstash_signature(request_body: bytes, signature_header: str) -> bool:
    """
    Verify that an incoming worker request genuinely came from QStash.

    Key fixes vs. the old version:
      1. Receiver is created LAZILY here, not at module level.
         Module-level init happened before Vercel injected env vars,
         so the keys were always empty strings → every signature failed.
      2. request_body is bytes; the SDK expects a plain str.
         We decode with UTF-8 before passing it in.

    In local dev (QSTASH_CURRENT_SIGNING_KEY not set) we skip
    verification so you can call worker routes directly.
    """
    current_key = os.environ.get("QSTASH_CURRENT_SIGNING_KEY", "")

    if not current_key:
        logger.debug("[QStash] Signing key not set — skipping verification (local dev).")
        return True

    try:
        from qstash import Receiver

        # Build Receiver fresh each call — env vars are guaranteed to be
        # available by the time a real HTTP request arrives on Vercel.
        receiver = Receiver(
            current_signing_key = current_key,
            next_signing_key    = os.environ.get("QSTASH_NEXT_SIGNING_KEY", ""),
        )

        # ── THE FIX: decode bytes → str ───────────────────────────────────
        body_str = (
            request_body.decode("utf-8")
            if isinstance(request_body, bytes)
            else request_body
        )

        is_valid = receiver.verify(body=body_str, signature=signature_header)

        if not is_valid:
            logger.error(
                "[QStash] Signature check returned False. "
                "Check that QSTASH_CURRENT_SIGNING_KEY / NEXT_SIGNING_KEY are correct."
            )
        return is_valid

    except Exception as exc:
        logger.error(f"[QStash] Signature verification error: {exc}")
        return False


# ═════════════════════════════════════════════════════════════════════════════
# INTERNAL — low-level publish
# ═════════════════════════════════════════════════════════════════════════════

def _publish(endpoint: str, body: dict, delay_secs: int = 0, retries: int = 3) -> bool:
    """
    POST a message to QStash.
    QStash will then POST to {APP_BASE_URL}{endpoint} after delay_secs.
    """
    destination = f"{_base_url()}{endpoint}"

    headers = {
        "Authorization":   f"Bearer {_token()}",
        "Content-Type":    "application/json",
        "Upstash-Retries": str(retries),
    }
    if delay_secs > 0:
        headers["Upstash-Delay"] = f"{delay_secs}s"

    try:
        resp = requests.post(
            f"{QSTASH_PUBLISH_URL}/{destination}",
            headers = headers,
            data    = json.dumps(body),
            timeout = 10,
        )

        if resp.status_code in (200, 201, 202):
            msg_id = resp.json().get("messageId", "?")
            logger.info(f"[QStash] Enqueued → {endpoint}  messageId={msg_id}")
            return True

        logger.error(
            f"[QStash] Failed to enqueue → {endpoint} "
            f"status={resp.status_code} body={resp.text[:200]}"
        )
        return False

    except Exception as exc:
        logger.error(f"[QStash] Exception while publishing to {endpoint}: {exc}")
        return False