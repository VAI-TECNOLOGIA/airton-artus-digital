import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api, { apiError } from '../api/client.js';

/**
 * Página PÚBLICA de exclusão de dados do apoiador (LGPD / lojas de app).
 * Passo 1: telefone → código enviado ao WhatsApp do próprio número.
 * Passo 2: código → exclusão imediata e definitiva.
 */
export default function DataDeletion() {
  const [step, setStep] = useState('phone'); // phone | code | done
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function requestCode(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await api.post('/public/data-deletion/request', { phone });
      setStep('code');
    } catch (err) {
      setError(apiError(err, 'Não foi possível enviar o código. Tente novamente.'));
    } finally {
      setSending(false);
    }
  }

  async function confirm(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await api.post('/public/data-deletion/confirm', { phone, code });
      setStep('done');
    } catch (err) {
      setError(apiError(err, 'Código inválido ou expirado.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg, #f4f5fa)', padding: 20 }}>
      <div className="auth-card" style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={22} color="var(--red, #BD2E2F)" />
          <h3 style={{ margin: 0 }}>Excluir meus dados</h3>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>
          Remova permanentemente seu cadastro da base da pré-campanha de Airton Artus,
          conforme a <a href="/legal/politica-de-privacidade.html" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.
        </p>

        {step === 'phone' && (
          <form onSubmit={requestCode}>
            <div className="field">
              <label htmlFor="del-phone">Telefone cadastrado (com DDD)</label>
              <input
                id="del-phone"
                className="input"
                inputMode="tel"
                placeholder="51 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              Enviaremos um código de confirmação por WhatsApp para este número — assim
              garantimos que só você pode excluir os seus dados.
            </p>
            {error && <p style={{ color: 'var(--red, #BD2E2F)', fontSize: 13.5 }}>{error}</p>}
            <button className="btn btn-primary btn-block" disabled={sending} type="submit">
              {sending ? 'Enviando...' : 'Receber código por WhatsApp'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={confirm}>
            <p style={{ fontSize: 14 }}>
              Se o número <strong>{phone}</strong> tiver cadastro, um código de 6 dígitos
              chegou no WhatsApp dele (vale por 15 minutos).
            </p>
            <div className="field">
              <label htmlFor="del-code">Código de confirmação</label>
              <input
                id="del-code"
                className="input"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
            </div>
            {error && <p style={{ color: 'var(--red, #BD2E2F)', fontSize: 13.5 }}>{error}</p>}
            <button className="btn btn-danger btn-block" disabled={sending || code.length !== 6} type="submit">
              {sending ? 'Excluindo...' : 'Confirmar exclusão definitiva'}
            </button>
            <button type="button" className="btn btn-block" style={{ marginTop: 8 }} onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
              Voltar
            </button>
          </form>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <CheckCircle2 size={44} color="var(--green, #398254)" style={{ marginBottom: 10 }} />
            <h3 style={{ marginBottom: 6 }}>Dados excluídos</h3>
            <p className="muted">
              Seu cadastro, conversas e dados pessoais foram removidos permanentemente da
              base da pré-campanha. Você não receberá mais nenhuma mensagem.
            </p>
          </div>
        )}

        <div className="auth-links" style={{ marginTop: 20 }}>
          <Link to="/lp" className="auth-back">
            <ArrowLeft size={14} /> Voltar ao site
          </Link>
          <a className="auth-back" href="/legal/excluir-dados.html">Outras opções de exclusão</a>
        </div>
      </div>
    </div>
  );
}
