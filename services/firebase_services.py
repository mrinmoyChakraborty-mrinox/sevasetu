import firebase_admin
import math
from firebase_admin import credentials, firestore, auth, storage
import os,json
from flask import jsonify
from datetime import datetime, timedelta

firebase_creds = os.environ.get("FIREBASE_CONFIG")

if firebase_creds:
    cred_dict = json.loads(firebase_creds)
    cred = credentials.Certificate(cred_dict)
else:
    # fallback for local dev
    raise Exception("FIREBASE_SERVICE_ACCOUNT environment variable not set")

# ======================
# Firebase Init
# ======================

# Avoid 'app already exists' error if this file is imported more than once
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

def get_db():
    return db

def get_user_by_uid(uid):
    doc = db.collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None
    
def add_user(uid,email,name,photo_url,role=None):
    user_ref = db.collection("users").document(uid)
    user_ref.set({
        "uid": uid,
        "name": name,
        "email": email,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "photo_url":photo_url,
        "role":role,
        "phone":None
    })

def update_role(uid, role):
    db.collection("users").document(uid).update({
        "role": role,
        "createdAt": firestore.SERVER_TIMESTAMP
    })

def create_volunteer_profile(uid,data):
    db.collection("volunteers").document(uid).set({
        "name": data["name"],
        "availability": data["availability"],
        "location": data["location"],
        "online": data["online"],
        "photo_url": data["photo_url"],
        "radius": data["radius"],
        "rating": 0,
        "totalTasks":0,
        "verified": False,
        "skills": data["skills"],
        "createdAt": firestore.SERVER_TIMESTAMP
    })
    db.collection("users").document(uid).update({
        "phone": data["phone"]
    })

def create_ngo_profile(uid,data):
    db.collection("ngos").document(uid).set({
        "org_name": data["org_name"],
        "contact_email": data["contact_email"],
        "phone": data["phone"],
        "logo_url": data["logo_url"],

        "description": data["description"],
        "location": data["location"],
        "createdAt": firestore.SERVER_TIMESTAMP
    })



# ══════════════════════════════════════════════
# NGO PROFILE
# ══════════════════════════════════════════════

def get_ngo_profile(uid):
    doc = db.collection("ngos").document(uid).get()
    return doc.to_dict() if doc.exists else {}


def update_ngo_profile(uid, data):
    db.collection("ngos").document(uid).set(data, merge=True)


# ══════════════════════════════════════════════
# NEEDS
# ══════════════════════════════════════════════

def get_needs_by_ngo(ngo_id):
    docs = (
        db.collection("needs")
          .where("ngo_id", "==", ngo_id)
          .stream()
    )
    result = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        result.append(d)
    return result


def create_need(need_data):
    ref = db.collection("needs").add(need_data)
    return ref[1].id

def get_need_by_need_id(need_id):
    need_doc = db.collection("needs").document(need_id).get()
    return need_doc

def get_need_by_id(need_id):
    doc = db.collection("needs").document(need_id).get()
    if not doc.exists:
        return None
    d = doc.to_dict()
    d["id"] = doc.id
    return d


def update_need_status(need_id, status):
    db.collection("needs").document(need_id).update({
        "status": status,
        "updated_at": firestore.SERVER_TIMESTAMP
    })


# ══════════════════════════════════════════════
# MATCHES
# ══════════════════════════════════════════════

 
def get_suggested_matches_for_ngo(ngo_id, limit=5):
    """
    Returns suggested matches for NGO dashboard.
    Now includes AI reasoning fields from matching_service v2.
    """
    from firebase_admin import firestore as _fs
    db = _fs.client()
 
    docs = (
        db.collection("matches")
          .where("ngo_id", "==", ngo_id)
          .where("status", "==", "suggested")
          .order_by("match_score", direction=_fs.Query.DESCENDING)
          .limit(limit)
          .stream()
    )
 
    matches = []
    for doc in docs:
        d           = doc.to_dict()
        d["match_id"] = doc.id
 
        # Fetch volunteer details
        vol_id  = d.get("volunteer_id")
        vol_doc = db.collection("volunteers").document(vol_id).get()
 
        if vol_doc.exists:
            vol = vol_doc.to_dict()
            d["volunteer_name"]  = vol.get("name", "Volunteer")
            d["volunteer_photo"] = vol.get("photo_url") or vol.get("avatar_url", "")
            d["skills"]          = vol.get("skills", [])
            d["distance"]        = (
                f"{d.get('distance_km', '?')} km away"
                if d.get("distance_km") is not None
                else "Nearby"
            )
            d["volunteer_was_online"] = d.get("volunteer_was_online", True)
        else:
            d["volunteer_name"]  = "Volunteer"
            d["volunteer_photo"] = ""
            d["skills"]          = []
            d["distance"]        = "Nearby"
 
        # ── AI reasoning fields ──────────────────────────────
        d.setdefault("match_confidence", "MEDIUM")
        d.setdefault("match_reason",     "")
        d.setdefault("match_strengths",  [])
        d.setdefault("match_concerns",   [])
 
        matches.append(d)
 
    return matches


def update_match_status(match_id, status):
    db.collection("matches").document(match_id).update({
        "status":       status,
        "responded_at": firestore.SERVER_TIMESTAMP
    })

    # If accepted, update the corresponding need status too
    if status == "accepted":
        match_doc = db.collection("matches").document(match_id).get()
        if match_doc.exists:
            match = match_doc.to_dict()
            need_id  = match.get("need_id")
            vol_id   = match.get("volunteer_id")
            if need_id:
                db.collection("needs").document(need_id).update({
                    "status":                  "assigned",
                    "assigned_volunteer_id":   vol_id,
                    "updated_at":              firestore.SERVER_TIMESTAMP
                })


# ══════════════════════════════════════════════
# ACTIVITY FEED
# ══════════════════════════════════════════════

def get_activity_for_ngo(ngo_id, limit=5):
    """
    Reads from a dedicated 'activity' subcollection on the NGO document.
    Each activity has: type, title, subtitle, created_at
    """
    docs = (
        db.collection("ngos")
          .document(ngo_id)
          .collection("activity")
          .order_by("created_at", direction=firestore.Query.DESCENDING)
          .limit(limit)
          .stream()
    )

    activities = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        activities.append(d)

    return activities


def log_activity(ngo_id, activity_type, title, subtitle=""):
    """
    Call this whenever something notable happens:
    create need, approve match, task completed, etc.
    """
    db.collection("ngos") \
      .document(ngo_id) \
      .collection("activity") \
      .add({
          "type":       activity_type,   # "completed"|"matched"|"created"|"warning"
          "title":      title,
          "subtitle":   subtitle,
          "created_at": firestore.SERVER_TIMESTAMP
      })


# ══════════════════════════════════════════════
# REPORTS
# ══════════════════════════════════════════════

def save_report(ngo_id, image_url, file_id):
    ref = db.collection("reports").add({
        "ngo_id":     ngo_id,
        "image_url":  image_url,
        "file_id":    file_id,
        "processed":  False,
        "uploaded_at": firestore.SERVER_TIMESTAMP
    })
    return ref[1].id


def save_extracted_needs_draft(ngo_id, report_id, needs):
    """
    Save AI-extracted needs as drafts pending NGO review.

    Location strings extracted by Gemini (e.g. "vidyasagapur durga mandir,
    kharagpur") are forward-geocoded via OlaMaps so they are stored as
    structured objects  { city, lat, lng }  — exactly the same format used
    when an NGO pins a location manually on the map.

    If geocoding fails (API error, no results, key missing) the raw text is
    preserved as the `city` field and lat/lng are set to None, so the need
    still saves and the NGO can edit the location on the review screen.
    """
    from services.geocoding_service import geocode_location_safe   # lazy import

    batch = db.batch()
    for need in needs:
        raw_location = need.get("location", "")

        # ── Geocode the plain-text location ──────────────────────────
        if raw_location and isinstance(raw_location, str) and raw_location.strip():
            # Forward-geocode: "vidyasagapur durga mandir, kharagpur"
            #                → { city: "Kharagpur", lat: 22.368, lng: 87.249 }
            structured_location = geocode_location_safe(raw_location)
        elif isinstance(raw_location, dict):
            # Gemini returned a dict already (shouldn't happen, but be safe)
            structured_location = raw_location
        else:
            structured_location = {"city": "", "lat": None, "lng": None}

        ref = db.collection("needs").document()
        batch.set(ref, {
            "ngo_id":              ngo_id,
            "report_id":           report_id,
            "title":               need.get("title", ""),
            "description":         need.get("description", ""),
            "category":            need.get("category", "OTHER"),
            "urgency_score":       need.get("urgency_score", 5),
            "urgency_label":       need.get("urgency_label", "MEDIUM"),
            "urgency_inferred":    need.get("urgency_inferred", True),
            "urgency_reason":      need.get("urgency_reason", ""),
            "required_skills":     need.get("required_skills", []),
            "location":            structured_location,   # ← { city, lat, lng }
            "beneficiaries":       need.get("beneficiaries", ""),
            "deadline_suggestion": need.get("deadline_suggestion", "planned"),
            "estimated_people":    need.get("estimated_people"),
            "status":              "draft",               # pending NGO confirmation
            "source":              "ai_extracted",
            "created_at":          firestore.SERVER_TIMESTAMP,
        })
    batch.commit()


def get_reports_by_uid(uid):
    docs = (
        db.collection("reports")
          .where("ngo_id", "==", uid)
          .order_by("uploaded_at", direction=firestore.Query.DESCENDING)
          .limit(50)
          .stream()
    )
    return docs

def get_report_by_report_id(report_id):
    doc = db.collection("reports").document(report_id).get()
    return doc


def get_draft_needs_for_report(report_id):
    needs_docs = (
        db.collection("needs")
          .where("report_id", "==", report_id)
          .where("status",    "==", "draft")
          .stream()
    )
    return needs_docs

def get_needs_for_report(report_id):
    needs_docs = (
        db.collection("needs")
          .where("report_id", "==", report_id)
          .stream()
    )
    return needs_docs


def create_report_doc_ref(uid,data):
    ref=db.collection("reports").add({
        "ngo_id":      uid,
        "image_url":   data["image_url"],
        "thumb_url":   data["thumb_url"],
        "file_id":     data["file_id"],
        "file_name":   data["file_name"],
        "file_size":   data["file_size"],
        "file_type":   data["file_type"],
        "processed":   False,
        "status":      "processing",
        "needs_count": 0,
        "uploaded_at": firestore.SERVER_TIMESTAMP,
    })
    return ref

def update_report_status(report_id,update):
    db.collection("reports").document(report_id).update(update)


def update_need(need_id,update):
    db.collection("needs").document(need_id).update(update)


# ══════════════════════════════════════════════
# VOLUNTEER PROFILE
# ══════════════════════════════════════════════

def get_volunteer_profile(uid):
    doc = db.collection("volunteers").document(uid).get()
    return doc.to_dict() if doc.exists else {}


def update_volunteer_online(uid, online):
    db.collection("volunteers").document(uid).update({
        "online":     online,
        "updated_at": firestore.SERVER_TIMESTAMP
    })

    # When a volunteer comes online, notify them of queued matches
    if online:
        _notify_queued_matches(db, uid)


def _notify_queued_matches(db, vol_id: str):
    """
    When a volunteer comes online, find any suggested matches that were
    created while they were offline and flip notify_immediately = True.
    """
    pending = (
        db.collection("matches")
          .where("volunteer_id",    "==", vol_id)
          .where("status",          "==", "suggested")
          .where("notify_immediately", "==", False)
          .stream()
    )
    batch = db.batch()
    for doc in pending:
        batch.update(doc.reference, {
            "notify_immediately":  True,
            "notified_at":         firestore.SERVER_TIMESTAMP,
        })
    batch.commit()


# ══════════════════════════════════════════════
# MATCHES FOR VOLUNTEER
# ══════════════════════════════════════════════

def get_matches_for_volunteer(vol_id, limit=20):
    docs = (
        db.collection("matches")
          .where("volunteer_id", "==", vol_id)
          .order_by("created_at", direction=firestore.Query.DESCENDING)
          .limit(limit)
          .stream()
    )
    result = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        result.append(d)
    return result


def enrich_tasks_with_needs(matches, vol_uid):
    """
    Given a list of match dicts, fetch the corresponding need document
    and merge fields useful for the dashboard.
    """
    if not matches:
        return []

    vol_doc = db.collection("volunteers").document(vol_uid).get()
    vol     = vol_doc.to_dict() if vol_doc.exists else {}
    vol_loc = vol.get("location", {})
    vol_lat = vol_loc.get("lat")
    vol_lng = vol_loc.get("lng")

    enriched = []
    for match in matches:
        need_id = match.get("need_id")
        if not need_id:
            continue

        need_doc = db.collection("needs").document(need_id).get()
        if not need_doc.exists:
            continue

        need = need_doc.to_dict()
        need["id"] = need_doc.id

        ngo_id  = need.get("ngo_id", "")
        ngo_doc = db.collection("ngos").document(ngo_id).get()
        ngo_name = ngo_doc.to_dict().get("org_name", "NGO") if ngo_doc.exists else "NGO"

        distance_km = None
        need_loc = need.get("location", {})
        # location is now always a dict; handle legacy string gracefully
        if isinstance(need_loc, str):
            need_loc = {"city": need_loc, "lat": None, "lng": None}
        if vol_lat and vol_lng and need_loc.get("lat") and need_loc.get("lng"):
            distance_km = round(
                haversine(vol_lat, vol_lng, need_loc["lat"], need_loc["lng"]),
                1
            )

        deadline = need.get("deadline")
        deadline_text = ""
        if deadline:
            try:
                from datetime import datetime, timezone
                if hasattr(deadline, "timestamp"):
                    dt = datetime.fromtimestamp(deadline.timestamp(), tz=timezone.utc)
                else:
                    dt = datetime.fromisoformat(str(deadline))
                days_left = (dt - datetime.now(tz=timezone.utc)).days
                deadline_text = (
                    f"Due in {days_left} day{'s' if days_left != 1 else ''}"
                    if days_left > 0
                    else "Due today"
                )
            except Exception:
                pass

        status   = match.get("status", need.get("status", "open"))
        progress = {"suggested": 10, "accepted": 30, "in_progress": 60,
                    "completed": 100}.get(status, 10)

        enriched.append({
            "id":             match["id"],
            "need_id":        need_id,
            "title":          need.get("title", ""),
            "description":    need.get("description", ""),
            "category":       need.get("category", ""),
            "urgency_label":  need.get("urgency_label", "MEDIUM"),
            "urgency_score":  need.get("urgency_score", 5),
            "required_skills":need.get("required_skills", []),
            "location":       need_loc.get("city") or need.get("location", ""),
            "lat":            need_loc.get("lat"),
            "lng":            need_loc.get("lng"),
            "ngo_name":       ngo_name,
            "distance_km":    distance_km,
            "status":         status,
            "deadline_text":  deadline_text,
            "progress_pct":   progress,
            "phase":          "Setup Phase" if progress < 50 else "In Progress",
            "created_at":     need.get("created_at"),
        })

    return enriched


# ══════════════════════════════════════════════
# VOLUNTEER TASK ACTIONS
# ══════════════════════════════════════════════

def volunteer_respond_to_match(match_id, vol_id, response):
    """response: "accepted" | "declined" """
    db.collection("matches").document(match_id).update({
        "status":       response,
        "responded_at": firestore.SERVER_TIMESTAMP
    })

    if response == "accepted":
        match_doc = db.collection("matches").document(match_id).get()
        if match_doc.exists:
            match = match_doc.to_dict()
            need_id = match.get("need_id")
            ngo_id  = match.get("ngo_id")
            if need_id:
                db.collection("needs").document(need_id).update({
                    "status":                 "assigned",
                    "assigned_volunteer_id":  vol_id,
                    "updated_at":             firestore.SERVER_TIMESTAMP
                })
            if ngo_id:
                need_doc = db.collection("needs").document(need_id).get()
                need_title = need_doc.to_dict().get("title", "a need") if need_doc.exists else "a need"
                vol_doc    = db.collection("volunteers").document(vol_id).get()
                vol_name   = vol_doc.to_dict().get("name", "A volunteer") if vol_doc.exists else "A volunteer"
                log_activity(
                    ngo_id,
                    "matched",
                    f"{vol_name} accepted task",
                    f'For need: "{need_title}"'
                )

    elif response == "declined":
        pass


def volunteer_complete_task(match_id, vol_id, proof_url=None):
    """Mark a task as completed by the volunteer."""
    update_data = {
        "status":       "completed",
        "completed_at": firestore.SERVER_TIMESTAMP
    }
    if proof_url:
        update_data["proof_url"] = proof_url

    db.collection("matches").document(match_id).update(update_data)

    match_doc = db.collection("matches").document(match_id).get()
    if match_doc.exists:
        match   = match_doc.to_dict()
        need_id = match.get("need_id")
        ngo_id  = match.get("ngo_id")

        if need_id:
            db.collection("needs").document(need_id).update({
                "status":     "completed",
                "updated_at": firestore.SERVER_TIMESTAMP
            })

        db.collection("volunteers").document(vol_id).update({
            "totalTasks": firestore.Increment(1),
            "updated_at": firestore.SERVER_TIMESTAMP
        })

        if ngo_id:
            need_doc   = db.collection("needs").document(need_id).get()
            need_title = need_doc.to_dict().get("title", "a need") if need_doc.exists else "a need"
            vol_doc    = db.collection("volunteers").document(vol_id).get()
            vol_name   = vol_doc.to_dict().get("name", "A volunteer") if vol_doc.exists else "A volunteer"
            log_activity(
                ngo_id,
                "completed",
                f'"{need_title}" completed',
                f"Verified by {vol_name}"
            )


# ══════════════════════════════════════════════
# HAVERSINE
# ══════════════════════════════════════════════

def haversine(lat1, lon1, lat2, lon2):
    """Distance between two lat/lng points in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))