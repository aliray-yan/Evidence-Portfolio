"""Fixed, authenticated downloads of locally authored test fixtures, never case media."""
import json
import re
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from .config import ROOT
from .security import user
from sentinel_ml.video import sha256

router=APIRouter(prefix='/api/test-videos')
TEST_VIDEO_ROOT=ROOT/'.local/test-videos'


def catalog():
    try:
        manifest=json.loads((TEST_VIDEO_ROOT/'manifest.json').read_text(encoding='utf-8'))
        if manifest.get('schema')!=1 or manifest.get('origin')!='authored_synthetic_tts':return []
        return [r for r in manifest['videos'] if re.fullmatch(r'EN-\d{2}',r['id']) and r['filename']=='SentinelAI-'+r['id']+'.mp4' and re.fullmatch(r'[0-9a-f]{64}',r['sha256'])
                and isinstance(r['title'],str) and 0 < r['duration'] <= 120.1 and 0 < r['bytes'] <= 100*1024*1024]
    except (OSError,ValueError,KeyError,TypeError):return []


def known_test_digest(digest):
    return any(r['sha256']==digest for r in catalog())


@router.get('')
def listing(request:Request,actor=Depends(user)):
    if not (request.app.state.config.demo or request.app.state.config.test_videos):
        return {'available':False,'videos':[]}
    rows=catalog()
    return {'available':bool(rows),'videos':[{k:r[k] for k in ('id','title','duration','bytes')} for r in rows]}


@router.get('/{video_id}')
def download(video_id:str,request:Request,actor=Depends(user)):
    if not (request.app.state.config.demo or request.app.state.config.test_videos):
        raise HTTPException(404,'Test fixtures are unavailable in this environment.')
    row=next((r for r in catalog() if r['id']==video_id),None)
    if not row:raise HTTPException(404,'Test video not found.')
    path=TEST_VIDEO_ROOT/row['filename']
    if not path.is_file() or sha256(path)!=row['sha256']:
        raise HTTPException(503,'The test fixture is missing or changed. Rebuild or restore the verified test pack.')
    with request.app.state.db.transaction() as con:
        request.app.state.db.audit(con,actor['id'],'test_video.download',video_id,{'sha256':row['sha256']})
    return FileResponse(path,media_type='video/mp4',filename=path.name)
