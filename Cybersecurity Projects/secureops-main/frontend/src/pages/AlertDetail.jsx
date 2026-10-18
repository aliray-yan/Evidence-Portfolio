import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import AlertDetails from '../components/alerts/AlertDetails';
import AlertTimeline from '../components/alerts/AlertTimeline';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import { useAlert, useAlertMutations } from '../hooks/useAlerts';
import { alertService } from '../services/alertService';

export default function AlertDetail() {
  const { id } = useParams();
  const alert = useAlert(id);
  const timeline = useQuery({ queryKey: ['alert-timeline', id], queryFn: () => alertService.timeline(id), enabled: Boolean(id) });
  const mutations = useAlertMutations();
  if (alert.isLoading) return <Loading label="Loading alert" />;
  if (!alert.data) return null;
  return (
    <div className="space-y-6">
      <AlertDetails alert={alert.data} onEscalate={() => mutations.escalate.mutate({ id, comment: 'Escalated from analyst workbench.' })} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Raw Event</h2>
          <pre className="overflow-auto rounded bg-slate-950 p-4 text-xs text-slate-100">{alert.data.raw_log || 'No raw log stored.'}</pre>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Timeline</h2>
          <AlertTimeline items={timeline.data || []} />
        </Card>
      </div>
    </div>
  );
}
