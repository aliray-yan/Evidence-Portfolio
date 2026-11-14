"""Acquire the public CAP validation archive for a separate FYP experiment.

This is not a CAP challenge submission. Published negative-action intervals may
augment development data; the four locked stock controls never enter training.
Only the publisher's CC BY 4.0 archive is fetched. No downloaded code is run.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path, PurePosixPath
import tarfile
import time

import requests

from .exchange_sources import digest

URL = 'https://dl.dropboxusercontent.com/s/db11zv0gcycu384/cap_detection_handheld_val.tar.gz.72f58e69582c17dd366d3c7e85cf0da8'
SIZE = 901869561
MD5 = '72f58e69582c17dd366d3c7e85cf0da8'
BLOCK = 8 * 1024**2


def archive_download(root):
    archive = root / 'cap_detection_handheld_val.tar.gz'
    chunks = root / 'download-parts'
    chunks.mkdir(parents=True, exist_ok=True)

    def fetch(number):
        begin, end = number * BLOCK, min(SIZE, (number + 1) * BLOCK) - 1
        path = chunks / f'{number:04}.part'
        if path.exists() and path.stat().st_size == end - begin + 1:
            return path
        for attempt in range(3):
            try:
                with requests.get(URL, headers={'Range': f'bytes={begin}-{end}'}, stream=True,
                                  timeout=(20, 60)) as response:
                    response.raise_for_status()
                    if response.status_code != 206 or response.headers.get('Content-Range') != f'bytes {begin}-{end}/{SIZE}':
                        raise ValueError('CAP source did not honor the bounded request')
                    data = response.raw.read(end - begin + 2)
                    if len(data) != end - begin + 1:
                        raise ValueError('Incomplete CAP archive part')
                    path.write_bytes(data)
                    return path
            except requests.RequestException:
                if attempt == 2:
                    raise
                time.sleep(attempt + 1)

    count = (SIZE + BLOCK - 1) // BLOCK
    if not archive.exists():
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(fetch, number) for number in range(count)]
            for finished, future in enumerate(as_completed(futures), 1):
                future.result()
                if finished % 8 == 0 or finished == count:
                    print(json.dumps({'cap_parts': finished, 'total': count}), flush=True)
        temporary = archive.with_suffix('.assembling')
        with temporary.open('wb') as output:
            for number in range(count):
                with (chunks / f'{number:04}.part').open('rb') as source:
                    for part in iter(lambda: source.read(1024**2), b''):
                        output.write(part)
        temporary.replace(archive)
    md5 = hashlib.md5(usedforsecurity=False)
    with archive.open('rb') as stream:
        for part in iter(lambda: stream.read(1024**2), b''):
            md5.update(part)
    if archive.stat().st_size != SIZE or md5.hexdigest() != MD5:
        raise ValueError('CAP archive differs from the publisher checksum; no source is marked complete')
    return archive


def member_name(name):
    parts = PurePosixPath(name).parts
    if not parts or PurePosixPath(name).is_absolute() or '..' in parts or '\\' in name or ':' in name:
        raise ValueError('Unsafe CAP archive member')
    # Windows cannot store the question marks used by several published tasks.
    return hashlib.sha256(name.encode()).hexdigest()[:24] + PurePosixPath(name).suffix


def acquire(destination):
    root = destination.resolve()
    root.mkdir(parents=True, exist_ok=True)
    archive = archive_download(root)
    records = []
    with tarfile.open(archive, mode='r|gz') as content:
        for member in content:
            if member.isdir():
                continue
            name = member_name(member.name)
            if not member.isfile():
                raise ValueError('CAP archives must not contain links or devices')
            if '/annotations/' in member.name and member.name.endswith('.json'):
                kind, maximum = 'annotation', 4 * 1024**2
            elif '/videos/' in member.name and member.name.endswith('.mp4'):
                kind, maximum = 'video', 100 * 1024**2
            else:
                continue
            if not 0 < member.size <= maximum:
                raise ValueError('Unexpected CAP member size')
            path = root / name
            source = content.extractfile(member)
            if source is None:
                raise ValueError('Unreadable CAP member')
            with path.open('wb') as target:
                for block in iter(lambda: source.read(1024**2), b''):
                    target.write(block)
            records.append({'member': member.name, 'path': name, 'kind': kind,
                            'bytes': path.stat().st_size, 'sha256': digest(path)})
    if sum(r['kind'] == 'video' for r in records) != 47 or sum(r['kind'] == 'annotation' for r in records) != 47:
        raise ValueError('Unexpected CAP inventory; do not silently use an incomplete source')
    (root / 'source.json').write_text(json.dumps({
        'schema': 1, 'complete': True, 'dataset': 'CAP detection handheld public validation set',
        'source': 'https://visym.github.io/cap/', 'url': URL, 'archive_md5': MD5,
        'archive_sha256': digest(archive), 'license': 'CC BY 4.0',
        'credit': 'Jeffrey Byrne, Greg Castanon, Zhongheng Li and Gil Ettinger, Fine-grained Activities of People Worldwide, WACV 2023; Visym Labs.',
        'purpose': 'Independent FYP hard-negative research, not a CAP benchmark submission or proof of bribery.',
        'files': records}, indent=2), encoding='utf-8')
    print(json.dumps({'cap_complete': True, 'videos': 47}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, required=True)
    acquire(parser.parse_args().destination)
