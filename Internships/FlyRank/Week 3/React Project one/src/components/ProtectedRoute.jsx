import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner label="Loading..." />;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
