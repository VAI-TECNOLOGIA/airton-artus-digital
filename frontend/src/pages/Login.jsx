import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiError } from '../api/client.js';

export default function Login() {
  const { login, user, loading } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Bem-vindo à central da pré-campanha!');
      nav('/');
    } catch (err) {
      toast.error(apiError(err, 'Não foi possível entrar. Verifique suas credenciais.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      {/* Painel visual — identidade Airton Artus: foto real + faixa tricolor do RS */}
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
            <img src="/logo-horizontal-branco.png" alt="Airton Artus — Deputado Estadual" style={{ height: 42, width: 'auto', display: 'block' }} />
          </div>
          <div>
            <h1 className="auth-headline">
              A central de <em>comando</em>
              <br />
              da pré-campanha
            </h1>
            <p className="auth-tagline">
              Mobilização, dados, atendimento e território — a pré-campanha de Airton Artus
              numa só plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="auth-form-side">
        <form className="auth-card" onSubmit={submit}>
          <h3>Acessar plataforma</h3>
          <p className="muted">Entre com suas credenciais da equipe.</p>

          <div className="field">
            <label htmlFor="login-email">E-mail ou telefone</label>
            <input id="login-email" className="input" type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu e-mail ou telefone" />
          </div>
          <div className="field">
            <label htmlFor="login-password">Senha</label>
            <input id="login-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button className="btn btn-primary btn-block btn-xl" disabled={submitting} type="submit">
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="muted" style={{ textAlign: 'center', margin: '14px 0 8px' }}>Ainda não tem conta?</p>
          <Link to="/criar-conta" className="btn btn-block btn-xl" style={{ display: 'flex', justifyContent: 'center' }}>
            Criar conta
          </Link>

          <div className="auth-links">
            <Link to="/esqueci-senha" className="auth-back">Esqueci minha senha</Link>
            <Link to="/lp" className="auth-back">
              <ArrowLeft size={14} /> Conhecer a pré-campanha
            </Link>
          </div>

          <p className="auth-legal">
            <a href="/legal/politica-de-privacidade.html" target="_blank" rel="noopener noreferrer">Privacidade</a>
            {' · '}
            <a href="/legal/termos-de-uso.html" target="_blank" rel="noopener noreferrer">Termos de Uso</a>
            {' · '}
            <a href="/legal/excluir-conta.html" target="_blank" rel="noopener noreferrer">Excluir conta</a>
          </p>
        </form>
      </div>
    </div>
  );
}
