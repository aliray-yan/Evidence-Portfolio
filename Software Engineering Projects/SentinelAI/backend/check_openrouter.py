"""Send one fictional packet to verify the configured free reading assistant."""
from pathlib import Path
import json
from .config import Config, ROOT
from .reading_model import select_sources, ProviderFailure


def main():
    packet = {'synthetic': True, 'omitted_count': 0, 'sources': [
        {'alias': 's1', 'kind': 'transcript', 'text': 'Please pay the traffic fine at the official counter and keep the receipt.', 'start': 0, 'source': 'synthetic', 'excerpted': False},
        {'alias': 's2', 'kind': 'transcript', 'text': 'This is an authored fictional scenario, not an actual recording.', 'start': 3, 'source': 'synthetic', 'excerpted': False},
    ]}
    try:
        result = select_sources(Config.from_env(), packet)
    except ProviderFailure as exc:
        print(json.dumps({'connected': False, 'error_code': exc.code, 'detail': str(exc)}), flush=True)
        raise SystemExit(1)
    output = ROOT / '.local' / 'openrouter-verification.json'
    output.write_text(json.dumps({'synthetic_only': True, 'packet': packet, **result}, indent=2), encoding='utf-8')
    print(json.dumps({'connected': True, 'synthetic_only': True, 'actual_model': result['actual_model'],
                      'provider': result['provider'], 'elapsed_seconds': result['elapsed_seconds'],
                      'validated_selection': result['selection']}), flush=True)


if __name__ == '__main__':
    main()
