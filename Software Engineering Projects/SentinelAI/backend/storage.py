from pathlib import Path
import os
import hashlib
from cryptography.fernet import Fernet
from .db import uid, now


class Storage:
    def __init__(self, config):
        config.data_dir.mkdir(parents=True, exist_ok=True)
        key_path = config.data_dir / "media.key"
        if config.encryption_key:
            key = config.encryption_key.encode()
        elif key_path.exists():
            key = key_path.read_bytes()
        elif config.demo:
            key = Fernet.generate_key()
            # Exclusive creation avoids accidentally overwriting the key.
            fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as handle:
                handle.write(key)
        else:
            raise RuntimeError("Set SENTINEL_ENCRYPTION_KEY for non-demo deployments.")
        self.cipher = Fernet(key)
        self.audit_key = hashlib.sha256(key + b"sentinel-audit-v1").digest()
        self.root = config.data_dir / "media"
        self.root.mkdir(exist_ok=True)

    def path(self, name):
        if not name or not name.isalnum():
            raise ValueError("Invalid storage identifier")
        return self.root / name

    def put(self, con, case_id, kind, data, mime, source, start=0, end=None):
        evidence_id, name = uid("ev_"), uid()
        self.path(name).write_bytes(self.cipher.encrypt(data))
        try:
            con.execute("INSERT INTO evidence VALUES (?,?,?,?,?,?,?,?,?,?,?)", (evidence_id, case_id, kind, name, mime, len(data), hashlib.sha256(data).hexdigest(), source, start, end, now()))
        except Exception:
            self.path(name).unlink(missing_ok=True)
            raise
        return evidence_id

    def read(self, record):
        return self.cipher.decrypt(self.path(record["storage_name"]).read_bytes())

    def delete(self, record):
        if record["storage_name"]:
            self.path(record["storage_name"]).unlink(missing_ok=True)
