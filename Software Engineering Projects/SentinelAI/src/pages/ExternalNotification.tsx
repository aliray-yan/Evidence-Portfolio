import { useState } from 'react';
import { Confirm, ErrorPanel } from '../components';
import { post } from '../api';

export default function ExternalNotification({ alert, delivery, onSent }: { alert: any; delivery: any; onSent: () => void }) {
  const [reason, setReason] = useState(''), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!delivery?.enabled || alert.synthetic || alert.test_recording || alert.status === 'resolved') return null;
  async function send() {
    setBusy(true); setError('');
    try { const result = await post(`/alerts/${alert.id}/notify`, { reason }); setConfirm(false); if (result.status === 'accepted_by_provider') onSent(); else setError(result.detail); }
    catch (e) { setError((e as Error).message); setConfirm(false); }
    finally { setBusy(false); }
  }
  return <form className="external-notification" onSubmit={e => { e.preventDefault(); setConfirm(true); }}>
    <h4>Configured external provider</h4><p className="field-help">Sends only case/alert identifiers, severity and event time to the configured HTTPS gateway. Provider acceptance does not confirm recipient delivery or emergency dispatch.</p>
    <label>Notification rationale<textarea required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {error && <ErrorPanel message={error} />}
    <button className="button secondary" disabled={busy}>Review external notification</button>
    <Confirm open={confirm} title="Send to the configured provider?" label="Send notification" busy={busy} onClose={() => setConfirm(false)} onConfirm={send}><p>{reason}</p><p>This sends identifiers outside SentinelAI. Check the response log for provider acceptance; receipt by a person is not confirmed.</p></Confirm>
  </form>;
}
