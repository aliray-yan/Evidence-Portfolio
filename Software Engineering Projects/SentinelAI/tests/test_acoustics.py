from types import SimpleNamespace as NS
import pytest
from backend.acoustics import observations
from backend.db import DEFAULT_SETTINGS
from backend.intelligence import fuse


def result(timestamp, label='Screaming', score=.8):
    return NS(timestamp_ms=timestamp, classifications=[NS(categories=[NS(category_name=label,score=score)])])


def test_sound_candidates_have_timestamps_without_emergency_override():
    events, windows=observations([result(0),result(975),result(1950,'Shatter')],2.1)
    assert len(events)==2 and len(windows)==3
    assert events[0]['start']==0 and events[0]['end']==1.95
    assert events[1]['end']==2.1
    assert all('not retained' in e['detail'] for e in events)
    assert fuse(events,DEFAULT_SETTINGS['thresholds'])['label']=='Ambiguous'


def test_low_score_or_unrelated_sound_does_not_fabricate_events():
    events, windows=observations([result(0,'Speech'),result(975,score=.2)],2)
    assert not events and len(windows)==2


@pytest.mark.parametrize('item',[result(-1),result(3000),result(0,score=float('nan'))])
def test_invalid_sound_output_fails_closed(item):
    with pytest.raises(ValueError):observations([item],2)


def test_retired_acoustic_configuration_does_not_run(application,login,tmp_path,monkeypatch):
    from backend.pipeline import run_ffmpeg
    path=tmp_path/'audio-failure.mp4'
    run_ffmpeg(['-f','lavfi','-i','color=navy:size=160x120:rate=15','-f','lavfi','-i','sine=frequency=670','-t','1','-c:v','libx264','-c:a','aac',str(path)])
    client=login('citizen')
    response=client.post('/api/cases/upload',data={'title':'Audio model recovery test','consent':'true'},files={'file':('sound.mp4',path.read_bytes(),'video/mp4')})
    case=response.json()['id']
    monkeypatch.setattr(application.state.processor.config,'acoustic_model','missing-model')
    application.state.processor.run_once()
    c=client.get('/api/cases/'+case).json()
    assert c['processing_status']=='partial' and not c['processing_error']
    assert not c['segments'] and 'acoustics' not in c['assessment']


@pytest.mark.parametrize('with_speech',[False,True])
def test_audio_is_not_extracted_even_with_legacy_configuration(application,login,tmp_path,monkeypatch,with_speech):
    import wave
    from backend.pipeline import run_ffmpeg
    from backend import acoustics,speech
    path=tmp_path/'long-audio.mp4'
    run_ffmpeg(['-f','lavfi','-i','color=teal:size=160x120:rate=15:duration=1','-f','lavfi','-i','sine=frequency=820:duration=4','-c:v','libx264','-c:a','aac',str(path)])
    measured=[]
    class Analyzer:
        def __init__(self,*args):self.last_report={'status':'completed'}
        def analyze(self,path):
            with wave.open(str(path),'rb') as wav:measured.append(wav.getnframes()/wav.getframerate())
            return []
        transcribe=analyze
    processor=application.state.processor
    monkeypatch.setattr(processor.config,'acoustic_model','test-double')
    monkeypatch.setattr(acoustics,'LocalAcoustics',Analyzer)
    if with_speech:
        monkeypatch.setattr(processor.config,'whisper_model','test-double')
        monkeypatch.setattr(speech,'LocalWhisper',Analyzer)
    client=login('officer' if with_speech else 'citizen')
    case=client.post('/api/cases/upload',data={'title':'Bounded audio extraction regression','consent':'true'},files={'file':('sound.mp4',path.read_bytes(),'video/mp4')}).json()['id']
    processor.run_once()
    c=client.get('/api/cases/'+case).json()
    assert c['processing_status']=='partial',c['processing_error']
    assert measured == []
    assert not c['segments'] and 'speech' not in c['assessment'] and 'acoustics' not in c['assessment']
