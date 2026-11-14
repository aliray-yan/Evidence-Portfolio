"""Local evidence retrieval: encrypted vectors, exact excerpts, no generated claims."""
import hashlib
import json
from pathlib import Path
import threading
import numpy as np
from .db import encode, now
from .language_assets import bundle_identity
from .intelligence import normalize

PREPROCESS = 'e5-prefix-mean-l2-512tokens-360chars-60overlap-v1'
MAX_CHUNKS = 4000


def sources(con, case_id):
    rows = [dict(r) for r in con.execute("SELECT id,text,start,end,source,'transcript' AS kind FROM segments WHERE case_id=? ORDER BY start,id LIMIT 2001", (case_id,))]
    rows += [dict(r) for r in con.execute("SELECT id,detail AS text,start,end,source,kind FROM events WHERE case_id=? ORDER BY start,id LIMIT 2001", (case_id,))]
    if len(rows) > 2000:
        raise ValueError('This case exceeds the supported search size of 2,000 sources.')
    return sorted(rows, key=lambda r: (r['start'], r['id']))


def source_hash(rows):
    return hashlib.sha256(encode(rows).encode()).hexdigest()


def model_hash(folder):
    manifest = json.loads((Path(folder) / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('kind') != 'multilingual_retrieval':
        raise ValueError('Select a supported local retrieval bundle.')
    return hashlib.sha256(encode({'files': manifest['files'], 'preprocess': PREPROCESS}).encode()).hexdigest()


def chunks(rows):
    result = []
    for row in rows:
        for start in range(0, len(row['text']), 300):
            end = min(len(row['text']), start + 360)
            if row['text'][start:end].strip():
                result.append({'source_id': row['id'], 'start_char': start, 'end_char': end, 'text': row['text'][start:end]})
            if end == len(row['text']):
                break
    if len(result) > MAX_CHUNKS:
        raise ValueError('This case exceeds the supported search size of 4,000 excerpts.')
    return result


class LocalEmbedder:
    def __init__(self, folder):
        import onnxruntime as ort
        from tokenizers import Tokenizer
        self.identity = bundle_identity(folder, 'multilingual_retrieval', ('model.onnx', 'tokenizer.json'))
        self.fingerprint = model_hash(folder)
        ort.disable_telemetry_events()
        settings = ort.SessionOptions()
        settings.intra_op_num_threads = 2
        settings.inter_op_num_threads = 1
        settings.enable_cpu_mem_arena = False
        self.session = ort.InferenceSession(str(Path(folder) / 'model.onnx'), sess_options=settings, providers=['CPUExecutionProvider'])
        self.tokenizer = Tokenizer.from_file(str(Path(folder) / 'tokenizer.json'))
        self.tokenizer.enable_truncation(max_length=512)
        self.tokenizer.enable_padding(pad_id=self.tokenizer.token_to_id('<pad>'), pad_token='<pad>')

    def embed(self, texts, query=False):
        if not texts or len(texts) > 8:
            raise ValueError('Expected one to eight bounded text excerpts.')
        encoded = self.tokenizer.encode_batch([('query: ' if query else 'passage: ') + text for text in texts])
        if any(e.overflowing for e in encoded):
            raise ValueError('An excerpt exceeds the model token limit; no silent truncation was applied.')
        inputs = {'input_ids': np.asarray([e.ids for e in encoded], dtype=np.int64),
                  'attention_mask': np.asarray([e.attention_mask for e in encoded], dtype=np.int64),
                  'token_type_ids': np.asarray([e.type_ids for e in encoded], dtype=np.int64)}
        feed = {item.name: inputs[item.name] for item in self.session.get_inputs()}
        hidden = self.session.run(None, feed)[0]
        if hidden.ndim != 3 or hidden.shape[:2] != inputs['input_ids'].shape or hidden.shape[2] != 384:
            raise ValueError('Unexpected multilingual embedding dimensions.')
        mask = inputs['attention_mask'][..., None]
        pooled = (hidden * mask).sum(axis=1) / mask.sum(axis=1)
        norms = np.linalg.norm(pooled, axis=1, keepdims=True)
        if not np.isfinite(pooled).all() or np.any(norms < 1e-10):
            raise ValueError('Invalid retrieval vector.')
        return np.asarray(pooled / norms, dtype='<f4')


def excerpt(row, chunk, score, mode):
    return {'id': row['id'], 'kind': row['kind'], 'source': row['source'], 'start': row['start'], 'end': row['end'],
            'text': row['text'][chunk['start_char']:chunk['end_char']], 'start_char': chunk['start_char'], 'end_char': chunk['end_char'],
            'excerpted': chunk['start_char'] > 0 or chunk['end_char'] < len(row['text']),
            'score': round(float(score), 5), 'score_type': 'cosine_similarity' if mode == 'semantic' else 'keyword_overlap'}


def keyword_search(rows, query, limit):
    terms = set(normalize(query).split())
    if not terms:
        return []
    by_id = {r['id']: r for r in rows}
    ranked = []
    for chunk in chunks(rows):
        text = normalize(chunk['text'])
        hits = len(terms & set(text.split()))
        if hits:
            score = hits / len(terms) + (1 if normalize(query) in text else 0)
            ranked.append((score, chunk))
    ranked.sort(key=lambda item: (-item[0], by_id[item[1]['source_id']]['start'], item[1]['start_char']))
    seen, result = set(), []
    for score, chunk in ranked:
        if chunk['source_id'] not in seen:
            seen.add(chunk['source_id'])
            result.append(excerpt(by_id[chunk['source_id']], chunk, score, 'keyword'))
        if len(result) == limit:
            break
    return result


class SearchService:
    def __init__(self, db, storage, config):
        self.db, self.storage, self.config = db, storage, config
        self.lock, self.model = threading.Lock(), None

    def load(self):
        if self.model is None:
            self.model = LocalEmbedder(self.config.retrieval_model)
        return self.model

    def run_once(self, stop_event=None):
        if not self.config.retrieval_model:
            return False
        if not self.lock.acquire(blocking=False):
            return False
        case_id = None
        try:
            with self.db.transaction() as con:
                job = con.execute("SELECT * FROM search_indexes WHERE status='queued' ORDER BY created_at LIMIT 1").fetchone()
                if not job:
                    return False
                case_id = job['case_id']
                rows = sources(con, case_id)
                expected = source_hash(rows)
                con.execute("UPDATE search_indexes SET status='running',processed=0,error_code=NULL,updated_at=? WHERE case_id=?", (now(), case_id))
                con.execute('DELETE FROM search_chunks WHERE case_id=?', (case_id,))
            model = self.load()
            spans = chunks(rows)
            if not spans or expected != job['source_hash'] or model.fingerprint != job['model_hash']:
                raise ValueError('Source or model changed before indexing.')
            with self.db.transaction() as con:
                con.execute('UPDATE search_indexes SET total=? WHERE case_id=?', (len(spans), case_id))
            for offset in range(0, len(spans), 8):
                if stop_event is not None and stop_event.is_set():
                    raise InterruptedError('Server is stopping.')
                batch = spans[offset:offset + 8]
                vectors = model.embed([s['text'] for s in batch])
                if vectors.shape != (len(batch), 384) or not np.isfinite(vectors).all():
                    raise ValueError('Invalid batch of retrieval vectors.')
                with self.db.transaction() as con:
                    current = con.execute('SELECT status,source_hash FROM search_indexes WHERE case_id=?', (case_id,)).fetchone()
                    if not current or current['status'] != 'running' or current['source_hash'] != expected:
                        return True  # Retention or replacement won the race; never recreate erased vectors.
                    for i, (span, vector) in enumerate(zip(batch, vectors)):
                        con.execute('INSERT INTO search_chunks VALUES (?,?,?,?,?,?)', (case_id, offset + i, span['source_id'], span['start_char'], span['end_char'], self.storage.cipher.encrypt(vector.tobytes())))
                    con.execute('UPDATE search_indexes SET processed=?,updated_at=? WHERE case_id=?', (offset + len(batch), now(), case_id))
            with self.db.transaction() as con:
                current = con.execute('SELECT status FROM cases WHERE id=?', (case_id,)).fetchone()
                state = 'ready' if current and current['status'] != 'deleted' and source_hash(sources(con, case_id)) == expected else 'stale'
                con.execute('UPDATE search_indexes SET status=?,updated_at=? WHERE case_id=?', (state, now(), case_id))
                self.db.audit(con, None, 'evidence_index.' + state, case_id, {'chunks': len(spans), 'model_hash': model.fingerprint})
            return True
        except Exception as exc:
            if case_id:
                with self.db.transaction() as con:
                    con.execute("UPDATE search_indexes SET status='failed',error_code=?,updated_at=? WHERE case_id=?", (type(exc).__name__, now(), case_id))
                    con.execute('DELETE FROM search_chunks WHERE case_id=?', (case_id,))
                    self.db.audit(con, None, 'evidence_index.failed', case_id, {'error_type': type(exc).__name__})
                return True
            raise
        finally:
            self.lock.release()

    def search(self, rows, stored, query, limit):
        if not self.lock.acquire(blocking=False):
            raise BlockingIOError('Local search is indexing another case. Try again shortly.')
        try:
            vector = self.load().embed([query], query=True)[0]
            ranked = []
            by_id = {r['id']: r for r in rows}
            for row in stored:
                embedding = np.frombuffer(self.storage.cipher.decrypt(row['vector']), dtype='<f4')
                if embedding.shape != (384,) or not np.isfinite(embedding).all():
                    raise ValueError('Invalid stored embedding.')
                ranked.append((float(embedding @ vector), row))
            ranked.sort(key=lambda item: (-item[0], item[1]['ordinal']))
            seen, result = set(), []
            for score, span in ranked:
                if span['source_id'] not in seen:
                    seen.add(span['source_id'])
                    result.append(excerpt(by_id[span['source_id']], span, score, 'semantic'))
                if len(result) == limit:
                    break
            return result
        finally:
            self.lock.release()
