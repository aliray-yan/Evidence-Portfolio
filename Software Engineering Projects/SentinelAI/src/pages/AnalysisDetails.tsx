import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Confirm, ErrorPanel, Notice, Panel, Status } from '../components';
import { Case } from '../types';
import { post } from '../api';

export function AnalysisDetails({ c }: { c: Case }) {
  const reports = [['Visual exchange review', c.assessment.exchange], ['Fight classification', c.assessment.vision], ['Hand & pose observations', c.assessment.perception], ['Knife / scissors candidates', c.assessment.objects], ...(c.assessment.speech?[['Historical speech record',c.assessment.speech]]:[])] as const;
  if (c.synthetic || !reports.some(([, report]) => report)) return null;
  return <Panel title="Analysis provenance" className="section-gap"><div className="analysis-records">
    {reports.map(([name, report]) => <details key={name}>
      <summary><ChevronRight size={16} className="analysis-toggle" aria-hidden="true" /><strong>{name}</strong><Status value={report?.status || (report ? 'completed' : 'unavailable')} /></summary>
      {report ? <><p>{report.scope}</p><dl className="analysis-facts">
        {report.elapsed_seconds != null && <><dt>Processing time for this component</dt><dd>{report.elapsed_seconds} seconds</dd></>}
        {report.language && <><dt>Detected clip language</dt><dd>{report.language} · verify mixed-language segments manually</dd></>}
        {report.segments != null && <><dt>Transcript segments</dt><dd>{report.segments}</dd></>}
        {report.speakers != null && <><dt>Anonymous speaker clusters</dt><dd>{report.speakers} · estimated within this recording; no identity or role</dd><dt>Attributed transcript segments</dt><dd>{report.labeled_segments ?? 0} · changes and overlap may remain unknown</dd></>}
        {report.analyzed_windows != null && <><dt>Analyzed sound windows</dt><dd>{report.analyzed_windows} · {report.window_seconds} seconds per window</dd></>}
        {report.sampled_frames != null && <><dt>Sampling coverage</dt><dd>{report.sampled_frames} frames at {report.sample_hz} fps{report.frames_with_hands != null && <>; {report.frames_with_hands} with hands, {report.frames_with_poses} with poses</>}</dd></>}
        {report.version && <><dt>Model version</dt><dd>{report.version}</dd></>}
        {report.threshold != null && <><dt>Model score threshold</dt><dd>{report.threshold} · uncalibrated score</dd></>}
      </dl>{report.warnings?.length > 0 && <Notice tone="warning">{report.warnings.length} transcription segments have low model likelihood. Check the source before relying on their wording.</Notice>}
      <details className="analysis-manifest"><summary>Model identifiers and processing record</summary><pre>{JSON.stringify(report, null, 2)}</pre></details></> : <p>This component did not produce a result for this case. Missing analysis does not establish safety.</p>}
    </details>)}
  </div></Panel>;
}

export function PrivacyReview({ c, reload }: { c: Case; reload: () => void }) {
  const [show, setShow] = useState(false), [reason, setReason] = useState(''), [checked, setChecked] = useState(false);
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [decision, setDecision] = useState({ action: 'approve', version: c.version, reason: '' });
  const preview = c.evidence?.find(e => e.kind === 'face_preview');
  if (!preview) return null;
  const approved = c.privacy_status === 'faces_reviewed';
  async function save() {
    setBusy(true); setError('');
    try {
      await post(`/cases/${c.id}/privacy-review`, decision);
      setConfirm(false); setReason(''); setChecked(false); setShow(false); reload();
    } catch (e) { setError((e as Error).message); setConfirm(false); }
    finally { setBusy(false); }
  }
  return <Panel title="Privacy review" className="section-gap"><div className="privacy-review-body">
    <Notice tone="warning">{approved ? 'A reviewer released the masked copy to people who can already access this case.' : 'This selective face-masking copy is restricted to supervisors and administrators. Other users receive the fully blurred version.'} Face detection can miss people. Check every frame and any remaining identifiers before release. Audio stays muted.</Notice>
    <button className="button secondary" onClick={() => setShow(!show)} aria-expanded={show}>{show ? 'Close privacy preview' : 'Inspect masked copy'}</button>
    {show && <video className="privacy-preview" controls preload="metadata" aria-label="Restricted privacy preview" src={'/api/evidence/' + preview.id} onError={() => setError('Privacy preview could not load. Refresh the case and check access.')} />}
    <form onSubmit={e => { e.preventDefault(); setDecision({ action: approved ? 'revoke' : 'approve', version: c.version, reason }); setConfirm(true); }}>
      {!approved && <label className="checkbox-row"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} required />I reviewed the entire masked copy and its remaining identifying details.</label>}
      <label>Privacy review rationale<textarea required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Record coverage, remaining identifiers, and why release is appropriate—or why it must be withdrawn." /></label>
      {error && <ErrorPanel message={error} retry={reload} />}
      <button className="button secondary" disabled={busy || (!approved && !checked)}>{approved ? 'Return to full blur' : 'Review masked-copy release'}</button>
    </form>
    <Confirm open={confirm} title={decision.action === 'revoke' ? 'Withdraw the masked copy?' : 'Release this masked copy?'} label={decision.action === 'revoke' ? 'Return to full blur' : 'Release masked copy'} busy={busy} onClose={() => setConfirm(false)} onConfirm={save}>
      <p>{decision.reason}</p><p>{decision.action === 'revoke' ? 'Future requests by participants and responders will receive the fully blurred copy. Previously viewed content cannot be recalled.' : 'Existing authorized case viewers will be able to play the selectively masked video. This decision is attributed to you and recorded in the audit trail.'}</p>
    </Confirm>
  </div></Panel>;
}
