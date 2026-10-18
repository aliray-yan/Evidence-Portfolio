import { Activity, AlertTriangle, Clock, ShieldCheck, TicketCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AlertTrendChart from '../components/dashboard/AlertTrendChart';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import SeverityPieChart from '../components/dashboard/SeverityPieChart';
import StatsCard from '../components/dashboard/StatsCard';
import TopThreatsWidget from '../components/dashboard/TopThreatsWidget';
import Loading from '../components/common/Loading';
import { reportService } from '../services/reportService';
import { numberCompact, percent } from '../utils/formatters';

export default function Dashboard() {
  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: reportService.dashboardStats });
  const trend = useQuery({ queryKey: ['dashboard', 'trend'], queryFn: () => reportService.alertsTrend(14) });
  const recent = useQuery({ queryKey: ['dashboard', 'recent'], queryFn: reportService.recentAlerts });
  const threats = useQuery({ queryKey: ['dashboard', 'threats'], queryFn: reportService.topThreats });
  const deep = useQuery({ queryKey: ['dashboard', 'deep'], queryFn: reportService.deepAnalytics });

  if (stats.isLoading) return <Loading label="Loading dashboard" />;
  const data = stats.data || {};
  const alertData = data.alerts || {};
  const caseData = data.cases || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live operational posture across alerts, cases, and response performance.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard title="Alerts 24h" value={numberCompact(alertData.total_24h)} detail={`${numberCompact(alertData.total_7d)} in 7 days`} icon={AlertTriangle} tone="text-orange-600 dark:text-orange-300" />
        <StatsCard title="Open cases" value={numberCompact(caseData.open)} detail={`${numberCompact(caseData.closed)} closed`} icon={TicketCheck} tone="text-indigo-600 dark:text-indigo-300" />
        <StatsCard title="MTTR" value={`${data.mttr_minutes || 0}m`} detail="Mean response time" icon={Clock} />
        <StatsCard title="SLA compliance" value={percent(data.sla_compliance_rate)} detail={`${caseData.sla_breached || 0} breached`} icon={ShieldCheck} tone="text-green-600 dark:text-green-300" />
        <StatsCard title="Conversion" value={percent(data.alert_to_case_conversion_rate)} detail="Alerts to cases" icon={Activity} tone="text-cyan-600 dark:text-cyan-300" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AlertTrendChart data={trend.data || []} />
        <SeverityPieChart data={alertData.severity_breakdown || {}} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <RecentAlerts alerts={recent.data || []} />
        <TopThreatsWidget data={threats.data || []} />
      </div>
      <AnalyticsPanel data={deep.data} />
    </div>
  );
}
