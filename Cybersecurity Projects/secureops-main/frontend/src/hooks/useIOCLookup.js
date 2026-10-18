import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { threatIntelService } from '../services/threatIntelService';

export function useIOCLookup() {
  return useMutation({
    mutationFn: threatIntelService.lookup,
    onError: () => toast.error('IOC lookup failed')
  });
}

export function useIOCHistory() {
  return useQuery({
    queryKey: ['ioc-history'],
    queryFn: threatIntelService.history
  });
}

export function useAPIQuota() {
  return useQuery({
    queryKey: ['api-quota'],
    queryFn: threatIntelService.quota
  });
}
