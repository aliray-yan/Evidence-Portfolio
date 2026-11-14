"""Encrypted, consistent local snapshots. Restore only into a new directory."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import sqlite3
import tempfile
import zipfile
from contextlib import closing
from cryptography.fernet import Fernet
from .config import Config
from .db import Database, encode, now
from .storage import Storage

MAX_BYTES = 512 * 1024 * 1024


def backup(config, output):
    output = Path(output).resolve()
    if output.exists() or output.is_relative_to(config.data_dir.resolve()):
        raise ValueError('Use a new backup file outside the live data directory.')
    storage = Storage(config)
    db = Database(config.data_dir/'sentinel.db', storage.audit_key)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=config.data_dir, prefix='backup-') as tmp:
        snapshot = Path(tmp)/'sentinel.db'
        # Freeze writes while the database snapshot and referenced encrypted media
        # are captured. A separate reader performs SQLite's online backup.
        with db.transaction() as lock:
            if not db.verify_audit(lock)['valid']:
                raise ValueError('Audit integrity failed; investigate before creating a backup.')
            with closing(sqlite3.connect(db.path)) as source, closing(sqlite3.connect(snapshot)) as target:
                source.backup(target)
            files = {'sentinel.db':snapshot.read_bytes()}
            total = len(files['sentinel.db'])
            for row in lock.execute('SELECT storage_name FROM evidence WHERE storage_name IS NOT NULL'):
                path = storage.path(row['storage_name'])
                total += path.stat().st_size
                if total > MAX_BYTES:
                    raise ValueError('This local backup tool supports at most 512 MiB of snapshot data. Use an encrypted host backup for larger stores.')
                files['media/'+path.name] = path.read_bytes()
            if total > MAX_BYTES:
                raise ValueError('Backup exceeds the 512 MiB bound.')
            manifest = {'schema':1,'created_at':now(),'files':{name:{'sha256':hashlib.sha256(data).hexdigest(),'size':len(data)} for name,data in files.items()},
                        'key_included':False,'note':'Preserve the media encryption key separately. Restore revokes all sessions.'}
            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer,'w',compression=zipfile.ZIP_STORED) as archive:
                archive.writestr('manifest.json', encode(manifest))
                for name,data in files.items():
                    archive.writestr(name,data)
            encrypted = storage.cipher.encrypt(buffer.getvalue())
            with output.open('xb') as handle:
                handle.write(encrypted)
            db.audit(lock,None,'backup.created','backup',{'bytes':len(encrypted),'files':len(files),'snapshot_at':manifest['created_at']})
    return {'file':str(output),'bytes':len(encrypted),'files':len(files),'key_included':False}


def restore(archive_path, destination, key):
    destination, archive_path = Path(destination).resolve(), Path(archive_path).resolve()
    if destination.exists():
        raise ValueError('Restore destination must not exist. Existing evidence is never overwritten.')
    if archive_path.stat().st_size > MAX_BYTES*2:
        raise ValueError('Backup exceeds the supported size bound.')
    plain = Fernet(key).decrypt(archive_path.read_bytes())
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent,prefix='sentinel-restore-') as tmp:
        staging = Path(tmp)/'data'
        staging.mkdir()
        with zipfile.ZipFile(io.BytesIO(plain)) as archive:
            names = archive.namelist()
            if len(names) != len(set(names)) or 'manifest.json' not in names or any(not (n in ('manifest.json','sentinel.db') or re.fullmatch(r'media/[A-Za-z0-9]+',n)) for n in names):
                raise ValueError('Backup contains unsupported paths or duplicate entries.')
            if any(i.compress_type != zipfile.ZIP_STORED for i in archive.infolist()) or sum(i.file_size for i in archive.infolist()) > MAX_BYTES+5_000_000:
                raise ValueError('Unsupported compression or oversized backup.')
            manifest = json.loads(archive.read('manifest.json'))
            if manifest.get('schema') != 1 or set(names) != {'manifest.json', *manifest['files']} or 'sentinel.db' not in manifest['files']:
                raise ValueError('Invalid snapshot manifest.')
            for name,expected in manifest['files'].items():
                data=archive.read(name)
                if len(data)!=expected['size'] or hashlib.sha256(data).hexdigest()!=expected['sha256']:
                    raise ValueError('Backup file integrity mismatch.')
                path=staging/name
                path.parent.mkdir(exist_ok=True)
                path.write_bytes(data)
        # Keys are deliberately not embedded in backups. The supplied separate key
        # is placed in the new local installation only after authenticated decryption.
        (staging/'media.key').write_bytes(key)
        config=Config(staging,workers=False)
        storage=Storage(config)
        db=Database(staging/'sentinel.db',storage.audit_key)
        with db.transaction() as con:
            if con.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or not db.verify_audit(con)['valid']:
                raise ValueError('Restored database integrity failed.')
            expected_media={'media/'+r['storage_name'] for r in con.execute('SELECT storage_name FROM evidence WHERE storage_name IS NOT NULL')}
            if expected_media != {n for n in manifest['files'] if n.startswith('media/')}:
                raise ValueError('Media inventory differs from the restored database.')
            for row in con.execute('SELECT * FROM evidence'):
                payload=storage.read(row)
                if hashlib.sha256(payload).hexdigest()!=row['sha256']:
                    raise ValueError('Restored evidence content failed verification.')
            con.execute('DELETE FROM sessions')
            con.execute("UPDATE jobs SET status='queued' WHERE status='running'")
            db.audit(con,None,'backup.restored','backup',{'snapshot_at':manifest['created_at'],'sessions_revoked':True})
        with db.connect() as con:
            con.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        staging.rename(destination)
    return {'directory':str(destination),'sessions_revoked':True,'media_verified':len(expected_media)}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='action',required=True)
    create=sub.add_parser('create');create.add_argument('--output',required=True)
    recover=sub.add_parser('restore');recover.add_argument('--backup',required=True);recover.add_argument('--destination',required=True);recover.add_argument('--key-file',required=True)
    args=parser.parse_args()
    result=backup(Config.from_env(),args.output) if args.action=='create' else restore(args.backup,args.destination,Path(args.key_file).read_bytes().strip())
    print(json.dumps(result))


if __name__=='__main__':
    main()
