import hashlib
import secrets
import base64
import hmac
from datetime import datetime, timezone
from fastapi import HTTPException, Request

ROLES = {"citizen", "officer", "supervisor", "responder", "admin"}
REVIEWERS = {"supervisor", "admin"}
RESPONDERS = {"responder", "supervisor", "admin"}


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password, stored):
    try:
        _, salt, digest = stored.split("$")
        actual = hashlib.scrypt(password.encode(), salt=base64.b64decode(salt), n=16384, r=8, p=1)
        return hmac.compare_digest(actual, base64.b64decode(digest))
    except (ValueError, TypeError):
        return False


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def user(request: Request):
    token = request.cookies.get("sentinel_session", "")
    with request.app.state.db.connect() as con:
        row = con.execute("SELECT u.*,s.csrf,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.active=1", (token_hash(token),)).fetchone()
    if not row or datetime.fromisoformat(row["expires_at"]) <= datetime.now(timezone.utc):
        raise HTTPException(401, "Your session has ended. Sign in to continue.")
    if row["demo"] and not request.app.state.config.demo:
        raise HTTPException(403, "Demonstration accounts are disabled.")
    if request.method not in ("GET", "HEAD", "OPTIONS") and not hmac.compare_digest(request.headers.get("x-csrf-token", ""), row["csrf"]):
        raise HTTPException(403, "Session verification failed. Refresh the page and try again.")
    return dict(row)


def require(actor, roles):
    if actor["role"] not in roles:
        raise HTTPException(403, "Your role does not permit this action.")


def scope(actor, alias="c"):
    if actor["role"] in REVIEWERS:
        return "1=1", []
    if actor["role"] == "responder":
        return f"EXISTS(SELECT 1 FROM alerts a WHERE a.case_id={alias}.id)", []
    return f"{alias}.owner_id=?", [actor["id"]]


def case_access(con, actor, case_id):
    clause, params = scope(actor)
    row = con.execute(f"SELECT c.* FROM cases c WHERE c.id=? AND {clause}", [case_id, *params]).fetchone()
    if not row:
        raise HTTPException(404, "Case not found or access has not been granted.")
    return dict(row)


def public_user(row):
    return {k: row[k] for k in ("id", "name", "email", "role", "active", "demo")}
