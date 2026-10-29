from dataclasses import dataclass
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Config:
    data_dir: Path
    demo: bool = True
    secure_cookie: bool = False
    workers: bool = True
    max_upload: int = 100 * 1024 * 1024
    max_duration: int = 120
    whisper_model: str = ""
    encryption_key: str = ""
    allowed_hosts: tuple = ("localhost", "127.0.0.1", "testserver")

    @classmethod
    def from_env(cls):
        return cls(
            Path(os.getenv("SENTINEL_DATA_DIR", str(ROOT / ".local" / "data"))),
            demo=os.getenv("SENTINEL_DEMO", "1") == "1",
            secure_cookie=os.getenv("SENTINEL_SECURE_COOKIE", "0") == "1",
            workers=os.getenv("SENTINEL_WORKERS", "1") == "1",
            whisper_model=os.getenv("SENTINEL_WHISPER_MODEL", ""),
            encryption_key=os.getenv("SENTINEL_ENCRYPTION_KEY", ""),
            allowed_hosts=tuple(os.getenv("SENTINEL_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")),
        )
