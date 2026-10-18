import { useState } from 'react';
import AlertFilters from '../components/alerts/AlertFilters';
import AlertTable from '../components/alerts/AlertTable';
import Loading from '../components/common/Loading';
import Pagination from '../components/common/Pagination';
import { useAlerts } from '../hooks/useAlerts';

export default function Alerts() {
  const [filters, setFilters] = useState({ page: 1, page_size: 25 });
  const { data, isLoading } = useAlerts(filters);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Alerts</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Prioritized queue for triage, enrichment, assignment, and escalation.</p>
      </div>
      <AlertFilters filters={filters} onChange={(next) => setFilters((state) => ({ ...state, ...next, page: next.page || 1 }))} />
      {isLoading ? <Loading label="Loading alerts" /> : <AlertTable alerts={data?.items || []} />}
      <Pagination page={filters.page} pageSize={filters.page_size} total={data?.total || 0} onPageChange={(page) => setFilters((state) => ({ ...state, page }))} />
    </div>
  );
}
