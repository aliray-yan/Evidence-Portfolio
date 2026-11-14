from dataclasses import dataclass, field
from pathlib import Path
import os
import json

ROOT = Path(__file__).resolve().parent.parent


def selected_ai_model(key):
    variable = "SENTINEL_" + key.upper()
    if variable in os.environ:
        return os.environ[variable]
    selection = ROOT / ".local/ai-selection.json"
    if not selection.exists():
        return ""
    item = json.loads(selection.read_text(encoding="utf-8")).get("models", {}).get(key)
    if not item:
        return ""
    path = (ROOT / item["path"]).resolve()
    if not path.is_relative_to((ROOT / ".local/models").resolve()):
        raise ValueError("AI model selection must remain within .local/models.")
    return str(path)


def selected_violence_model():
    # An explicit value (including empty to disable inference) always wins.
    if "SENTINEL_VIOLENCE_MODEL" in os.environ:
        return os.environ["SENTINEL_VIOLENCE_MODEL"]
    selection = ROOT / ".local/model-selection.json"
    if not selection.exists():
        return ""
    data = json.loads(selection.read_text(encoding="utf-8"))
    directory = (ROOT / data["directory"]).resolve()
    if not directory.is_relative_to((ROOT / ".local/models").resolve()):
        raise ValueError("Local model selection must point inside .local/models.")
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("sha256") != data.get("sha256") or manifest.get("version") != data.get("version"):
        raise ValueError("Local model selection no longer matches the installed bundle.")
    return str(directory)


@dataclass
class Config:
    data_dir: Path
    demo: bool = True
    secure_cookie: bool = False
    workers: bool = True
    max_upload: int = 100 * 1024 * 1024
    max_duration: int = 120
    whisper_model: str = ""
    violence_model: str = ""
    gesture_model: str = ""
    pose_model: str = ""
    face_model: str = ""
    object_model: str = ""
    exchange_model: str = ""
    learned_exchange_model: str = ""
    acoustic_model: str = ""
    diarization_model: str = ""
    retrieval_model: str = ""
    test_videos: bool = False
    test_uploads: bool = False
    streaming: bool = False
    notification_url: str = ""
    notification_secret: str = ""
    openrouter_key: str = field(default="", repr=False)
    openrouter_model: str = "nvidia/nemotron-3.5-lightning:free"
    openrouter_real_cases: bool = False
    encryption_key: str = ""
    allowed_hosts: tuple = ("localhost", "127.0.0.1", "testserver")

    @classmethod
    def from_env(cls):
        return cls(
            Path(os.getenv("SENTINEL_DATA_DIR", str(ROOT / ".local" / "data"))),
            demo=os.getenv("SENTINEL_DEMO", "1") == "1",
            secure_cookie=os.getenv("SENTINEL_SECURE_COOKIE", "0") == "1",
            workers=os.getenv("SENTINEL_WORKERS", "1") == "1",
            whisper_model="",  # Legacy configuration is never activated in the vision-only application.
            violence_model=selected_violence_model(),
            gesture_model=selected_ai_model("gesture_model"),
            pose_model=selected_ai_model("pose_model"),
            face_model=selected_ai_model("face_model"),
            object_model=selected_ai_model("object_model"),
            exchange_model=selected_ai_model("exchange_model"),
            learned_exchange_model=selected_ai_model("learned_exchange_model"),
            acoustic_model="",  # Legacy configuration is never activated in the vision-only application.
            diarization_model="",  # Legacy configuration is never activated in the vision-only application.
            retrieval_model=selected_ai_model("retrieval_model"),
            test_videos=os.getenv('SENTINEL_TEST_VIDEOS','0')=='1',
            test_uploads=os.getenv('SENTINEL_TEST_UPLOADS','0')=='1',
            streaming=os.getenv('SENTINEL_STREAMING','1')=='1',
            notification_url=os.getenv('SENTINEL_NOTIFICATION_URL',''),
            notification_secret=os.getenv('SENTINEL_NOTIFICATION_SECRET',''),
            openrouter_key=os.getenv('OPENROUTER_API_KEY', '').strip(),
            openrouter_model=os.getenv('SENTINEL_OPENROUTER_MODEL', 'nvidia/nemotron-3.5-lightning:free'),
            openrouter_real_cases=os.getenv('SENTINEL_OPENROUTER_REAL_CASES', '0') == '1',
            encryption_key=os.getenv("SENTINEL_ENCRYPTION_KEY", ""),
            allowed_hosts=tuple(os.getenv("SENTINEL_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")),
        )
