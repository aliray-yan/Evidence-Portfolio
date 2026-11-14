"""Private LAN test setup. Does not install certificates, change firewalls or open ports."""
import argparse
from datetime import datetime, timedelta, timezone
import ipaddress
import json
import os
from pathlib import Path
import sys
from cryptography import x509
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from .config import ROOT


def private_ip(value):
    ip = ipaddress.ip_address(value)
    if not any(ip in ipaddress.ip_network(network) for network in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")):
        raise ValueError("Use this computer's private Wi-Fi IPv4 address (10.x, 172.16–31.x or 192.168.x).")
    return ip


def exclusive_write(path, content):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(content)


def prepare(directory, address):
    ip = private_ip(address)
    directory = Path(directory).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    if any(directory.iterdir()):
        raise ValueError("Setup folder must be empty. Existing keys, accounts and evidence are never overwritten.")
    stamp = datetime.now(timezone.utc)
    ca_key, server_key = rsa.generate_private_key(65537, 2048), rsa.generate_private_key(65537, 2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "SentinelAI temporary local test CA")])
    ca = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(ca_key.public_key())
          .serial_number(x509.random_serial_number()).not_valid_before(stamp-timedelta(minutes=5))
          .not_valid_after(stamp+timedelta(days=30))
          .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
          .add_extension(x509.KeyUsage(False, False, False, False, False, True, True, None, None), critical=True)
          .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False)
          .sign(ca_key, hashes.SHA256()))
    server = (x509.CertificateBuilder()
              .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "SentinelAI local test server")]))
              .issuer_name(name).public_key(server_key.public_key()).serial_number(x509.random_serial_number())
              .not_valid_before(stamp-timedelta(minutes=5)).not_valid_after(stamp+timedelta(days=14))
              .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
              .add_extension(x509.SubjectAlternativeName([x509.IPAddress(ip), x509.IPAddress(ipaddress.ip_address("127.0.0.1")), x509.DNSName("localhost")]), critical=False)
              .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
              .add_extension(x509.KeyUsage(True, False, True, False, False, False, False, None, None), critical=True)
              .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
              .sign(ca_key, hashes.SHA256()))
    exclusive_write(directory/"phone-trust.crt", ca.public_bytes(serialization.Encoding.PEM))
    exclusive_write(directory/"server.crt", server.public_bytes(serialization.Encoding.PEM))
    exclusive_write(directory/"server.key", server_key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    exclusive_write(directory/"encryption.key", Fernet.generate_key())
    exclusive_write(directory/"connection.json", json.dumps({"ip": str(ip), "expires": server.not_valid_after_utc.isoformat()}).encode())
    # The CA private key is deliberately not persisted. No arbitrary certificates
    # can later be issued from a stolen setup folder using that CA.
    return {"ip": str(ip), "fingerprint": ca.fingerprint(hashes.SHA256()).hex(), "directory": str(directory)}


def configure(directory):
    directory = Path(directory).resolve()
    data = json.loads((directory/"connection.json").read_text())
    ip = str(private_ip(data["ip"]))
    if datetime.fromisoformat(data["expires"]) <= datetime.now(timezone.utc):
        raise ValueError("Local test certificate expired. Create a new setup folder and remove the old CA trust; do not overwrite evidence.")
    os.environ.update({"SENTINEL_DATA_DIR": str(directory/"data"), "SENTINEL_DEMO": "0",
                       "SENTINEL_TEST_VIDEOS":"1", "SENTINEL_TEST_UPLOADS":"1", "SENTINEL_NOTIFICATION_URL":"", "SENTINEL_NOTIFICATION_SECRET":"", "OPENROUTER_API_KEY":"", "SENTINEL_OPENROUTER_REAL_CASES":"0",
                       "SENTINEL_SECURE_COOKIE": "1", "SENTINEL_ALLOWED_HOSTS": f"{ip},localhost,127.0.0.1",
                       "SENTINEL_ENCRYPTION_KEY": (directory/"encryption.key").read_text().strip()})
    return ip


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default=str(ROOT/".local"/"mobile-test"))
    commands = parser.add_subparsers(dest="command", required=True)
    setup = commands.add_parser("prepare")
    setup.add_argument("--ip", required=True)
    admin = commands.add_parser("create-admin")
    admin.add_argument("--email", required=True)
    admin.add_argument("--name", required=True)
    serve = commands.add_parser("serve")
    serve.add_argument("--port", type=int, default=8443)
    args = parser.parse_args()
    try:
        directory = Path(args.directory).resolve()
        if args.command == "prepare":
            result = prepare(directory, args.ip)
            print(json.dumps(result, indent=2))
            print("Setup prepared only. Follow docs/MOBILE_TEST.md to trust phone-trust.crt on your test devices. Never share server.key or encryption.key.")
        else:
            address = configure(directory)
            if args.command == "create-admin":
                from .manage import main as manage
                sys.argv = [sys.argv[0], "create-admin", "--email", args.email, "--name", args.name]
                manage()
            else:
                if not 1024 <= args.port <= 65535:
                    raise ValueError("Choose a port from 1024 to 65535.")
                if not (ROOT/"dist"/"index.html").exists():
                    raise ValueError("Build the frontend first with npm run build.")
                import uvicorn
                print(f"Open https://{address}:{args.port} on both devices. Password accounts only; no public tunnel or external dispatch.")
                uvicorn.run("backend.main:app", host=address, port=args.port,
                            ssl_certfile=str(directory/"server.crt"), ssl_keyfile=str(directory/"server.key"),
                            proxy_headers=False)
    except (ValueError, OSError, KeyError) as exc:
        parser.exit(1, f"Mobile setup failed: {exc}\n")


if __name__ == "__main__":
    main()
