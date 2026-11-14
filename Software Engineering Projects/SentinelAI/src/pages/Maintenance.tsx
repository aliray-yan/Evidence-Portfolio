import { useEffect, useState } from 'react';
import { api } from '../api';
import { Confirm, ErrorPanel, Panel, Skeleton, useResource } from '../components';

export default function Maintenance() {
  const { data, error, loading, reload } = useResource('/admin/settings');
  const [enabled, setEnabled] = useState(false), [hours, setHours] = useState(24), [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [failure, setFailure] = useState('');
  useEffect(() => { if (data?.maintenance) { setEnabled(data.maintenance.value.retention_enabled); setHours(data.maintenance.value.interval_hours); } }, [data]);
  async function save() {
    setBusy(true); setFailure('');
    try { await api('/admin/settings/maintenance', { method: 'PUT', body: JSON.stringify({ value: { retention_enabled: enabled, interval_hours: hours }, version: data.maintenance.version, reason }) }); setConfirm(false); setReason(''); reload(); }
    catch (e) { setFailure((e as Error).message); setConfirm(false); }
    finally { setBusy(false); }
  }
  return <Panel title="Scheduled retention" className="section-gap">{error ? <ErrorPanel message={error} retry={reload} /> : loading ? <Skeleton /> : <form className="admin-form" onSubmit={e => { e.preventDefault(); setConfirm(true); }}>
    <p>When enabled, the server deletes expired cases and quarantined sources using the retention policy above. Legal holds are respected. Checks run between processing jobs while the worker is running.</p>
    <label className="checkbox-row"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Enable scheduled deletion</label>
    <label>Hours between runs<input type="number" min={1} max={168} required value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
    {data?.maintenance_state && <p className="field-help">Last run: {new Date(data.maintenance_state.value.last_retention_at).toLocaleString()} · {data.maintenance_state.value.deleted_cases} cases deleted</p>}
    <label>Reason for schedule change<input required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {failure && <ErrorPanel message={failure} retry={reload} />}
    <button className="button secondary" disabled={busy}>Review retention schedule</button>
    <Confirm open={confirm} title={enabled ? 'Enable scheduled deletion?' : 'Disable scheduled deletion?'} label="Save schedule" busy={busy} onClose={() => setConfirm(false)} onConfirm={save}>
      <p>{reason}</p><p>{enabled ? 'An overdue run may start as soon as the worker becomes idle. Eligible evidence is permanently deleted; preview the current retention candidates before enabling.' : 'Automatic case retention stops. Manual administrator runs remain available.'}</p>
    </Confirm>
  </form>}</Panel>;
}
