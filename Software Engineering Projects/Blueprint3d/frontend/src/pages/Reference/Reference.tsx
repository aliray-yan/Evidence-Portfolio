import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../api/projects';
import { saveFloorPlan } from '../../api/floorPlans';
import { uploadBlueprint } from '../../api/blueprints';
import { assertFloorPlan } from '../../utils/planValidation';
import { stagePlan } from '../../utils/staging';
import { Icon } from '../../components/shared/Icon';
import '../../pages/Dashboard/Dashboard.css';
export function Reference() {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const navigate=useNavigate();
  async function open(){setBusy(true);setError('');try{const raw:unknown=await (await fetch('/reference/map1-retraced.json')).json();assertFloorPlan(raw);const project=await createProject({name:'Your architectural plan · map1',description:'Retraced layout based on the supplied drawing, with printed dimensions and editable components.'});const blob=await (await fetch('/reference/map1.png')).blob();const blueprint=await uploadBlueprint(project.id,new File([blob],'map1.png',{type:'image/png'}));raw.metadata.sourceBlueprintId=blueprint.id;await saveFloorPlan(project.id,stagePlan(raw));navigate('/projects/'+project.id+'/walkthrough');}catch(e){setError((e as Error).message);setBusy(false);}}
  return <div><div className="page-heading"><div><span className="tiny-label">YOUR ARCHITECTURAL DRAWING</span><h1>The right layout comes first.</h1><p>A reference retrace of your supplied map, alongside the original drawing.</p></div><a className="secondary-button" href="/reference/map1-retraced.json" download><Icon name="download" size={16}/>Download editable plan</a></div>
    <div className="reference-layout"><div className="reference-sheet"><img src="/reference/map1.png" alt="The architectural blueprint supplied by you: master bedroom, kitchen, TV lounge, drawing room, car porch and driveway."/></div><div className="reference-copy"><span className="tiny-label">FROM YOUR IMAGE</span><h2>Bedrooms, porch, stairs.<br/>With the details kept separate.</h2><p>The reference uses the drawing’s readable room dimensions: bedroom 21′ × 15′, kitchen 13′ × 14′9″, drawing room 13′ × 19′ and car porch 18′6″ × 18′3″.</p><p><strong>This is a human retrace, not an automatic detection result.</strong> The small plot-width fraction, curved and unlabelled boundaries, door widths, stair rise and double-height ceiling need your review.</p><p>Windows and furniture are proposed. Each one can be selected, changed or removed independently.</p><div className="reference-facts"><span>40′1½″ × 70′ interpreted plot</span><span>272.25 sq ft per marla</span><span>16 named spaces</span></div><button className="primary-button" onClick={open} disabled={busy}>{busy?'Opening your plan…':'Open retraced project'}<Icon name="arrow" size={16}/></button><p className="reference-note">To test the updated detector itself, create a separate project, upload map1.png, choose Dimension-aware analysis, and review its readings against this reference.</p>{error&&<p className="error-message" role="alert">{error}</p>}</div></div>
  </div>;
}
