import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiError } from '../api/client.js';

// Acessos de demonstração — clicar entra direto no sistema com o papel escolhido.
const DEMO_ACCOUNTS = [
  { role: 'Líder da campanha', desc: 'Gestão total: apoiadores, mapa, metas, disparos e IA', email: 'admin@demo.com', password: 'Admin@123' },
  { role: 'Coordenador', desc: 'Membro de equipe — região, agenda e ações de rua', email: 'norte@demo.com', password: 'Admin@123' },
  { role: 'Parceiro', desc: 'Acesso parceiro — visão de apoio, sem gestão', email: 'parceiro@demo.com', password: 'Admin@123' },
  { role: 'Super Admin', desc: 'Dono da plataforma — gerencia todos os candidatos', email: 'super@plataforma.com', password: 'Super@123' },
];

export default function Login() {
  const { login, user, loading } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function doLogin(em, pw) {
    setSubmitting(true);
    try {
      await login(em, pw);
      toast.success('Bem-vindo à central da campanha!');
      nav('/');
    } catch (err) {
      toast.error(apiError(err, 'Não foi possível entrar. Verifique suas credenciais.'));
    } finally {
      setSubmitting(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    doLogin(email, password);
  }

  function quickLogin(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
    doLogin(acc.email, acc.password);
  }

  return (
    <div className="auth">
      {/* Painel visual — trabalhismo gaúcho: rosto do candidato + tricolor do RS */}
      <div className="auth-visual">
        <div className="auth-photo" />
        <div className="auth-duo" />
        <div className="auth-shade" />
        <div className="auth-grain" />
        <div className="auth-flag">
          <i className="g" />
          <i className="y" />
          <i className="r" />
        </div>
        <div className="auth-slash" />
        <div className="auth-content">
          <div className="auth-top">
            <div className="auth-name">PLATAFORMA DE CAMPANHA</div>
            <span className="auth-demo-badge">DEMO</span>
          </div>
          <div>
            <h1 className="auth-headline">
              A central de <em>comando</em>
              <br />
              da sua campanha
            </h1>
            <p className="auth-tagline">
              A central de comando da campanha. Mobilização, dados, atendimento e território — numa só
              plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="auth-form-side">
        <form className="auth-card" onSubmit={submit}>
          <h3>Acessar plataforma</h3>
          <p className="muted">Entre com suas credenciais da campanha.</p>

          <div className="field">
            <label>E-mail</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Senha</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button className="btn btn-primary btn-block btn-xl" disabled={submitting} type="submit">
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="auth-demo-access">
            <div className="auth-demo-head">Acessos de demonstração <span>clique para entrar</span></div>
            <div className="auth-demo-grid">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  className="auth-demo-acc"
                  onClick={() => quickLogin(a)}
                  disabled={submitting}
                >
                  <b>{a.role}</b>
                  <small>{a.desc}</small>
                  <span className="mail">{a.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="auth-links">
            <Link to="/esqueci-senha" className="auth-back">Esqueci minha senha</Link>
            <Link to="/lp" className="auth-back">
              <ArrowLeft size={14} /> Conhecer a campanha
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
