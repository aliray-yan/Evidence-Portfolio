import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { getAuthErrorMessage } from '../services/authErrors';
import AuthForm from '../components/AuthForm';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/profile');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <AuthForm
      title="Register"
      subtitle="Create an account to start saving favorites."
      submitLabel="Register"
      email={email}
      password={password}
      onEmailChange={(e) => setEmail(e.target.value)}
      onPasswordChange={(e) => setPassword(e.target.value)}
      onSubmit={handleSubmit}
      error={error}
      passwordAutoComplete="new-password"
    />
  );
}

export default RegisterPage;
