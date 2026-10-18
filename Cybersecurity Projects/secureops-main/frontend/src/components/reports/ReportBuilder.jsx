import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

export default function ReportBuilder({ onGenerate, isLoading }) {
  const [name, setName] = useState('Daily SOC Summary');
  const [type, setType] = useState('daily_summary');
  const [email, setEmail] = useState('');
  return (
    <form
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_220px_220px_140px]"
      onSubmit={(event) => {
        event.preventDefault();
        onGenerate({ name, type, parameters: {}, formats: ['json', 'csv', 'html', 'pdf'], email_recipients: email ? email.split(',').map((item) => item.trim()).filter(Boolean) : [] });
      }}
    >
      <Input value={name} onChange={(event) => setName(event.target.value)} />
      <Select value={type} onChange={(event) => setType(event.target.value)} options={['daily_summary', 'weekly_threat', 'monthly_executive', 'incident', 'custom']} />
      <Input placeholder="Email recipients" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button isLoading={isLoading}>Generate</Button>
    </form>
  );
}
