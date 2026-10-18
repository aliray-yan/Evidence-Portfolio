import { useQuery } from '@tanstack/react-query';
import { caseService } from '../services/caseService';

export function useCases(params) {
  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => caseService.list(params)
  });
}

export function useCaseBoard() {
  return useQuery({
    queryKey: ['case-board'],
    queryFn: () => caseService.board()
  });
}

export function useCase(id) {
  return useQuery({
    queryKey: ['case', id],
    queryFn: () => caseService.get(id),
    enabled: Boolean(id)
  });
}
