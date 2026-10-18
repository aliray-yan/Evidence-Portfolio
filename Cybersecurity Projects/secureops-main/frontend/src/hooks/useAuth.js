import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { session, setSession, clearSession } = useAuthStore();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: authService.me,
    enabled: Boolean(session?.access_token)
  });
  const login = useMutation({
    mutationFn: ({ email, password }) => authService.login(email, password),
    onSuccess: (data) => {
      setSession(data);
      toast.success('Signed in');
    },
    onError: (error) => {
      if (!error.response) {
        toast.error('Cannot reach SecureOps API. Check that the backend is running on port 8000.');
        return;
      }
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    }
  });
  const logout = useMutation({
    mutationFn: () => authService.logout(session?.refresh_token),
    onSettled: () => clearSession()
  });
  return { session, user: me.data || session?.user, login, logout, clearSession };
}
