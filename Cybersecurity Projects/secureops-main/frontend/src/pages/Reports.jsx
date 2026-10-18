import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ReportBuilder from '../components/reports/ReportBuilder';
import ReportDashboard from '../components/reports/ReportDashboard';
import ScheduledReports from '../components/reports/ScheduledReports';
import Loading from '../components/common/Loading';
import { reportService } from '../services/reportService';

export default function Reports() {
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ['reports'], queryFn: reportService.list });
  const scheduled = useQuery({ queryKey: ['scheduled-reports'], queryFn: reportService.scheduled });
  const generate = useMutation({
    mutationFn: reportService.generate,
    onSuccess: () => {
      toast.success('Report generated');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    }
  });
  const download = async (report, format) => {
    const response = await reportService.download(report.id, format);
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${report.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">SOC summaries, threat reports, incident reports, and scheduled evidence.</p>
      </div>
      <ReportBuilder onGenerate={(payload) => generate.mutate(payload)} isLoading={generate.isPending} />
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Generated Reports</h2>
        {reports.isLoading ? <Loading label="Loading reports" /> : <ReportDashboard reports={reports.data || []} onDownload={download} />}
      </div>
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Scheduled Reports</h2>
        <ScheduledReports items={scheduled.data || []} />
      </div>
    </div>
  );
}
