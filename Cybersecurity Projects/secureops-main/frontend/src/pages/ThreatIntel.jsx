import { useMutation } from '@tanstack/react-query';
import APIQuotaWidget from '../components/threatintel/APIQuotaWidget';
import BulkEnrichment from '../components/threatintel/BulkEnrichment';
import EnrichmentHistory from '../components/threatintel/EnrichmentHistory';
import IOCLookup from '../components/threatintel/IOCLookup';
import IOCResults from '../components/threatintel/IOCResults';
import Card from '../components/common/Card';
import { useAPIQuota, useIOCHistory, useIOCLookup } from '../hooks/useIOCLookup';
import { threatIntelService } from '../services/threatIntelService';

export default function ThreatIntel() {
  const lookup = useIOCLookup();
  const history = useIOCHistory();
  const quota = useAPIQuota();
  const bulk = useMutation({ mutationFn: (iocs) => threatIntelService.bulk({ iocs }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Threat Intel</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">IOC enrichment with local cache, quota awareness, and unified risk scoring.</p>
      </div>
      <IOCLookup onLookup={(payload) => lookup.mutate(payload)} isLoading={lookup.isPending} />
      <IOCResults result={lookup.data} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Bulk Enrichment</h2>
          <BulkEnrichment onBulk={(iocs) => bulk.mutate(iocs)} isLoading={bulk.isPending} />
          {bulk.data ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{bulk.data.total} IOCs enriched.</p> : null}
        </Card>
        <APIQuotaWidget quotas={quota.data || []} />
      </div>
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Lookup History</h2>
        <EnrichmentHistory items={history.data || []} />
      </div>
    </div>
  );
}
