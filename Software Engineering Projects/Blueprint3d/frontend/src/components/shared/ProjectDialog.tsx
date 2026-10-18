import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../api/projects';
import { Icon } from './Icon';
export function ProjectDialog({ onClose }: {
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  useEffect(() => { const d = dialog.current; d?.showModal(); return () => d?.close(); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); if (!name.trim())
    return; setBusy(true); try {
    const p = await createProject({ name: name.trim(), description: description.trim() });
    navigate(`/projects/${p.id}`);
  }
  catch (e) {
    setError((e as Error).message);
    setBusy(false);
  } }
  return <dialog ref={dialog} className="modal" onCancel={e => { e.preventDefault(); if (!busy)
    onClose(); }}><button className="modal-close" aria-label="Close" onClick={onClose} disabled={busy}><Icon name="close"/></button><h2>A new beginning.</h2><p>Give your home a name, then bring in its floor plan.</p><form onSubmit={submit}><label>Project name<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Our family home"/></label><label>A few words about it <span>(optional)</span><input value={description} maxLength={500} onChange={e => setDescription(e.target.value)} placeholder="A sunny home with room for everyone"/></label>{error && <p role="alert" className="error-message">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Creating…' : 'Create project'}<Icon name="arrow" size={16}/></button></div></form></dialog>;
}
