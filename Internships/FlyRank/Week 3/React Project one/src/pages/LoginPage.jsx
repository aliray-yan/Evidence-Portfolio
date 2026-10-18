import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { getAuthErrorMessage } from '../services/authErrors';
import AuthForm from '../components/AuthForm';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const from = location.state?.from;
      navigate(from ? `${from.pathname}${from.search || ''}` : '/profile', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <AuthForm
      title="Login"
      subtitle="Welcome back — sign in to manage your favorites."
      submitLabel="Login"
      email={email}
      password={password}
      onEmailChange={(e) => setEmail(e.target.value)}
      onPasswordChange={(e) => setPassword(e.target.value)}
      onSubmit={handleSubmit}
      error={error}
      passwordAutoComplete="current-password"
    />
  );
}

export default LoginPage;
