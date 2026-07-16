import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import { can } from '../lib/permissions.js';
import { isNativeApp } from '../lib/push.js';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingBox label="Carregando sua sessão..." />
      </div>
    );
  }
  // No app das lojas a porta de entrada é a experiência PÚBLICA (landing,
  // cadastro de apoiador) — app que abre direto em login é rejeitado como
  // "distribuição privada". O login da equipe fica a um toque em "Entrar".
  if (!user) return <Navigate to={isNativeApp() ? '/lp' : '/login'} replace />;
  if (roles && !can(user, roles)) return <Navigate to="/" replace />;
  return children;
}
