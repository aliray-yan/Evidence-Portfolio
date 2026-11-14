"""Historical-evidence text retrieval smoke check; no audio analysis."""
import argparse
import json
from pathlib import Path
import time
import wave
from .config import Config, ROOT
from .retrieval import LocalEmbedder


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    args = parser.parse_args()
    config = Config.from_env()
    started = time.perf_counter()
    model = LocalEmbedder(config.retrieval_model)
    passages = ['Keep the official receipt for this traffic fine.', 'The weather is clear today.', 'Please call an ambulance for the injured person.']
    queries = ['Where is the proof of payment?', 'ادائیگی کی رسید کہاں ہے؟']
    documents = model.embed(passages)
    rankings = []
    for query in queries:
        scores = (documents @ model.embed([query], query=True)[0]).tolist()
        order = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        rankings.append({'query': query, 'top_excerpt': passages[order[0]], 'scores': scores})
        assert order[0] == 0, 'Authored receipt fixture did not rank first; inspect the recorded results.'
    report = {'fixture': 'Authored synthetic text. Technical check, not language/domain accuracy.', 'retrieval': {'model': model.identity, 'rankings': rankings, 'elapsed_seconds': round(time.perf_counter() - started, 3)}}
    target = ROOT / '.local/ai-verification/language-verification.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'report': str(target), 'retrieval_seconds': report['retrieval']['elapsed_seconds'], 'authored_queries': len(rankings), 'speaker_clusters': report.get('diarization', {}).get('report', {}).get('speakers')}), flush=True)


if __name__ == '__main__':
    main()
