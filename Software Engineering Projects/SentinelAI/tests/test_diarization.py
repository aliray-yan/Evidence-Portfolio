import pytest
from backend.diarization import validate_turns, attribute_segments


@pytest.mark.parametrize('turn', [
    {'start': -1, 'end': 2, 'speaker': 0}, {'start': 0, 'end': 9, 'speaker': 0},
    {'start': 0, 'end': float('nan'), 'speaker': 0}, {'start': 0, 'end': 2, 'speaker': True},
    {'start': 0, 'end': 2, 'speaker': 100}, {'start': 2, 'end': 2, 'speaker': 0},
])
def test_invalid_turns_rejected(turn):
    with pytest.raises(ValueError):
        validate_turns([turn], 3)


def test_anonymous_labels_first_appearance_and_bounds():
    turns = validate_turns([{'start': 2, 'end': 3.1, 'speaker': 7}, {'start': 0, 'end': 1, 'speaker': 9}], 3)
    assert [t['speaker'] for t in turns] == ['Speaker 1', 'Speaker 2']
    assert turns[-1]['end'] == 3


@pytest.mark.parametrize('turns,expected', [
    ([(0, 10, 'Speaker 1')], 'Speaker 1 (estimated)'),
    ([(0, 5, 'Speaker 1'), (5, 10, 'Speaker 2')], None),
    ([(0, 10, 'Speaker 1'), (4, 8, 'Speaker 2')], None),
    ([(0, 4, 'Speaker 1'), (0, 4, 'Speaker 1')], None),
    ([(0, 9, 'Speaker 1'), (9, 10, 'Speaker 2')], 'Speaker 1 (estimated)'),
    ([], None),
])
def test_uncertainty_overlap_and_duplicate_coverage(turns, expected):
    segment = {'start': 0, 'end': 10, 'text': 'Exact ASR text, never split or invented.'}
    result = attribute_segments([segment], [{'start': a, 'end': b, 'speaker': c} for a, b, c in turns])[0]
    assert result['speaker'] == expected and result['text'] == segment['text']


def test_retired_speaker_configuration_is_ignored(application, login, tmp_path, monkeypatch):
    from backend.pipeline import run_ffmpeg
    path = tmp_path / 'speaker-failure.mp4'
    run_ffmpeg(['-f', 'lavfi', '-i', 'color=blue:size=160x120:rate=15', '-f', 'lavfi', '-i', 'sine=frequency=720', '-t', '1', '-c:v', 'libx264', '-c:a', 'aac', str(path)])
    client = login('citizen')
    result = client.post('/api/cases/upload', data={'title': 'Speaker model recovery regression', 'consent': 'true'}, files={'file': ('test.mp4', path.read_bytes(), 'video/mp4')})
    case_id = result.json()['id']
    monkeypatch.setattr(application.state.config, 'diarization_model', 'missing-model')
    application.state.processor.run_once()
    case = client.get('/api/cases/' + case_id).json()
    assert case['processing_status'] == 'partial' and not case['processing_error']
    assert not case['segments'] and 'diarization' not in case['assessment']
