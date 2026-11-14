from pathlib import Path
import cv2
import numpy as np
from backend.db import now,uid,encode
from backend.pipeline import STAGES,run_ffmpeg
import pytest


def test_audio_only_mp4_is_rejected_without_device_backend_fallback(tmp_path):
    from backend.pipeline import inspect_media
    source = tmp_path/'audio-only.mp4'
    run_ffmpeg(['-f','lavfi','-i','sine=frequency=440:duration=0.3','-c:a','aac',str(source)])
    with pytest.raises(ValueError, match='no decodable video'):
        inspect_media(source,120)


def test_browser_webm_without_duration_is_normalized_and_length_limited(tmp_path):
    from backend.pipeline import inspect_media, prepare_media
    source = tmp_path/'stream.webm'
    run_ffmpeg(['-f','lavfi','-i','testsrc=size=160x120:rate=20','-t','1.5','-c:v','libvpx','-live','1',str(source)])
    ready = prepare_media(source,tmp_path,120)
    assert ready != source
    assert inspect_media(ready,120) == pytest.approx(1.5,abs=.1)
    # Normalization cannot turn an over-limit recording into an accepted truncation.
    ready = prepare_media(source,tmp_path,.5)
    with pytest.raises(ValueError, match='between'):
        inspect_media(ready,.5)

def test_actual_media_job_redacts_persists_and_removes_original(application,login,tmp_path):
    raw=tmp_path/'raw.mp4';source=tmp_path/'source.mp4'
    writer=cv2.VideoWriter(str(raw),cv2.VideoWriter_fourcc(*'mp4v'),10,(320,240))
    frame=np.zeros((240,320,3),dtype=np.uint8)
    frame[:,::10]=255
    for _ in range(20): writer.write(frame)
    writer.release()
    run_ffmpeg(['-i',str(raw),'-c:v','libx264',str(source)])
    client=login('citizen')
    response=client.post('/api/cases/upload',data={'title':'Actual processing integration test','consent':'true'},files={'file':('clip.mp4',source.read_bytes(),'video/mp4')})
    assert response.status_code==201,response.text
    case_id=response.json()['id']
    while application.state.processor.run_once(): pass
    c=client.get('/api/cases/'+case_id).json()
    assert c['processing_status']=='partial',c.get('processing_error')
    assert c['privacy_status']=='full_frame_blurred' and c['risk_label']=='Unassessed'
    assert {e['kind'] for e in c['evidence']}=={'video','frame','clip'}
    assert len(c['stages'])==7
    assert next(s for s in c['stages'] if s['name']=='Visual exchange analysis')['status']=='unavailable'
    with application.state.db.connect() as con:
        assert not con.execute("SELECT 1 FROM evidence WHERE case_id=? AND kind='original'",(case_id,)).fetchone()
    screenshot=next(e for e in c['evidence'] if e['kind']=='frame')
    decoded=cv2.imdecode(np.frombuffer(client.get('/api/evidence/'+screenshot['id']).content,np.uint8),cv2.IMREAD_COLOR)
    assert decoded is not None
    # The narrow high-contrast stripes must be visibly suppressed by actual redaction.
    assert decoded.std()<frame.std()/2
    assert not c['segments'] and not c['events']
