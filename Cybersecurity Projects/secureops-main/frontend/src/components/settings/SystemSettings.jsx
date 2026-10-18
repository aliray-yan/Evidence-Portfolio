import Card from '../common/Card';

export default function SystemSettings({ settings }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">System Settings</h2>
      <pre className="mt-4 overflow-auto rounded bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(settings, null, 2)}</pre>
    </Card>
  );
}
