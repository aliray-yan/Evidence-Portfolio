import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { alertService } from '../services/alertService';

export function useAlerts(params) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertService.list(params)
  });
}

export function useAlert(id) {
  return useQuery({
    queryKey: ['alert', id],
    queryFn: () => alertService.get(id),
    enabled: Boolean(id)
  });
}

export function useAlertMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['alert'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    update: useMutation({ mutationFn: ({ id, payload }) => alertService.update(id, payload), onSuccess: invalidate }),
    escalate: useMutation({
      mutationFn: ({ id, comment }) => alertService.escalate(id, comment),
      onSuccess: () => {
        toast.success('Alert escalated');
        invalidate();
      }
    }),
    bulkAction: useMutation({
      mutationFn: alertService.bulkAction,
      onSuccess: () => {
        toast.success('Bulk action applied');
        invalidate();
      }
    })
  };
}
