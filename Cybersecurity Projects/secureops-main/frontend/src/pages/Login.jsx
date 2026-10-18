import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { session, login } = useAuth();
  const [email, setEmail] = useState('admin@secureops.local');
  const [password, setPassword] = useState('SecureOps!2026');

  useEffect(() => {
    if (session?.access_token) navigate('/');
  }, [session, navigate]);

  return (
    <div className="dark min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">SecureOps</h1>
            <p className="text-sm text-slate-400">SOC Analyst Workbench</p>
          </div>
        </div>
        <Card>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              login.mutate({ email, password });
            }}
          >
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            <Button className="w-full" type="submit" isLoading={login.isPending}>
              Sign in
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-xs text-slate-500">Seed login: admin@secureops.local / SecureOps!2026</p>
      </div>
    </div>
  );
}
