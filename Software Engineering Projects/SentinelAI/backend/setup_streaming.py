"""Install the pinned official MediaMTX Windows release after checksum validation."""
import hashlib
import io
import json
import platform
from pathlib import Path
import urllib.request
import zipfile
import os
import subprocess
import sys
from .config import ROOT

VERSION = 'v1.21.3'
ASSET = 'mediamtx_'+VERSION+'_windows_amd64.zip'
BASE = 'https://github.com/bluenviron/mediamtx/releases/download/'+VERSION+'/'
DESTINATION = ROOT/'.local/tools/mediamtx'/VERSION


def fetch(url, limit):
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read(limit+1)
    if len(data)>limit:
        raise ValueError('Download exceeded its expected size limit.')
    return data


def main():
    if platform.system()!='Windows' or platform.machine().lower() not in ('amd64','x86_64'):
        raise ValueError('This installer is for Windows AMD64. Install the matching official MediaMTX release on other systems.')
    manifest=DESTINATION/'install.json'
    if manifest.is_file():
        data=json.loads(manifest.read_text())
        if hashlib.sha256((DESTINATION/'mediamtx.exe').read_bytes()).hexdigest()!=data['executable_sha256']:
            raise ValueError('The installed executable has changed. Restore a verified installation.')
        print('Verified existing MediaMTX '+VERSION)
        if '--bridge' in sys.argv:
            build_bridge()
        return
    checksums=fetch(BASE+'checksums.sha256',64*1024).decode()
    expected=next(line.split()[0] for line in checksums.splitlines() if line.split()[-1].lstrip('*')==ASSET)
    archive=fetch(BASE+ASSET,64*1024*1024)
    if hashlib.sha256(archive).hexdigest()!=expected:
        raise ValueError('MediaMTX archive checksum mismatch; nothing installed.')
    DESTINATION.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
        for name in ('mediamtx.exe','LICENSE','mediamtx.yml'):
            if name not in bundle.namelist():
                raise ValueError('Official archive is incomplete.')
            data=bundle.read(name)
            with (DESTINATION/name).open('xb') as target:
                target.write(data)
    report={'version':VERSION,'source':BASE+ASSET,'archive_sha256':expected,'executable_sha256':hashlib.sha256((DESTINATION/'mediamtx.exe').read_bytes()).hexdigest()}
    manifest.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('Installed checksum-verified MediaMTX '+VERSION)
    if '--bridge' in sys.argv:
        build_bridge()


def build_bridge():
    toolchain = ROOT/'.local/tools/go1.27.3'
    executable = toolchain/'go/bin/go.exe'
    if not executable.is_file():
        releases = json.loads(fetch('https://go.dev/dl/?mode=json',512*1024))
        release = next(r for r in releases if r['version']=='go1.27.3')
        artifact = next(f for f in release['files'] if f['os']=='windows' and f['arch']=='amd64' and f['kind']=='archive')
        archive = fetch('https://go.dev/dl/'+artifact['filename'],150*1024*1024)
        if hashlib.sha256(archive).hexdigest()!=artifact['sha256']:
            raise ValueError('Go toolchain checksum mismatch.')
        with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
            for item in bundle.infolist():
                target = (toolchain/item.filename).resolve()
                if not target.is_relative_to(toolchain.resolve()):
                    raise ValueError('Invalid toolchain archive path.')
            bundle.extractall(toolchain)
        (toolchain/'install.json').write_text(json.dumps(artifact,indent=2),encoding='utf-8')
    env=os.environ.copy()
    env.update(GOTOOLCHAIN='local',GOCACHE=str(ROOT/'.local/go-cache'),GOMODCACHE=str(ROOT/'.local/go-modules'),GOPATH=str(ROOT/'.local/go-path'),CGO_ENABLED='0')
    subprocess.run([str(executable),'mod','tidy'],cwd=ROOT/'stream_bridge',env=env,check=True)
    destination=ROOT/'.local/tools/sentinel-stream-bridge.exe'
    subprocess.run([str(executable),'build','-trimpath','-o',str(destination),'.'],cwd=ROOT/'stream_bridge',env=env,check=True)
    print('Built local RTP timestamp bridge: '+hashlib.sha256(destination.read_bytes()).hexdigest())


if __name__=='__main__':
    main()
