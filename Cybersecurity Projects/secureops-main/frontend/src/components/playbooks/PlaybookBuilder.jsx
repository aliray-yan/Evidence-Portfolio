import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import Select from '../common/Select';
import Textarea from '../common/Textarea';

const AUTOMATION_ACTIONS = [
  { value: 'summarize_alert', label: 'Summarize alert' },
  { value: 'extract_edr_context', label: 'Extract EDR context' },
  { value: 'enrich_alert_iocs', label: 'Enrich alert IOCs' },
  { value: 'add_alert_comment', label: 'Add alert comment' },
  { value: 'set_alert_status', label: 'Set alert status' },
  { value: 'create_case_task', label: 'Create case task' }
];

const ALERT_STATUSES = ['new', 'in_progress', 'investigating', 'escalated', 'resolved', 'false_positive', 'closed'];

function normalizeSteps(steps = []) {
  return [...steps]
    .sort((a, b) => a.step_number - b.step_number)
    .map((step, index) => ({
      step_number: index + 1,
      title: step.title || '',
      description: step.description || '',
      step_type: step.step_type || 'manual',
      is_required: step.is_required ?? true,
      automation_config: step.automation_config || {},
      expected_duration_minutes: step.expected_duration_minutes || 15,
      parent_step_id: step.parent_step_id || null,
      branch_condition: step.branch_condition || null
    }));
}

export default function PlaybookBuilder({ playbooks = [], onSave, isSaving }) {
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  const selected = useMemo(() => playbooks.find((item) => item.id === selectedId) || playbooks[0], [playbooks, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setDraft({
      name: selected.name,
      description: selected.description,
      category: selected.category,
      trigger_conditions: selected.trigger_conditions || {},
      is_active: selected.is_active,
      steps: normalizeSteps(selected.steps)
    });
  }, [selected?.id]);

  const updateDraft = (field, value) => setDraft((state) => ({ ...state, [field]: value }));
  const updateStep = (index, field, value) =>
    setDraft((state) => ({
      ...state,
      steps: state.steps.map((step, stepIndex) => {
        if (stepIndex !== index) return step;
        const next = { ...step, [field]: value };
        if (field === 'step_type' && value === 'automated' && !next.automation_config?.action) {
          next.automation_config = { ...(next.automation_config || {}), action: 'summarize_alert' };
        }
        return next;
      })
    }));

  const updateAutomationConfig = (index, field, value) =>
    setDraft((state) => ({
      ...state,
      steps: state.steps.map((step, stepIndex) =>
        stepIndex === index
          ? {
              ...step,
              automation_config: {
                ...(step.automation_config || {}),
                [field]: value
              }
            }
          : step
      )
    }));

  const addStep = () =>
    setDraft((state) => ({
      ...state,
      steps: [
        ...state.steps,
        {
          step_number: state.steps.length + 1,
          title: 'New response step',
          description: 'Describe the analyst action or automation.',
          step_type: 'manual',
          is_required: true,
          automation_config: {},
          expected_duration_minutes: 15,
          parent_step_id: null,
          branch_condition: null
        }
      ]
    }));

  const removeStep = (index) =>
    setDraft((state) => ({
      ...state,
      steps: state.steps.filter((_, stepIndex) => stepIndex !== index).map((step, stepIndex) => ({ ...step, step_number: stepIndex + 1 }))
    }));

  const moveStep = (from, to) => {
    if (from === null || to === null || from === to) return;
    setDraft((state) => {
      const next = [...state.steps];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...state, steps: next.map((step, index) => ({ ...step, step_number: index + 1 })) };
    });
  };

  if (!playbooks.length || !draft) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Playbook Builder</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No playbooks are available yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Playbook Builder</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Drag steps to reorder, edit the workflow, then save a new version.</p>
        </div>
        <Button icon={Save} isLoading={isSaving} onClick={() => onSave(selected.id, { ...draft, steps: normalizeSteps(draft.steps) })}>
          Save workflow
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Select
            label="Playbook"
            value={selected.id}
            onChange={(event) => setSelectedId(event.target.value)}
            options={playbooks.map((item) => ({ value: item.id, label: item.name }))}
          />
          <Input label="Name" value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} />
          <Textarea label="Description" value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} />
          <Input label="Category" value={draft.category} onChange={(event) => updateDraft('category', event.target.value)} />
          <Button variant="secondary" icon={Plus} onClick={addStep}>
            Add step
          </Button>
        </div>

        <div className="space-y-3">
          {draft.steps.map((step, index) => (
            <div
              key={`${step.step_number}-${step.title}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                moveStep(dragIndex, index);
                setDragIndex(null);
              }}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500/50"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 cursor-grab items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <GripVertical className="h-5 w-5" />
                </div>
                <span className="font-mono text-sm text-slate-500 dark:text-slate-400">Step {index + 1}</span>
                <Button variant="ghost" icon={Trash2} className="ml-auto h-9 w-9 px-0 text-red-600 dark:text-red-300" onClick={() => removeStep(index)} aria-label="Remove step" />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_160px_120px]">
                <Input value={step.title} onChange={(event) => updateStep(index, 'title', event.target.value)} />
                <Select value={step.step_type} onChange={(event) => updateStep(index, 'step_type', event.target.value)} options={['manual', 'automated', 'decision']} />
                <Input type="number" min="1" value={step.expected_duration_minutes} onChange={(event) => updateStep(index, 'expected_duration_minutes', Number(event.target.value))} />
              </div>
              <Textarea className="mt-3" value={step.description} onChange={(event) => updateStep(index, 'description', event.target.value)} />
              {step.step_type === 'decision' ? (
                <Input className="mt-3" placeholder="Branch condition" value={step.branch_condition || ''} onChange={(event) => updateStep(index, 'branch_condition', event.target.value)} />
              ) : null}
              {step.step_type === 'automated' ? (
                <div className="mt-3 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <Select
                    label="Automation"
                    value={step.automation_config?.action || 'summarize_alert'}
                    onChange={(event) => updateAutomationConfig(index, 'action', event.target.value)}
                    options={AUTOMATION_ACTIONS}
                  />
                  {step.automation_config?.action === 'enrich_alert_iocs' ? (
                    <Input
                      label="IOC limit"
                      type="number"
                      min="1"
                      max="25"
                      value={step.automation_config?.limit || 5}
                      onChange={(event) => updateAutomationConfig(index, 'limit', Number(event.target.value))}
                    />
                  ) : null}
                  {step.automation_config?.action === 'set_alert_status' ? (
                    <Select
                      label="Alert status"
                      value={step.automation_config?.status || 'investigating'}
                      onChange={(event) => updateAutomationConfig(index, 'status', event.target.value)}
                      options={ALERT_STATUSES}
                    />
                  ) : null}
                  {step.automation_config?.action === 'add_alert_comment' ? (
                    <Textarea
                      label="Comment"
                      value={step.automation_config?.comment || 'Playbook automation completed for {alert_title}.'}
                      onChange={(event) => updateAutomationConfig(index, 'comment', event.target.value)}
                    />
                  ) : null}
                  {step.automation_config?.action === 'create_case_task' ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input label="Task title" value={step.automation_config?.title || step.title} onChange={(event) => updateAutomationConfig(index, 'title', event.target.value)} />
                      <Input label="Task detail" value={step.automation_config?.description || step.description} onChange={(event) => updateAutomationConfig(index, 'description', event.target.value)} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
