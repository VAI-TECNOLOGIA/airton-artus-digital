import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import { can } from '../lib/permissions.js';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingBox label="Carregando sua sessão..." />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !can(user, roles)) return <Navigate to="/" replace />;
  return children;
}
