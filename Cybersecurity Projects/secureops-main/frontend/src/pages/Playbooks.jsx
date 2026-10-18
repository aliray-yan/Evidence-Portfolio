import Loading from '../components/common/Loading';
import PlaybookBuilder from '../components/playbooks/PlaybookBuilder';
import PlaybookList from '../components/playbooks/PlaybookList';
import PlaybookStats from '../components/playbooks/PlaybookStats';
import { usePlaybooks } from '../hooks/usePlaybooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { playbookService } from '../services/playbookService';

export default function Playbooks() {
  const queryClient = useQueryClient();
  const playbooks = usePlaybooks();
  const update = useMutation({
    mutationFn: ({ id, payload }) => playbookService.update(id, payload),
    onSuccess: () => {
      toast.success('Playbook saved');
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Could not save playbook')
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Playbooks</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Structured investigation and response workflows for repeatable SOC operations.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <PlaybookStats count={playbooks.data?.length || 0} />
      </div>
      <PlaybookBuilder playbooks={playbooks.data || []} onSave={(id, payload) => update.mutate({ id, payload })} isSaving={update.isPending} />
      {playbooks.isLoading ? <Loading label="Loading playbooks" /> : <PlaybookList playbooks={playbooks.data || []} />}
    </div>
  );
}
