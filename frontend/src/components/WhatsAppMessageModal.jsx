import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Send } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { waLink, prettyPhone, phoneDigits, defaultMessage, accessMessage } from '../lib/whatsapp.js';
import api, { apiError } from '../api/client.js';

/** Ícone do WhatsApp (mesmo traço usado na landing). */
export function WaIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zM6.597 20.13c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607z" />
    </svg>
  );
}

const rowStyle = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  padding: '12px 0',
  borderTop: '1px solid rgba(127,127,127,.22)',
};
const actionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };

/**
 * Modal para dar acesso ao apoiador/voluntário por WhatsApp.
 * Duas formas claras: (1) pelo próprio WhatsApp da equipe (funciona hoje) ou
 * (2) automático pela API oficial (template). A mensagem já inclui o LINK de acesso
 * — a pessoa cria a senha e entra com o telefone.
 */
export default function WhatsAppMessageModal({ supporter, candidate = 'Airton Artus', onClose }) {
  const toast = useToast();
  const id = supporter?.supporterId || supporter?.id;
  const phone = supporter?.whatsapp || supporter?.phone;
  const hasPhone = !!phoneDigits(phone);

  const [msg, setMsg] = useState(() => defaultMessage(supporter, candidate));
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [linking, setLinking] = useState(hasPhone);

  // Ao abrir: provisiona a conta (telefone = login) e traz o LINK de acesso já na mensagem.
  useEffect(() => {
    let alive = true;
    if (!id || !hasPhone) { setLinking(false); return; }
    (async () => {
      try {
        const { data } = await api.post(`/supporters/${id}/send-access`, { mode: 'link' });
        if (alive && data?.link) setMsg(accessMessage(supporter, data.link, candidate));
      } catch {
        // Mantém a mensagem padrão; o link pode ser gerado no envio pela API.
      } finally {
        if (alive) setLinking(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const link = useMemo(() => waLink(phone, msg), [phone, msg]);

  async function copy() {
    try {
      await navigator.clipboard?.writeText(msg);
      setCopied(true);
      toast.success('Mensagem copiada! Cole no WhatsApp e envie.');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Não foi possível copiar automaticamente. Selecione o texto e copie.');
    }
  }

  async function sendViaApi() {
    if (!id) { toast.error('Registro sem identificação.'); return; }
    setSending(true);
    try {
      const { data } = await api.post(`/supporters/${id}/send-access`, { mode: 'api' });
      if (data?.simulated) toast.success('Registrado em modo simulado — conecte o número oficial para entregar de fato.');
      else toast.success('Acesso enviado pela API oficial do WhatsApp!');
      onClose?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title="Enviar acesso por WhatsApp"
      onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fechar</button>}
    >
      <div className="wa-send">
        <div className="wa-send-to">
          <span>Para</span>
          <strong>{supporter?.name || '—'}</strong>
          <em>{hasPhone ? prettyPhone(phone) : 'sem telefone cadastrado'}</em>
        </div>

        <p className="field-hint" style={{ marginTop: 10 }}>
          A pessoa entra na plataforma com o <b>telefone</b> dela e uma <b>senha que ela mesma cria</b> pelo
          link da mensagem. Escolha abaixo como enviar o acesso.
        </p>

        <label className="field-label" htmlFor="wa-msg" style={{ marginTop: 10 }}>Mensagem (já com o link de acesso)</label>
        <textarea
          id="wa-msg"
          className="textarea"
          rows={8}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        {linking && <p className="field-hint">Gerando o link de acesso…</p>}

        {!hasPhone && (
          <p className="field-hint" style={{ color: 'var(--red, #BD2E2F)' }}>
            Este cadastro não tem telefone — adicione um WhatsApp para poder enviar o acesso.
          </p>
        )}

        {/* Opção 1 — pelo próprio WhatsApp da equipe (funciona hoje) */}
        <div style={rowStyle}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <b>1. Pelo meu WhatsApp</b>{' '}
            <span className="chip" style={{ fontSize: 11 }}>recomendado agora</span>
            <div className="field-hint" style={{ marginTop: 2 }}>
              Abre o WhatsApp com a mensagem e o link prontos. Você envia do seu número — funciona hoje mesmo.
            </div>
          </div>
          <div style={actionsStyle}>
            <button className="btn" onClick={copy} disabled={linking}>
              {copied ? <Check size={15} /> : <Copy size={15} />} Copiar
            </button>
            {hasPhone ? (
              <a
                className="btn btn-green"
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={linking}
                onClick={(e) => { if (linking) e.preventDefault(); }}
                style={linking ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
              >
                <WaIcon /> Abrir no WhatsApp
              </a>
            ) : (
              <button className="btn btn-green" disabled><WaIcon /> Abrir no WhatsApp</button>
            )}
          </div>
        </div>

        {/* Opção 2 — automático pela API oficial (template) */}
        <div style={rowStyle}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <b>2. Pela API oficial (template)</b>
            <div className="field-hint" style={{ marginTop: 2 }}>
              Envio automático pela Meta. Precisa do <b>número oficial</b> da campanha conectado e do
              <b> template aprovado</b> — enquanto estiver no número de teste, só entrega a contatos liberados.
            </div>
          </div>
          <div style={actionsStyle}>
            <button className="btn btn-primary" disabled={sending || !hasPhone} onClick={sendViaApi}>
              <Send size={15} /> {sending ? 'Enviando…' : 'Enviar por template'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
