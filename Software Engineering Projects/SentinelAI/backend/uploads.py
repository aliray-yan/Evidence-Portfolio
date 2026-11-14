"""Bounded, encrypted, resumable transfers; case creation happens only at completion."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Literal
from cryptography.fernet import InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import Field
from .db import now, uid, encode
from .schemas import Input
from .security import user, require, case_access
from .submission import Submission, accept_submission, submission_owner, validate_container

router = APIRouter(prefix="/api/uploads")
CHUNK_SIZE = 1024 * 1024
UPLOAD_ROLES = {"citizen", "officer", "supervisor", "admin"}


class UploadStart(Input):
    metadata: Submission
    extension: Literal[".mp4", ".webm"]
    size: int = Field(ge=16, le=100 * 1024**2, strict=True)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


def sweep_expired(db):
    with db.transaction() as con:
        rows = con.execute("SELECT id,state FROM upload_sessions WHERE expires_at<=?", (now(),)).fetchall()
        for row in rows:
            con.execute("DELETE FROM upload_sessions WHERE id=?", (row["id"],))
            db.audit(con, None, "upload_session.expired", row["id"], {"state": row["state"]})
    return len(rows)


def owned(con, actor, upload_id):
    require(actor, UPLOAD_ROLES)
    row = con.execute("SELECT * FROM upload_sessions WHERE id=? AND actor_id=?", (upload_id, actor["id"])).fetchone()
    if not row:
        raise HTTPException(404, "Upload session is unavailable. Select the file and submit again.")
    if row["expires_at"] <= now():
        raise HTTPException(410, "This upload expired after 24 hours. Submit the file again.")
    if row["case_id"]:
        case_access(con, actor, row["case_id"])
    return row


def snapshot(row):
    return {key: row[key] for key in ("id", "total", "received", "state", "case_id", "duplicate", "expires_at")} | {"chunk_size": CHUNK_SIZE}


@router.post("")
def start(body: UploadStart, request: Request, actor=Depends(user)):
    require(actor, UPLOAD_ROLES)
    db = request.app.state.db
    if body.size > request.app.state.config.max_upload:
        raise HTTPException(413, "Video exceeds this server's upload limit.")
    sweep_expired(db)
    fingerprint = hashlib.sha256(encode(body.model_dump()).encode()).hexdigest()
    with db.transaction() as con:
        existing = con.execute("SELECT id FROM upload_sessions WHERE actor_id=? AND fingerprint=?", (actor["id"], fingerprint)).fetchone()
        if existing:
            row = owned(con, actor, existing["id"])
            db.audit(con, actor["id"], "upload_session.resumed", row["id"])
            return snapshot(row)
        submission_owner(con, actor, body.metadata)
        count = con.execute("SELECT COUNT(*) FROM upload_sessions WHERE actor_id=? AND state='open'", (actor["id"],)).fetchone()[0]
        reserved = con.execute("SELECT COALESCE(SUM(total),0) FROM upload_sessions WHERE state='open'").fetchone()[0]
        if count >= 3 or reserved + body.size > 500 * 1024**2:
            raise HTTPException(429, "Pending upload capacity reached. Finish or discard an earlier transfer, or retry after its 24-hour expiry.")
        ident = uid("up_")
        expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        con.execute("INSERT INTO upload_sessions(id,actor_id,fingerprint,metadata,extension,sha256,total,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?)",
                    (ident, actor["id"], fingerprint, encode(body.metadata.model_dump()), body.extension, body.sha256, body.size, now(), expires))
        db.audit(con, actor["id"], "upload_session.created", ident, {"bytes": body.size})
        return snapshot(owned(con, actor, ident))


@router.get("/{upload_id}")
def status(upload_id: str, request: Request, actor=Depends(user)):
    with request.app.state.db.transaction() as con:
        row = owned(con, actor, upload_id)
        request.app.state.db.audit(con, actor["id"], "upload_session.view", upload_id)
        return snapshot(row)


@router.put("/{upload_id}")
async def chunk(upload_id: str, request: Request, offset: int = Query(ge=0), actor=Depends(user)):
    db, storage = request.app.state.db, request.app.state.storage
    with db.connect() as con:
        owned(con, actor, upload_id)
    data = bytearray()
    async for part in request.stream():
        if len(data) + len(part) > CHUNK_SIZE:
            raise HTTPException(413, "Upload part exceeds 1 MB.")
        data.extend(part)
    data = bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    with db.transaction() as con:
        row = owned(con, actor, upload_id)
        if row["state"] != "open":
            raise HTTPException(409, "This transfer has already completed.")
        previous = con.execute("SELECT sha256 FROM upload_chunks WHERE upload_id=? AND offset=?", (upload_id, offset)).fetchone()
        if previous:
            if previous["sha256"] != digest:
                raise HTTPException(409, "This part differs from the data already received. Select the original file.")
            return snapshot(row)
        if offset != row["received"] or len(data) != min(CHUNK_SIZE, row["total"] - offset) or not data:
            raise HTTPException(409, "Upload position or part size differs from the server. Resume to synchronize.")
        if offset == 0:
            validate_container(data, row["extension"])
        con.execute("INSERT INTO upload_chunks VALUES (?,?,?,?,?)", (upload_id, offset, len(data), digest, storage.cipher.encrypt(data)))
        con.execute("UPDATE upload_sessions SET received=received+? WHERE id=?", (len(data), upload_id))
        db.audit(con, actor["id"], "upload_session.part_received", upload_id, {"offset": offset, "bytes": len(data)})
        return snapshot(owned(con, actor, upload_id))


@router.post("/{upload_id}/complete")
def complete(upload_id: str, request: Request, actor=Depends(user)):
    db, storage = request.app.state.db, request.app.state.storage
    with db.transaction() as con:
        row = owned(con, actor, upload_id)
        if row["state"] == "completed":
            return {"id": row["case_id"], "duplicate": bool(row["duplicate"])}
        if row["received"] != row["total"]:
            raise HTTPException(409, "Some video data is still missing. Resume the upload first.")
        try:
            data = b"".join(storage.cipher.decrypt(r["ciphertext"]) for r in con.execute("SELECT ciphertext FROM upload_chunks WHERE upload_id=? ORDER BY offset", (upload_id,)))
        except InvalidToken:
            raise HTTPException(409, "Stored upload data failed its integrity check. Discard this transfer and submit again.")
        if len(data) != row["total"] or hashlib.sha256(data).hexdigest() != row["sha256"]:
            raise HTTPException(409, "The recording checksum does not match. Discard this transfer and select the original file again.")
        result = accept_submission(con, db, storage, actor, Submission(**json.loads(row["metadata"])), data, row["extension"], force_test=request.app.state.config.test_uploads)
        con.execute("UPDATE upload_sessions SET state='completed',case_id=?,duplicate=?,metadata='{}' WHERE id=?", (result["id"], int(result["duplicate"]), upload_id))
        con.execute("DELETE FROM upload_chunks WHERE upload_id=?", (upload_id,))
        db.audit(con, actor["id"], "upload_session.completed", upload_id, {"case_id": result["id"]})
    request.app.state.processor.wake_event.set()
    return result


@router.delete("/{upload_id}")
def discard(upload_id: str, request: Request, actor=Depends(user)):
    db = request.app.state.db
    with db.transaction() as con:
        row = owned(con, actor, upload_id)
        if row["state"] == "completed":
            raise HTTPException(409, "This transfer already created a case. Open that case to continue.")
        con.execute("DELETE FROM upload_sessions WHERE id=?", (upload_id,))
        db.audit(con, actor["id"], "upload_session.discarded", upload_id)
    return {"ok": True}
