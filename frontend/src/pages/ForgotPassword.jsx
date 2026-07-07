import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(apiError(err, 'Não foi possível enviar. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-simple">
      <form className="auth-card" onSubmit={submit}>
        {sent ? (
          <>
            <div className="auth-sent-icon"><MailCheck size={30} /></div>
            <h3>Verifique seu e-mail</h3>
            <p className="muted">
              Se <strong>{email}</strong> estiver cadastrado, você vai receber um link
              para redefinir a senha. O link vale por 1 hora.
            </p>
            <Link to="/login" className="btn btn-primary btn-block btn-xl" style={{ marginTop: 18 }}>
              Voltar ao login
            </Link>
          </>
        ) : (
          <>
            <h3>Esqueci minha senha</h3>
            <p className="muted">Informe o e-mail da sua conta e enviaremos o link de redefinição.</p>

            <div className="field">
              <label>E-mail</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
              />
            </div>

            <button className="btn btn-primary btn-block btn-xl" disabled={submitting} type="submit">
              {submitting ? 'Enviando…' : 'Enviar link de redefinição'}
            </button>

            <Link to="/login" className="auth-back" style={{ marginTop: 16, display: 'inline-flex' }}>
              <ArrowLeft size={14} /> Voltar ao login
            </Link>
          </>
        )}
      </form>
    </div>
  );
}
