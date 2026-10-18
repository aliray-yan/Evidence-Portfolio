import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import CaseDetails from '../components/cases/CaseDetails';
import CaseTimeline from '../components/cases/CaseTimeline';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import { useCase } from '../hooks/useCases';
import { caseService } from '../services/caseService';

export default function CaseDetail() {
  const { id } = useParams();
  const item = useCase(id);
  const timeline = useQuery({ queryKey: ['case-timeline', id], queryFn: () => caseService.timeline(id), enabled: Boolean(id) });
  const alerts = useQuery({ queryKey: ['case-alerts', id], queryFn: () => caseService.alerts(id), enabled: Boolean(id) });
  if (item.isLoading) return <Loading label="Loading case" />;
  if (!item.data) return null;
  return (
    <div className="space-y-6">
      <CaseDetails item={item.data} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Linked Alerts</h2>
          <Table
            data={alerts.data || []}
            columns={[
              { key: 'title', header: 'Alert' },
              { key: 'severity', header: 'Severity', render: (row) => <Badge value={row.severity} type="severity" /> },
              { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
              { key: 'priority_score', header: 'Priority' }
            ]}
          />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Timeline</h2>
          <CaseTimeline items={timeline.data || []} />
        </Card>
      </div>
    </div>
  );
}
