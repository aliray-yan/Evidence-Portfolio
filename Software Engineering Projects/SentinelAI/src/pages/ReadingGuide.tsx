import { useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import { api, post } from '../api';
import { Confirm, ErrorPanel, Notice } from '../components';
import { dateTime, timecode } from '../types';

type Excerpt = { id: string; alias: string; kind: string; text: string; start: number; source: string; excerpted: boolean };
type Guide = { status: string; created_at: string; actual_model: string | null; provider: string | null; elapsed_seconds: number | null; error_code: string | null; selected_sources: Excerpt[]; follow_ups: string[] };
type Preview = { enabled: boolean; detail: string; model: string; version: number; packet: { source_hash: string; synthetic: boolean; omitted_count: number; sources: Excerpt[] }; guide: Guide | null };

export function ReadingGuide({ caseId, version, reference }: { caseId: string; version: number; reference: (id: string) => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [open, setOpen] = useState(false), [consent, setConsent] = useState(false);
  const changed = !!preview && preview.version !== version;

  async function load() {
    setLoading(true); setError('');
    try { setPreview(await api<Preview>(`/cases/${caseId}/reading-guide`)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  async function generate() {
    if (!preview || !consent || busy) return;
    setBusy(true); setError('');
    try {
      const result = await post<{ guide: Guide }>(`/cases/${caseId}/reading-guide`, {
        source_hash: preview.packet.source_hash, version: preview.version, reviewed_external_transfer: true,
      });
      setPreview({ ...preview, guide: result.guide });
      setOpen(false); setConsent(false);
    } catch (e) { setError((e as Error).message); setOpen(false); }
    finally { setBusy(false); }
  }
  const guide = preview?.guide;
  return <section className="reading-guide" aria-labelledby="reading-guide-title" aria-busy={loading || busy}>
    <h3 id="reading-guide-title"><BookOpen size={18} aria-hidden="true"/>AI reading guide <span className="source-label">Optional</span></h3>
    <p>A cloud model can select existing excerpts to help you navigate the evidence. Its choices are unverified and may omit context. They do not change the risk assessment, report, or human decision.</p>
    {error && <ErrorPanel message={error} retry={load}/>}
    {!preview && <button className="button secondary" disabled={loading} onClick={load}>{loading ? 'Loading source preview…' : 'Prepare reading guide'}</button>}
    {preview && <>
      <p className="field-help reading-model">Configured model: {preview.model}</p>
      {!preview.enabled && <Notice>{preview.detail}</Notice>}
      {changed && <Notice tone="warning">The case has changed. Refresh the preview before requesting a new guide.</Notice>}
      {guide?.status === 'completed' && !changed && <>
        <p className="field-help">Selected {dateTime(guide.created_at)} · {guide.actual_model}{guide.provider ? ` · ${guide.provider}` : ''}{guide.elapsed_seconds != null ? ` · ${guide.elapsed_seconds.toFixed(1)} s` : ''}</p>
        <ol className="reading-excerpts">{guide.selected_sources.map(s => <li key={s.alias}>
          <button className="reference-link" onClick={() => reference(s.id)}>{timecode(s.start)} · {s.kind}</button>
          <span className="source-label">{s.source === 'synthetic' ? 'Scripted scenario' : s.source}</span>
          <p dir="auto">{s.text}</p>{s.excerpted && <small>First 600 characters only; open the full source for context.</small>}
        </li>)}</ol>
        {!!guide.follow_ups.length && <><h4>Suggested review checks</h4><ul>{guide.follow_ups.map(f => <li key={f}>{f}</li>)}</ul></>}
      </>}
      {guide?.status === 'failed' && <Notice tone="warning">The last request did not produce a guide ({guide.error_code || 'provider failure'}). Your evidence summary is still available. Preview again to retry.</Notice>}
      {guide?.status === 'obsolete' && <Notice tone="warning">The previous guide refers to an earlier case version. Its selections are no longer displayed.</Notice>}
      {guide?.status === 'running' && <Notice>Generation is in progress. Refresh its status shortly; no additional request is needed.</Notice>}
      <div className="reading-actions">
        {preview.enabled && guide?.status !== 'running' && (guide?.status !== 'completed' || changed) && <button className="button secondary" disabled={loading || busy || changed} onClick={() => { setConsent(false); setOpen(true); }}>Review cloud transfer</button>}
        <button className="button secondary" disabled={loading || busy} onClick={load}><RefreshCw size={15}/>{loading ? 'Refreshing…' : 'Refresh preview & status'}</button>
      </div>
    </>}
    <Confirm open={open} title="Send these excerpts to OpenRouter?" busy={busy} confirmDisabled={!consent || changed} busyLabel="Generating guide…" label="Send excerpts & generate" onClose={() => setOpen(false)} onConfirm={generate}>
      {preview && <>
        <Notice tone="warning">{preview.packet.synthetic ? 'Synthetic scenario excerpts only.' : 'Real-case text may contain personal information. Confirm that this transfer is authorized.'} OpenRouter and its model provider receive the text below, source types, timestamps, and synthetic status. Their privacy policies apply. Media, case identifiers, location fields, notes, and reviewer decisions are excluded.</Notice>
        <p className="reading-model">Model: {preview.model}. No paid fallback. Sources omitted from this packet: {preview.packet.omitted_count}.</p>
        {preview.model.startsWith('nvidia/') && <p className="field-help">This free NVIDIA endpoint may log requests for model improvement. It accepts synthetic scenarios only; never include personal or confidential text in this packet.</p>}
        <div className="reading-preview" tabIndex={0} role="region" aria-label="Excerpts to be sent">
          {preview.packet.sources.map(s => <article key={s.alias}><strong>{s.alias} · {timecode(s.start)} · {s.kind}</strong><small>{s.source} {s.excerpted ? '· first 600 characters' : '· complete excerpt'}</small><p dir="auto">{s.text}</p></article>)}
        </div>
        <label className="check-label"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)}/>I reviewed these excerpts and authorize sending them to OpenRouter and its provider.</label>
        {changed && <Notice tone="warning">The case changed while this preview was open. Cancel and refresh it.</Notice>}
        <p className="field-help" role="status">{busy ? 'Waiting for the provider. A guide appears only after its references pass server validation.' : 'The model may only select source references and predefined review checks. Generated factual claims are rejected.'}</p>
      </>}
    </Confirm>
  </section>;
}
