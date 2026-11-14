"""Shared validation and atomic case creation for complete and resumable uploads."""
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Literal
from fastapi import HTTPException
from pydantic import Field, model_validator
from .schemas import Input
from .db import now, uid, encode
from .security import case_access


class Submission(Input):
    title: str = Field(min_length=5, max_length=160)
    location: str = Field(default="", max_length=200)
    consent: bool
    test_recording: bool = False
    category: Literal["interaction", "traffic", "payment", "coercion", "officer_safety", "violence", "weapon", "gesture", "procedure"] = "interaction"
    captured_at: str = Field(default="", max_length=60)
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    parent_case_id: str = Field(default="", max_length=80)

    @model_validator(mode="after")
    def check(self):
        if not self.consent:
            raise ValueError("Confirm consent and authorization before submitting evidence.")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Provide both location coordinates, or neither.")
        if self.captured_at:
            parsed = datetime.fromisoformat(self.captured_at.replace("Z", "+00:00"))
            if parsed.tzinfo is None or parsed > datetime.now(timezone.utc) + timedelta(minutes=5):
                raise ValueError("Capture time must include a timezone and cannot be in the future.")
        return self


def validate_container(data, extension):
    if extension not in (".mp4", ".webm") or len(data) < 16 or not (
        extension == ".mp4" and data[4:8] == b"ftyp" or extension == ".webm" and data[:4] == b"\x1aE\xdf\xa3"
    ):
        raise HTTPException(415, "File contents do not match a supported MP4 or WebM video container.")


def submission_owner(con, actor, metadata):
    if metadata.parent_case_id:
        parent = case_access(con, actor, metadata.parent_case_id)
        if parent["status"] != "evidence_requested":
            raise HTTPException(409, "Additional evidence must be requested on this case before linking a recording.")
        return parent["owner_id"]
    return actor["id"]


def accept_submission(con, db, storage, actor, metadata, data, extension, force_test=False):
    validate_container(data, extension)
    owner_id = submission_owner(con, actor, metadata)
    digest = hashlib.sha256(data).hexdigest()
    from .test_videos import known_test_digest
    is_test = force_test or metadata.test_recording or known_test_digest(digest)

    def link_recording(child_id):
        if not metadata.parent_case_id:
            return
        if child_id == metadata.parent_case_id:
            raise HTTPException(409, "This is the original recording. Submit a different recording as additional evidence.")
        added = con.execute("INSERT OR IGNORE INTO case_links VALUES (?,?,?,?)", (metadata.parent_case_id, child_id, actor["id"], now())).rowcount
        if added:
            con.execute("UPDATE cases SET version=version+1,updated_at=? WHERE id=?", (now(), metadata.parent_case_id))
            db.audit(con, actor["id"], "evidence.supplement_received", metadata.parent_case_id, {"related_case_id": child_id})

    existing = con.execute("SELECT id FROM cases WHERE owner_id=? AND sha256=?", (owner_id, digest)).fetchone()
    if existing:
        link_recording(existing[0])
        db.audit(con, actor["id"], "upload.duplicate", existing[0])
        return {"id": existing[0], "duplicate": True}
    case_id = "SA-" + datetime.now(timezone.utc).strftime("%y") + "-" + secrets.token_hex(4).upper()
    stamp = now()
    stages = [{"name": "Upload received", "status": "completed", "at": stamp, "detail": "Encrypted source received. Consent declared by uploader."}]
    con.execute("INSERT INTO cases(id,title,owner_id,location,latitude,longitude,category,created_at,captured_at,updated_at,sha256,stages) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (case_id, metadata.title, owner_id, metadata.location, metadata.latitude, metadata.longitude, metadata.category, stamp, metadata.captured_at or None, stamp, digest, encode(stages)))
    con.execute('UPDATE cases SET test_recording=? WHERE id=?',(int(is_test),case_id))
    link_recording(case_id)
    storage.put(con, case_id, "original", data, "video/mp4" if extension == ".mp4" else "video/webm", "upload")
    con.execute("INSERT INTO jobs(id,case_id,created_at,updated_at) VALUES (?,?,?,?)", (uid("job_"), case_id, stamp, stamp))
    db.audit(con, actor["id"], "upload.received", case_id, {"bytes": len(data), "consent": True, "test_recording": bool(is_test)})
    return {"id": case_id, "duplicate": False}
