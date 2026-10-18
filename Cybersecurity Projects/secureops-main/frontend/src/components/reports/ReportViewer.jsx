import Card from '../common/Card';

export default function ReportViewer({ report }) {
  if (!report) return null;
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{report.name}</h2>
      <pre className="mt-4 overflow-auto rounded bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(report.parameters, null, 2)}</pre>
    </Card>
  );
}
