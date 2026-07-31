import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';

// Todas as demais páginas saem do bundle inicial e carregam sob demanda.
// Assim a landing pública (/lp) e o login abrem com o mínimo de JS possível —
// Recharts/Leaflet só são baixados por quem entra no painel.
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Supporters = lazy(() => import('./pages/Supporters.jsx'));
const Volunteers = lazy(() => import('./pages/Volunteers.jsx'));
const Import = lazy(() => import('./pages/Import.jsx'));
const Suspects = lazy(() => import('./pages/Suspects.jsx'));
const Blacklist = lazy(() => import('./pages/Blacklist.jsx'));
const Notices = lazy(() => import('./pages/Notices.jsx'));
const MediaKit = lazy(() => import('./pages/MediaKit.jsx'));
const Engagement = lazy(() => import('./pages/Engagement.jsx'));
const StreetActions = lazy(() => import('./pages/StreetActions.jsx'));
const Agenda = lazy(() => import('./pages/Agenda.jsx'));
const MaterialRequests = lazy(() => import('./pages/MaterialRequests.jsx'));
const Banners = lazy(() => import('./pages/Banners.jsx'));
const Conversations = lazy(() => import('./pages/Conversations.jsx'));
const Demands = lazy(() => import('./pages/Demands.jsx'));
const Broadcasts = lazy(() => import('./pages/Broadcasts.jsx'));
const Automations = lazy(() => import('./pages/Automations.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Landing = lazy(() => import('./pages/Landing.jsx'));
const DataDeletion = lazy(() => import('./pages/DataDeletion.jsx'));
const Rsvp = lazy(() => import('./pages/Rsvp.jsx'));
const MapView = lazy(() => import('./pages/MapView.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const TVPanel = lazy(() => import('./pages/TVPanel.jsx'));

const P = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

// Domínios do SITE público (www/apex): a landing ocupa a raiz "/".
// No domínio do sistema (app.airtonartus.com.br) a raiz continua sendo o Dashboard.
const SITE_HOSTS = ['www.airtonartus.com.br', 'airtonartus.com.br'];
const IS_SITE_HOST = typeof window !== 'undefined' && SITE_HOSTS.includes(window.location.hostname);

const lazyFallback = (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
    <div className="spinner" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={lazyFallback}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route path="/lp" element={<Landing />} />
      <Route path="/excluir-dados" element={<DataDeletion />} />
      <Route path="/convite/:token" element={<Rsvp />} />
      <Route path="/painel-tv" element={P(['LIDER', 'MEMBRO'], <TVPanel />)} />

      <Route path="/" element={IS_SITE_HOST ? <Landing /> : P(null, <Dashboard />)} />
      <Route path="/mapa" element={P(['LIDER', 'MEMBRO'], <MapView />)} />
      <Route path="/relatorios" element={P(['LIDER', 'MEMBRO'], <Reports />)} />

      <Route path="/apoiadores" element={P(['LIDER', 'MEMBRO'], <Supporters />)} />
      <Route path="/voluntarios" element={P(['LIDER', 'MEMBRO'], <Volunteers />)} />
      <Route path="/importar" element={P(['LIDER', 'MEMBRO'], <Import />)} />
      <Route path="/suspeitos" element={P(['LIDER'], <Suspects />)} />
      <Route path="/blacklist" element={P(['LIDER'], <Blacklist />)} />

      <Route path="/mural" element={P(null, <Notices />)} />
      <Route path="/midia-kit" element={P(null, <MediaKit />)} />
      <Route path="/tarefas" element={P(null, <Engagement />)} />
      <Route path="/acoes" element={P(['LIDER', 'MEMBRO'], <StreetActions />)} />
      <Route path="/agenda" element={P(null, <Agenda />)} />

      <Route path="/materiais" element={P(null, <MaterialRequests />)} />
      <Route path="/faixas" element={P(['LIDER', 'MEMBRO'], <Banners />)} />

      <Route path="/conversas" element={P(['LIDER', 'MEMBRO'], <Conversations />)} />
      <Route path="/demandas" element={P(['LIDER', 'MEMBRO'], <Demands />)} />
      <Route path="/disparos" element={P(['LIDER', 'MEMBRO'], <Broadcasts />)} />
      <Route path="/automacoes" element={P(['LIDER'], <Automations />)} />

      <Route path="/usuarios" element={P(['LIDER'], <Users />)} />
      <Route path="/configuracoes" element={P(['LIDER'], <Settings />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
