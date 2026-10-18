import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Textarea from '../common/Textarea';

export default function CaseForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', priority: 3, category: 'General' });
  const update = (field, value) => setForm((state) => ({ ...state, [field]: value }));
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <Input label="Title" value={form.title} onChange={(event) => update('title', event.target.value)} required />
      <Textarea label="Description" value={form.description} onChange={(event) => update('description', event.target.value)} required />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Severity" value={form.severity} onChange={(event) => update('severity', event.target.value)} options={['critical', 'high', 'medium', 'low']} />
        <Input label="Priority" type="number" min="1" max="5" value={form.priority} onChange={(event) => update('priority', Number(event.target.value))} />
        <Input label="Category" value={form.category} onChange={(event) => update('category', event.target.value)} />
      </div>
      <Button type="submit" isLoading={isLoading}>
        Create case
      </Button>
    </form>
  );
}
