import base64
import hashlib
import hmac
import json
import os
from datetime import UTC, datetime, timedelta
from typing import Any

try:  # pragma: no cover - preferred production path
    from jose import JWTError, jwt
except ModuleNotFoundError:  # pragma: no cover - exercised only in minimal local environments
    class JWTError(Exception):
        pass

    class _JWTShim:
        @staticmethod
        def _b64(data: bytes) -> str:
            return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

        @staticmethod
        def _unb64(data: str) -> bytes:
            padding = "=" * (-len(data) % 4)
            return base64.urlsafe_b64decode(data + padding)

        def encode(self, payload: dict[str, Any], key: str, algorithm: str = "HS256") -> str:
            if algorithm != "HS256":
                raise JWTError("Only HS256 is supported by the stdlib fallback")
            normalized = dict(payload)
            if isinstance(normalized.get("exp"), datetime):
                normalized["exp"] = int(normalized["exp"].timestamp())
            header = {"alg": algorithm, "typ": "JWT"}
            signing_input = f"{self._b64(json.dumps(header, separators=(',', ':')).encode())}.{self._b64(json.dumps(normalized, separators=(',', ':')).encode())}"
            signature = hmac.new(key.encode(), signing_input.encode(), hashlib.sha256).digest()
            return f"{signing_input}.{self._b64(signature)}"

        def decode(self, token: str, key: str, algorithms: list[str]) -> dict[str, Any]:
            if "HS256" not in algorithms:
                raise JWTError("Unsupported algorithm")
            try:
                header_b64, payload_b64, sig_b64 = token.split(".")
            except ValueError as exc:
                raise JWTError("Malformed token") from exc
            signing_input = f"{header_b64}.{payload_b64}"
            expected = self._b64(hmac.new(key.encode(), signing_input.encode(), hashlib.sha256).digest())
            if not hmac.compare_digest(expected, sig_b64):
                raise JWTError("Invalid signature")
            payload = json.loads(self._unb64(payload_b64))
            if payload.get("exp") and int(payload["exp"]) < int(utcnow().timestamp()):
                raise JWTError("Expired token")
            return payload

    jwt = _JWTShim()

try:  # pragma: no cover - preferred production path
    from passlib.context import CryptContext
except ModuleNotFoundError:  # pragma: no cover
    CryptContext = None

from app.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") if CryptContext else None


def utcnow() -> datetime:
    return datetime.now(UTC)


def hash_password(password: str) -> str:
    if pwd_context:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass
    return _hash_password_pbkdf2(password)


def _hash_password_pbkdf2(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 260_000)
    return "pbkdf2_sha256$260000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(plain_password: str, password_hash: str) -> bool:
    if pwd_context and not password_hash.startswith("pbkdf2_sha256$"):
        try:
            return pwd_context.verify(plain_password, password_hash)
        except Exception:
            return False
    try:
        _, rounds, salt_b64, digest_b64 = password_hash.split("$", 3)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", plain_password.encode(), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def create_token(subject: str, token_type: str, expires_delta: timedelta, extra: dict[str, Any] | None = None) -> str:
    expire = utcnow() + expires_delta
    payload: dict[str, Any] = {"sub": subject, "type": token_type, "exp": expire}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str, role: str) -> str:
    return create_token(
        subject,
        "access",
        timedelta(minutes=settings.access_token_expire_minutes),
        {"role": role},
    )


def create_refresh_token(subject: str) -> str:
    return create_token(subject, "refresh", timedelta(days=settings.refresh_token_expire_days))


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
