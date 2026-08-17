import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiError } from '../api/client.js';

export default function CriarConta() {
  const { signup, user, loading } = useAuth();
  const nav = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', cityName: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function next(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error('Informe seu nome completo.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Informe um e-mail válido.');
    if (form.phone.replace(/\D/g, '').length < 8) return toast.error('Informe um telefone (WhatsApp) válido.');
    setStep(2);
  }

  async function submit(e) {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('A senha deve ter ao menos 6 caracteres.');
    if (form.password !== form.confirm) return toast.error('As senhas não conferem.');
    setSubmitting(true);
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        cityName: form.cityName.trim() || null,
        password: form.password,
      });
      toast.success('Conta criada! Bem-vindo à pré-campanha!');
      nav('/');
    } catch (err) {
      toast.error(apiError(err, 'Não foi possível criar a conta. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      {/* Painel visual — mesma identidade do login */}
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
              Faça parte da <em>pré-campanha</em>
            </h1>
            <p className="auth-tagline">
              Crie a sua conta em segundos e entre para a rede de apoiadores de Airton Artus.
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="auth-form-side">
        {step === 1 ? (
          <form className="auth-card" onSubmit={next}>
            <h3>Criar conta</h3>
            <p className="muted">Passo 1 de 2 — seus dados.</p>

            <div className="field">
              <label htmlFor="s-name">Nome completo</label>
              <input id="s-name" className="input" type="text" autoComplete="name" value={form.name} onChange={set('name')} required placeholder="Seu nome" />
            </div>
            <div className="field">
              <label htmlFor="s-email">E-mail</label>
              <input id="s-email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} required placeholder="seu@email.com" />
            </div>
            <div className="field">
              <label htmlFor="s-phone">Telefone (WhatsApp)</label>
              <input id="s-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} required placeholder="(51) 99999-9999" />
            </div>
            <div className="field">
              <label htmlFor="s-city">Cidade <span className="muted">(opcional)</span></label>
              <input id="s-city" className="input" type="text" autoComplete="address-level2" value={form.cityName} onChange={set('cityName')} placeholder="Sua cidade" />
            </div>

            <button className="btn btn-primary btn-block btn-xl" type="submit">
              Avançar <ArrowRight size={16} />
            </button>

            <div className="auth-links">
              <Link to="/login" className="auth-back">
                <ArrowLeft size={14} /> Já tenho conta — entrar
              </Link>
            </div>
          </form>
        ) : (
          <form className="auth-card" onSubmit={submit}>
            <h3>Crie sua senha</h3>
            <p className="muted">Passo 2 de 2 — defina uma senha para entrar.</p>

            <div className="field">
              <label htmlFor="s-pass">Senha</label>
              <input id="s-pass" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required placeholder="mínimo 6 caracteres" />
            </div>
            <div className="field">
              <label htmlFor="s-pass2">Confirmar senha</label>
              <input id="s-pass2" className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required placeholder="repita a senha" />
            </div>

            <button className="btn btn-primary btn-block btn-xl" disabled={submitting} type="submit">
              {submitting ? 'Criando conta...' : 'Salvar e entrar'}
            </button>

            <div className="auth-links">
              <button type="button" className="auth-back" onClick={() => setStep(1)} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                <ArrowLeft size={14} /> Voltar aos dados
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
