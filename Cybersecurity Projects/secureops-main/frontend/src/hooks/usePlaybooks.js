import { useQuery } from '@tanstack/react-query';
import { playbookService } from '../services/playbookService';

export function usePlaybooks() {
  return useQuery({
    queryKey: ['playbooks'],
    queryFn: playbookService.list
  });
}
