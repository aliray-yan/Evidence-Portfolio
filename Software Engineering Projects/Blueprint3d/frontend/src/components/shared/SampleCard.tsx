import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../api/projects';
import { stagePlan } from '../../utils/staging';
import { saveFloorPlan } from '../../api/floorPlans';
import type { Sample } from '../../data/samples';
import { Icon } from './Icon';
import { PlanIllustration } from './PlanIllustration';
export function SampleCard({ sample }: {
  sample: Sample;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function open() { setBusy(true); setError(''); try {
    const p = await createProject({ name: sample.name, description: sample.description });
    await saveFloorPlan(p.id, stagePlan(structuredClone(sample.plan)));
    navigate(`/projects/${p.id}/walkthrough`);
  }
  catch (e) {
    setError((e as Error).message);
    setBusy(false);
  } }
  return <article className="sample-card"><div className={`sample-card__preview sample-card__preview--${sample.id}`}><span className="sample-tag">{sample.tag}</span><PlanIllustration plan={sample.plan}/><span className="plan-badge">2D FLOOR PLAN</span></div><div className="sample-card__body"><h3>{sample.name}</h3><p>{sample.description}</p><div className="sample-card__facts"><span>{sample.plan.plot.width * sample.plan.plot.length} m²</span><span>{sample.beds} bedroom{sample.beds > 1 ? 's' : ''}</span><span>{sample.plan.rooms.length} spaces</span></div><button className="sample-card__open" onClick={open} disabled={busy}>{busy ? 'Opening…' : 'Explore in 3D'}<Icon name="arrow" size={17}/></button><div className="sample-downloads"><a href={`/samples/${sample.id}.png`} download><Icon name="download" size={12}/> PNG map</a><a href={`/samples/${sample.id}.json`} download>Plan JSON</a></div>{error && <p role="alert" className="error-message">{error}</p>}</div></article>;
}
