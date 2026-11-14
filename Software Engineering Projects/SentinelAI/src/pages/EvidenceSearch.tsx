import { useEffect, useId, useState } from 'react';
import { Search } from 'lucide-react';
import { api, post } from '../api';
import { ErrorPanel, Notice, Status } from '../components';
import { timecode } from '../types';

type SearchStatus = { available: boolean; source_count: number; worker_enabled: boolean; index: { status: string; total: number; processed: number; error_code?: string } };
type Result = { id: string; text: string; kind: string; source: string; start: number; end: number; excerpted: boolean; score: number };

export function EvidenceSearch({ caseId, reference }: { caseId: string; reference: (id: string) => void }) {
  const id = useId();
  const [status, setStatus] = useState<SearchStatus | null>(null), [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState(''), [mode, setMode] = useState<'keyword' | 'semantic'>('keyword');
  const [results, setResults] = useState<Result[] | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const indexing = status?.index.status === 'queued' || status?.index.status === 'running';
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const value = await api<SearchStatus>(`/cases/${caseId}/search`, { signal: controller.signal });
        setStatus(value);
        if (['queued', 'running'].includes(value.index.status)) timer = setTimeout(load, 2500);
      } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [caseId, refresh]);
  async function prepare() {
    setBusy(true); setError(''); setResults(null);
    try { setStatus(await post<SearchStatus>(`/cases/${caseId}/search/index`)); setRefresh(v => v + 1); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !query.trim()) return;
    setBusy(true); setError(''); setResults(null);
    try { setResults((await post<{ results: Result[] }>(`/cases/${caseId}/search`, { query, mode })).results); }
    catch (e) { setError((e as Error).message); setRefresh(v => v + 1); }
    finally { setBusy(false); }
  }
  return <section className="evidence-search" aria-labelledby={id} aria-busy={busy}>
    <h3 id={id}><Search size={18} aria-hidden="true"/>Search case evidence <span className="source-label">Local only</span></h3>
    <p>Find transcript and event excerpts in this case. Search does not generate facts or change the risk assessment.</p>
    {error && <ErrorPanel message={error} retry={() => { setError(''); setRefresh(v => v + 1); }}/>}
    {!status && !error && <p role="status">Loading search availability…</p>}
    {status && <>
      <div className="search-index-state"><Status value={status.index.status}/><span>{status.source_count} evidence sources</span>
        {indexing && <span role="status">{status.index.status === 'queued' ? 'Waiting for the local worker' : `Indexed ${status.index.processed} of ${status.index.total} excerpts`}</span>}
      </div>
      {!status.available && <p className="field-help">Meaning search is unavailable. Exact-word search works without a model.</p>}
      {status.available && status.index.status !== 'ready' && <>
        <p className="field-help">Prepare a local multilingual index to search by meaning. Similarity ranks excerpts; it is not confidence or proof. Language quality is unvalidated on police interactions.</p>
        {status.index.status === 'failed' && <Notice tone="warning">Indexing failed ({status.index.error_code || 'processing error'}). Check system health, then retry.</Notice>}
        {status.index.status === 'stale' && <Notice>The evidence or selected model changed. Prepare the index again.</Notice>}
        {!status.worker_enabled && <Notice>The background worker is disabled. Start the server with workers enabled to prepare an index.</Notice>}
        {!indexing && <button className="button secondary" disabled={busy || !status.worker_enabled || !status.source_count} onClick={prepare}>{status.index.status === 'failed' ? 'Retry semantic indexing' : 'Prepare semantic search'}</button>}
      </>}
      <form className="evidence-search-form" onSubmit={search}>
        <label>Words or question<input type="search" required maxLength={400} value={query} disabled={busy || !status.source_count} onChange={e => { setQuery(e.target.value); setResults(null); }} placeholder="For example: receipt for the payment" dir="auto"/></label>
        <label>Search method<select value={mode} disabled={busy} onChange={e => { setMode(e.target.value as 'keyword' | 'semantic'); setResults(null); }}><option value="keyword">Exact words</option><option value="semantic" disabled={!status.available || status.index.status !== 'ready'}>Meaning · multilingual</option></select></label>
        <button className="button secondary" disabled={busy || !query.trim() || !status.source_count || (mode === 'semantic' && status.index.status !== 'ready')}>{busy ? 'Working…' : 'Search evidence'}</button>
      </form>
      {status.source_count === 0 && <Notice>No transcript or event text is available for this case.</Notice>}
    </>}
    {results && <div aria-live="polite">
      <p>{results.length ? `${results.length} matching sources. Open each source and read its surrounding context.` : 'No matching words found. Try a shorter phrase or another language.'}</p>
      {mode === 'semantic' && <p className="field-help">These are the closest available excerpts, even when none answers the question. Cosine similarity is not a probability.</p>}
      <ol className="reading-excerpts">{results.map(r => <li key={r.id}>
        <button className="reference-link" onClick={() => reference(r.id)}>View source · {timecode(r.start)}–{timecode(r.end)}</button>
        <span className="source-label">{r.source === 'synthetic' ? 'Scripted scenario' : r.source} · {r.kind}</span>
        <p dir="auto">{r.text}</p>
        {r.excerpted && <small>Excerpt only; view the source for its full context. </small>}
        {mode === 'semantic' && <small>Relative similarity {r.score.toFixed(3)}</small>}
      </li>)}</ol>
    </div>}
  </section>;
}
