import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export default function ResetPassword() {
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('As senhas não conferem.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Senha redefinida! Entre com a nova senha.');
      nav('/login', { replace: true });
    } catch (err) {
      toast.error(apiError(err, 'Link inválido ou expirado. Peça um novo.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-simple">
        <div className="auth-card">
          <h3>Link inválido</h3>
          <p className="muted">
            Este endereço não contém um código de redefinição. Peça um novo link
            na tela de recuperação de senha.
          </p>
          <Link to="/esqueci-senha" className="btn btn-primary btn-block btn-xl" style={{ marginTop: 18 }}>
            Pedir novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-simple">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-sent-icon"><KeyRound size={30} /></div>
        <h3>Criar nova senha</h3>
        <p className="muted">Escolha uma senha com pelo menos 6 caracteres.</p>

        <div className="field">
          <label>Nova senha</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Confirmar nova senha</label>
          <input
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <button className="btn btn-primary btn-block btn-xl" disabled={submitting} type="submit">
          {submitting ? 'Salvando…' : 'Redefinir senha'}
        </button>

        <Link to="/login" className="auth-back" style={{ marginTop: 16, display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Voltar ao login
        </Link>
      </form>
    </div>
  );
}
