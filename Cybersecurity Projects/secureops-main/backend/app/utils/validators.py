import ipaddress
import re
from urllib.parse import urlparse


HASH_PATTERNS = {
    "hash_md5": re.compile(r"^[a-fA-F0-9]{32}$"),
    "hash_sha1": re.compile(r"^[a-fA-F0-9]{40}$"),
    "hash_sha256": re.compile(r"^[a-fA-F0-9]{64}$"),
}
DOMAIN_PATTERN = re.compile(r"^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CVE_PATTERN = re.compile(r"^CVE-\d{4}-\d{4,}$", re.IGNORECASE)


def detect_ioc_type(value: str) -> str:
    cleaned = value.strip()
    try:
        ipaddress.ip_address(cleaned)
        return "ip"
    except ValueError:
        pass

    parsed = urlparse(cleaned)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return "url"

    for ioc_type, pattern in HASH_PATTERNS.items():
        if pattern.match(cleaned):
            return ioc_type

    if EMAIL_PATTERN.match(cleaned):
        return "email"
    if CVE_PATTERN.match(cleaned):
        return "cve"
    if DOMAIN_PATTERN.match(cleaned):
        return "domain"
    return "unknown"


def extract_iocs(text: str) -> list[dict[str, str]]:
    candidates = set()
    candidates.update(re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", text))
    candidates.update(re.findall(r"https?://[^\s,;\"']+", text))
    candidates.update(re.findall(r"\b[a-fA-F0-9]{32,64}\b", text))
    candidates.update(re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text))
    candidates.update(re.findall(r"\bCVE-\d{4}-\d{4,}\b", text, flags=re.IGNORECASE))
    candidates.update(re.findall(r"\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b", text))

    iocs: list[dict[str, str]] = []
    seen: set[str] = set()
    for candidate in sorted(candidates):
        ioc_type = detect_ioc_type(candidate)
        if ioc_type != "unknown" and candidate not in seen:
            seen.add(candidate)
            iocs.append({"type": ioc_type, "value": candidate})
    return iocs
