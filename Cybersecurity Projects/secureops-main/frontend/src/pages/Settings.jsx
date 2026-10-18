import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import APIConfiguration from '../components/settings/APIConfiguration';
import PriorityRules from '../components/settings/PriorityRules';
import SystemSettings from '../components/settings/SystemSettings';
import UserManagement from '../components/settings/UserManagement';
import Loading from '../components/common/Loading';
import { api, unwrap } from '../services/api';

export default function Settings() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then(unwrap) });
  const keys = useQuery({ queryKey: ['settings', 'api-keys'], queryFn: () => api.get('/settings/api-keys').then(unwrap) });
  const rules = useQuery({ queryKey: ['settings', 'priority-rules'], queryFn: () => api.get('/settings/priority-rules').then(unwrap) });
  const saveKeys = useMutation({
    mutationFn: (payload) => api.put('/settings/api-keys', payload).then(unwrap),
    onSuccess: (data) => {
      toast.success(data.message || 'API keys saved');
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['api-quota'] });
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Could not save API keys')
  });
  if (settings.isLoading) return <Loading label="Loading settings" />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">System configuration, API providers, users, and priority scoring rules.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SystemSettings settings={settings.data} />
        <APIConfiguration
          keys={keys.data?.providers || {}}
          envPath={keys.data?.env_path}
          onSave={(payload) => saveKeys.mutate(payload)}
          isSaving={saveKeys.isPending}
        />
      </div>
      <UserManagement />
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Priority Rules</h2>
        <PriorityRules rules={rules.data || []} />
      </div>
    </div>
  );
}
