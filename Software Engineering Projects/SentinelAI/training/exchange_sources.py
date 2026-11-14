"""Reproducible, bounded downloads of published visual-interaction research data.

No downloaded Python, pickle, model or archive executable is executed. SBU is
research-only; Cornell is CC BY 4.0. Neither dataset labels bribery or currency.
"""
import argparse
from collections import OrderedDict
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import time
import zipfile

import requests

SBU = 'http://vision.cs.stonybrook.edu/~kiwon/Datasets/SBU_Kinect_Interactions/'
CORNELL = 'https://zenodo.org/api/records/7767535'
CORNELL_ZIP = CORNELL + '/files/Bimanual%20Handovers%20Dataset.zip/content'
MAX_FILE = 600 * 1024**2
# Fully actor-disjoint train/development/test participants, fixed before inference.
SBU_ACTORS = {'train': {'01', '02', '07'}, 'dev': {'03', '05'}, 'test': {'04', '06'}}


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024**2), b''):
            h.update(chunk)
    return h.hexdigest()


def safe_target(root, name):
    parts = PurePosixPath(name).parts
    if not parts or '\\' in name or ':' in name or any(p in ('..', '/') for p in parts):
        raise ValueError('Unsafe archive path')
    result = (root / Path(*parts)).resolve()
    if not result.is_relative_to(root.resolve()):
        raise ValueError('Archive path escapes destination')
    return result


class HTTPRangeFile(io.RawIOBase):
    """Seekable public ZIP reader; at most four 1 MiB blocks retained in memory."""
    def __init__(self, url, size, session=None):
        self.url, self.size, self.pos = url, size, 0
        self.session = session or requests.Session()
        self.cache = OrderedDict()
        self.downloaded = 0

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        if whence not in (0, 1, 2):
            raise ValueError('Invalid seek origin')
        pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        if pos < 0:
            raise ValueError('Negative seek')
        self.pos = pos
        return pos

    def read(self, count=-1):
        count = min(self.size - self.pos, count if count >= 0 else self.size - self.pos)
        if count <= 0:
            return b''
        if count > 32 * 1024**2:
            raise ValueError('Archive read exceeds memory bound')
        chunks = []
        while count:
            key = self.pos // 1024**2
            if key not in self.cache:
                start = key * 1024**2
                end = min(self.size - 1, start + 1024**2 - 1)
                for attempt in range(3):
                    try:
                        with self.session.get(self.url, headers={'Range': f'bytes={start}-{end}'},
                                              timeout=(15, 45), stream=True) as response:
                            response.raise_for_status()
                            if response.status_code != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{self.size}':
                                raise ValueError('Server did not honor the exact bounded byte range')
                            data = response.raw.read(end - start + 2)
                            if len(data) != end - start + 1:
                                raise ValueError('Truncated or oversized range')
                        break
                    except requests.RequestException:
                        if attempt == 2:
                            raise
                        time.sleep(attempt + 1)
                self.downloaded += len(data)
                self.cache[key] = data
                if len(self.cache) > 4:
                    self.cache.popitem(last=False)
            self.cache.move_to_end(key)
            block = self.cache[key]
            within = self.pos % 1024**2
            chunk = block[within:within + count]
            chunks.append(chunk)
            count -= len(chunk)
            self.pos += len(chunk)
        return b''.join(chunks)


def extract_member(archive, member, root):
    root = root.resolve()
    if member.file_size > 16 * 1024**2 or member.is_dir():
        raise ValueError('Unexpected oversized or directory dataset member')
    target = safe_target(root, member.filename)
    target.parent.mkdir(parents=True, exist_ok=True)
    # zipfile validates CRC, including resumed files, before a manifest is written.
    data = archive.read(member)
    expected = hashlib.sha256(data).hexdigest()
    if not target.exists() or digest(target) != expected:
        temporary = target.with_suffix(target.suffix + '.part')
        temporary.write_bytes(data)
        temporary.replace(target)
    return {'relative': target.relative_to(root).as_posix(), 'bytes': len(data), 'sha256': expected}


def download(url, destination, maximum=MAX_FILE):
    temporary = destination.with_suffix(destination.suffix + '.part')
    for attempt in range(3):
        try:
            with requests.get(url, stream=True, timeout=(15, 45)) as response:
                response.raise_for_status()
                if int(response.headers.get('Content-Length', 0)) > maximum:
                    raise ValueError('Download exceeds configured bound')
                total = 0
                expected = int(response.headers.get('Content-Length', 0))
                with temporary.open('wb') as stream:
                    for chunk in response.iter_content(1024**2):
                        total += len(chunk)
                        if total > maximum:
                            raise ValueError('Download exceeds configured bound')
                        stream.write(chunk)
                if expected and total != expected:
                    raise ValueError('Truncated source download')
            temporary.replace(destination)
            return
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def sbu(root):
    root = root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    readme = requests.get(SBU + 'README.txt', timeout=30)
    readme.raise_for_status()
    if 'must be used only for the purposes of research' not in readme.text:
        raise ValueError('Published dataset terms changed; inspect before ingestion')
    (root / 'SOURCE-README.txt').write_bytes(readme.content)
    all_pairs = sorted(set(re.findall(r'/((?:s\d{2}){2})\.zip', readme.text)))
    if len(all_pairs) != 21:
        raise ValueError('Unexpected SBU source inventory')
    pairs = [p for p in all_pairs if any(set(re.findall(r's(\d{2})', p)) <= actors for actors in SBU_ACTORS.values())]
    records = []
    for number, pair in enumerate(pairs, 1):
        path = root / (pair + '.zip')
        if not path.exists():
            download(SBU + path.name, path)
        with zipfile.ZipFile(path) as archive:
            selected = [item for item in archive.infolist() if re.search(r'/rgb_\d+\.png$', item.filename)]
            if not selected or sum(item.file_size for item in selected) > 700 * 1024**2:
                raise ValueError('Unexpected SBU RGB inventory')
            rows = [extract_member(archive, item, root / 'rgb') for item in selected]
        records.append({'pair': pair, 'url': SBU + path.name, 'archive_sha256': digest(path), 'frames': rows})
        report = {'schema': 1, 'dataset': 'SBU Kinect Interaction v2 clean', 'purpose': 'FYP research training/evaluation only',
                  'terms': 'Research only; cite Yun, Honorio, Chattopadhyay, Berg and Samaras, HAU3D-CVPRW 2012.',
                  'source': SBU + 'README.txt', 'transport': 'Publisher provides HTTP; no publisher checksum. Local SHA-256 records provenance, not publisher authentication.',
                  'selection': 'Only pairs entirely inside the predeclared actor-disjoint splits; cross-split pairs excluded.',
                  'actors': {k: sorted(v) for k, v in SBU_ACTORS.items()}, 'selected_pairs': pairs,
                  'complete': number == len(pairs), 'archives': records}
        (root / 'source.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({'dataset': 'SBU', 'pairs_complete': number, 'pairs_total': len(pairs), 'rgb_frames': len(rows)}), flush=True)


def cornell(root):
    root = root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    response = requests.get(CORNELL, timeout=30)
    response.raise_for_status()
    metadata = response.json()
    if metadata['metadata']['license']['id'] != 'cc-by-4.0':
        raise ValueError('Cornell dataset license changed')
    (root / 'source-record.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    stream = HTTPRangeFile(CORNELL_ZIP, metadata['files'][0]['size'])
    records = []
    with zipfile.ZipFile(stream) as archive:
        selected = [m for m in archive.infolist() if m.filename.endswith('ReadMe.txt') or
                    m.filename.endswith('.mp4') or '/OptiTrack_Local_Frame/' in m.filename and m.filename.endswith('.csv')]
        for number, item in enumerate(selected, 1):
            target = safe_target(root / 'raw', item.filename)
            # Resume only previously verified members from a persisted per-file receipt.
            receipt = target.with_suffix(target.suffix + '.sha256')
            if target.exists() and receipt.exists() and digest(target) == receipt.read_text():
                row = {'relative': target.relative_to(root / 'raw').as_posix(), 'bytes': target.stat().st_size,
                       'sha256': receipt.read_text()}
            else:
                row = extract_member(archive, item, root / 'raw')
                receipt.write_text(row['sha256'])
            records.append(row)
            if number % 30 == 0 or number == len(selected):
                (root / 'source.json').write_text(json.dumps({'schema': 1, 'dataset': 'Cornell bimanual handovers',
                    'source': 'https://zenodo.org/records/7767535', 'license': 'CC BY 4.0',
                    'authors': ['Alap Kshirsagar', 'Raphael Fortuna', 'Zhiming Xie', 'Guy Hoffman'],
                    'purpose': 'Visual object-transfer research; no currency or wrongdoing labels',
                    'complete': number == len(selected), 'files': records}, indent=2), encoding='utf-8')
                print(json.dumps({'dataset': 'Cornell', 'files_complete': number, 'files_total': len(selected),
                                  'network_mb': round(stream.downloaded / 1e6, 1)}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', choices=['sbu', 'cornell'], required=True)
    parser.add_argument('--destination', type=Path, required=True)
    arguments = parser.parse_args()
    (sbu if arguments.source == 'sbu' else cornell)(arguments.destination)
