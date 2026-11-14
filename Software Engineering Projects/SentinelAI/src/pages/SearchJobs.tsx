import { Link } from 'react-router-dom';
import { Empty, Panel, Status } from '../components';
import { dateTime } from '../types';

type Job = { case_id: string; title: string; status: string; processed: number; total: number; error_code: string | null; updated_at: string };
export function SearchJobs({ jobs }: { jobs: Job[] }) {
  return <Panel title="Evidence search indexes" className="section-gap">
    {jobs.length ? <div className="table-scroll"><table><thead><tr><th>Case</th><th>Index status</th><th>Excerpts</th><th>Last update</th><th>Diagnostic</th></tr></thead>
      <tbody>{jobs.map(j => <tr key={j.case_id}><td><Link className="case-title" to={'/cases/' + j.case_id}>{j.title}</Link></td><td><Status value={j.status}/></td><td>{j.processed} / {j.total}</td><td>{dateTime(j.updated_at)}</td><td>{j.error_code ? `${j.error_code} · verify local model files/runtime, then retry from the case summary.` : 'No error recorded'}</td></tr>)}</tbody></table></div>
      : <Empty title="No semantic indexes prepared">Prepare semantic search in a case's Evidence summary tab. Exact-word search does not need an index.</Empty>}
  </Panel>;
}
