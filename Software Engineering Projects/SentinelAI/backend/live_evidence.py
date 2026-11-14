"""Project preserved visual findings onto the keyframe-aligned replay clock."""
from .stream_timing import rtp_delta
from .visual_exchange import TITLE


def preserved_exchange(provenance, artifact_id, duration):
    finding, replay = provenance['finding'], provenance['replay']
    if finding.get('kind') != 'visual_exchange' or not finding.get('flagged'):
        return None
    origin = replay['start_rtp']
    start = rtp_delta(finding['start_rtp'], origin) / 90000
    end = rtp_delta(finding['end_rtp'], origin) / 90000
    if not 0 <= start < end <= duration + .1:
        raise ValueError('Preserved visual finding lies outside its replay timeline.')
    boxes = []
    for box in finding.get('boxes', []):
        if box.get('rtp') is None:
            continue
        seconds = rtp_delta(box['rtp'], origin) / 90000
        if 0 <= seconds <= duration + .1:
            boxes.append({**box, 'seconds': seconds})
    return {'start': start, 'end': min(end, duration), 'kind': 'visual_exchange', 'title': TITLE,
            'detail': finding['detail'] + ' Preserved original live finding; timestamps mapped to this replay. This is not a new prediction.',
            'confidence': finding['confidence'], 'confidence_type': finding.get('confidence_type', 'heuristic temporal support'),
            'source': 'preserved-learned-visual-transfer' if finding.get('inference_source') == 'learned-visual-transfer' else 'preserved-visual-transfer-rules-v1',
            'model': finding.get('model'), 'references': [artifact_id], 'boxes': boxes,
            'signals': {'visual_review': 50}, 'currency_identified': False, 'human_review_required': True,
            'preserved': True}
