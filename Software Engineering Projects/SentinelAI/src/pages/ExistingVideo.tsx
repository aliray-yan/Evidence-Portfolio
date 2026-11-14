import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Upload } from 'lucide-react';
import { api } from '../api';
import { ErrorPanel, Notice } from '../components';

export function ExistingVideo({ file, locked, choose }: { file: File | null; locked: boolean; choose: (file: File | null) => void }) {
  const [url, setUrl] = useState(''), [warning, setWarning] = useState('');
  useEffect(() => {
    setWarning('');
    if (!file) { setUrl(''); return; }
    const value = URL.createObjectURL(file); setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return <>
    <label className={'upload-zone ' + (file ? 'has-file' : '')} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!locked) choose(e.dataTransfer.files[0] || null); }}>
      {/* No capture attribute: Android must be able to choose an existing gallery/file video. */}
      <input type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={locked} onChange={e => { choose(e.target.files?.[0] || null); e.target.value = ''; }} aria-label="Choose evidence video"/>
      <span className="upload-symbol">{file ? <CheckCircle2 size={30}/> : <Upload size={30}/>}</span>
      <strong>{file ? file.name : 'Choose a video from your device'}</strong>
      <span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Tap to choose a different video` : 'On Android, select Files, Videos or Gallery. You can also drag a file here.'}</span>
      <small>MP4 or WebM · Up to 100 MB · Maximum 2 minutes</small>
    </label>
    {file && <div className="selected-video"><strong>Selected video preview</strong><video src={url || undefined} controls playsInline preload="metadata" aria-label="Selected video preview" onLoadedMetadata={e => {
      const duration = e.currentTarget.duration;
      setWarning(Number.isFinite(duration) && duration > 120.1 ? 'This video is longer than 2 minutes. Trim it before submitting; the server will reject an over-limit recording.' : '');
    }} onError={() => setWarning('This browser cannot preview the selected codec. The server will validate it after upload. If processing fails, export as H.264 MP4.')}/>
      <p className="field-help">This preview stays on your device until you submit. Check that you selected the intended recording.</p>
      <button type="button" className="text-link" disabled={locked} onClick={() => choose(null)}>Remove selected video</button>
      {warning && <Notice tone="warning">{warning}</Notice>}
    </div>}
  </>;
}

type TestVideo = { id: string; title: string; duration: number; bytes: number };
export function TestVideos() {
  const [items, setItems] = useState<TestVideo[] | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function load() {
    setBusy(true); setError('');
    try { setItems((await api<{ videos: TestVideo[] }>('/test-videos')).videos); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <details className="test-video-library" onToggle={e => { if (e.currentTarget.open && items === null && !busy) void load(); }}>
    <summary>Fresh videos for testing</summary>
    <p>Archived synthetic upload controls with generated voices and title-card video. Audio is no longer analyzed; these files test transfer and processing only, not visual exchange recognition. Download one, then choose it from your phone's Downloads folder.</p>
    {busy && <p role="status">Loading test videos…</p>}
    {error && <ErrorPanel message={error} retry={load}/>}
    {items?.length === 0 && <Notice>No test pack is installed or enabled on this server. Follow the mobile testing guide to prepare it.</Notice>}
    {!!items?.length && <ul>{items.map(v => <li key={v.id}><a href={'/api/test-videos/' + v.id} download><Download size={16} aria-hidden="true"/><span>{v.id} · {v.title}<small>{v.duration.toFixed(0)} seconds · {(v.bytes / 1024 / 1024).toFixed(1)} MB</small></span></a></li>)}</ul>}
  </details>;
}
