from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path.cwd()
destination=root/'Blueprint3D-improved.zip'
excluded={'node_modules','dist','build','.git','__pycache__','.codex','.agents','.aws'}
with ZipFile(destination,'w',compression=ZIP_DEFLATED,compresslevel=6) as archive:
    for file in sorted(root.rglob('*')):
        relative=file.relative_to(root)
        if not file.is_file() or file==destination or any(part in excluded for part in relative.parts):
            continue
        if file.name.startswith('.env') and file.name!='.env.example':
            continue
        if file.suffix in {'.log','.pyc','.tsbuildinfo'}:
            continue
        archive.write(file,Path('Blueprint3D')/relative)
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    print(f'Packaged {len(archive.infolist())} files, {destination.stat().st_size:,} bytes.')
