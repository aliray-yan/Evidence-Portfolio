"""Screened learned transfer windows: decision support, no money/intent classifier."""
from pathlib import Path
import time

from .exchange_import import verify_installation
from .visual_exchange import TITLE
from sentinel_ml.exchange_bundle import ResearchExchange

SCOPE = ('Learned visual-transfer window classification; pending human review. '
         'Ordinary document/object transfers may be flagged. No currency, intent, guilt, '
         'action bounding boxes, audio or conversation classification. '
         'Reused laboratory/stock screening is not independent field validation.')


class LearnedTracker:
    def __init__(self, model):
        self.model = model.fork()
        self.last_emitted = float('-inf')
        self.windows = 0
        self.gaps = 0

    def reset(self):
        self.model.reset()
        self.last_emitted = float('-inf')


class LearnedExchange:
    def __init__(self, directory):
        directory = Path(directory)
        self.identity = verify_installation(directory)
        self.model = ResearchExchange(directory, runtime=directory / 'runtime')
        self.last_report = None

    def new_tracker(self):
        return LearnedTracker(self.model)

    def event(self, value):
        return {'start': value['start'], 'end': value['end'], 'kind': 'visual_exchange', 'title': TITLE,
                'detail': 'A consecutive-frame window resembles visual object transfers in the training data. '
                          'Object type, precise transfer onset and intent are unknown. ' + SCOPE,
                'confidence': value['score'], 'confidence_type': 'uncalibrated learned window score',
                'source': 'learned-visual-transfer', 'references': [], 'signals': {'visual_review': 50},
                'boxes': [], 'frames': [{'seconds': seconds, 'rtp': rtp}
                                       for seconds, rtp in zip(value['sampled_seconds'], value['sampled_rtp'])],
                'peak_window': {'start': value['start'], 'end': value['end'], 'score': value['score']},
                'currency_identified': False, 'human_review_required': True,
                'model': self.identity, 'threshold': self.model.manifest['threshold']}

    def frame(self, rgb, stamp, tracker, rtp=None):
        if tracker.model.previous is not None and stamp - tracker.model.previous > .4:
            tracker.gaps += 1
        value = tracker.model.observe(rgb, stamp, rtp)
        if value:
            tracker.windows += 1
        coverage = {'sample_hz': 4, 'buffered_frames': len(tracker.model.frames),
                    'completed_windows': tracker.windows, 'gap_resets': tracker.gaps,
                    'status': 'scored' if value else 'warming_up', 'currency_identified': False}
        # At most one emitted overlapping candidate every two source seconds.
        # Every complete window is still scored; live findings are rate bounded.
        if value and value['flagged'] and stamp - tracker.last_emitted >= 2:
            tracker.last_emitted = stamp
            return [self.event(value)], coverage
        return [], coverage

    def analyze(self, path):
        started = time.perf_counter()
        predictions = self.model.analyze(path)
        events = []
        for value in predictions:
            if not value['flagged']:
                continue
            event = self.event(value)
            if events and event['start'] <= events[-1]['end']:
                events[-1]['end'] = event['end']
                if event['confidence'] > events[-1]['confidence']:
                    events[-1]['peak_window'] = event['peak_window']
                events[-1]['confidence'] = max(events[-1]['confidence'], event['confidence'])
                events[-1]['supporting_windows'] += 1
            else:
                events.append({**event, 'supporting_windows': 1})
        self.last_report = {'status': 'experimental', 'model': self.identity,
                            'version': self.model.manifest['version'], 'threshold': self.model.manifest['threshold'],
                            'sample_hz': 4, 'scored_windows': len(predictions), 'events': events,
                            **self.model.last_analysis,
                            'confidence_type': 'uncalibrated learned window score',
                            'scope': SCOPE, 'elapsed_seconds': round(time.perf_counter() - started, 3),
                            'coverage_note': 'Eight consecutive samples required; gaps reset history. '
                                             'No complete window means unavailable analysis, not a negative finding.'}
        if not predictions:
            self.last_report['status'] = 'insufficient_temporal_coverage'
        return events

    def close(self):
        self.model.reset()
