"""Create 50 unrecorded collection slots, never fabricated evidence or annotations."""
import argparse
import json
from pathlib import Path

SCENARIOS = [
    ('routine_challan', 'Explain an official challan and payment counter; ask for a receipt.', 'TC-01–07'),
    ('fir_context', 'Use FIR kaat leni hai in a neutral procedural explanation.', 'TC-08,10,11,13,14'),
    ('indirect_request', 'Use bhai muhabbat karo with unclear context, then ask for clarification.', 'TC-08,10,11,13,14'),
    ('receipt_clarification', 'Start with settle kar do, then explicitly clarify official payment and receipt.', 'TC-08,10,11,13,14'),
    ('gesture_only', 'Show an open palm or finger-rubbing motion without payment speech; annotate visible shape only.', 'TC-09'),
    ('unofficial_payment', 'Act out a request for money without a receipt; keep the scene fictional and consented.', 'TC-12,15–22'),
    ('pressure_context', 'Act out verbal pressure without physical contact; record the complete preceding and following context.', 'TC-12,15–22'),
    ('safety_phrase', 'State that help is needed, then record a separate quoted or explicitly negated version.', 'TC-23–29'),
    ('energetic_nonviolence', 'Record safe exercise or animated conversation to test visual false positives; no physical confrontation.', 'TC-28,30,33'),
    ('adverse_recording', 'Repeat a routine procedure with partial hand/face occlusion or low light; record missing evidence explicitly.', 'TC-01–07,33'),
]
CONDITIONS = [
    ('urdu_clear', 'Urdu script reference, clear speech and front-facing framing'),
    ('roman_urdu', 'Urdu speech with a separately reviewed Roman Urdu reference; do not score it against Urdu-script ASR without a shared normalization policy'),
    ('punjabi', 'Punjabi speech with a native-speaker reference'),
    ('mixed_language', 'Urdu/English code-switching; preserve the language of each reference phrase'),
    ('background_noise', 'Repeat with ordinary background noise and a different viewing angle'),
]


def plan():
    return {'schema': 1, 'purpose': 'Unrecorded collection plan, not an evaluation manifest or dataset.',
            'recorded_clips': 0, 'slots': [
                {'slot_id': f'SA-EVAL-{i*5+j+1:03d}', 'scenario': scenario, 'script_brief': brief,
                 'prd_cases': prd, 'condition': condition, 'annotation_note': note,
                 'authorized': False, 'file': None, 'source_group': None, 'split': None,
                 'reference_transcript': None, 'review_priority': None, 'gestures': None}
                for i,(scenario,brief,prd) in enumerate(SCENARIOS)
                for j,(condition,note) in enumerate(CONDITIONS)]}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    args=parser.parse_args()
    path=Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8') as handle:
        json.dump(plan(), handle, ensure_ascii=False, indent=2)
    print(f'Created 50 unrecorded collection slots: {path}')


if __name__ == '__main__': main()
