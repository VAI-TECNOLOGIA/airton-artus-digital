import { useMemo, useState } from 'react';
import { Copy, Check, Send } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { waLink, prettyPhone, phoneDigits, defaultMessage } from '../lib/whatsapp.js';
import api, { apiError } from '../api/client.js';

/** Ícone do WhatsApp (mesmo traço usado na landing). */
export function WaIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zM6.597 20.13c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607z" />
    </svg>
  );
}

/**
 * Modal para enviar a mensagem de acesso/boas-vindas por WhatsApp manualmente.
 * A equipe pode editar o texto, copiar ou abrir o WhatsApp já preenchido.
 */
export default function WhatsAppMessageModal({ supporter, candidate = 'Airton Artus', onClose }) {
  const toast = useToast();
  const [msg, setMsg] = useState(() => defaultMessage(supporter, candidate));
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendNow() {
    const id = supporter?.supporterId || supporter?.id;
    if (!id) { toast.error('Registro sem identificação.'); return; }
    setSending(true);
    try {
      const { data } = await api.post(`/supporters/${id}/send-access`);
      if (data?.simulated) toast.success('Registrado em modo simulado — conecte o número real para entregar de fato.');
      else toast.success('Acesso enviado pela API oficial do WhatsApp!');
      onClose?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSending(false);
    }
  }

  const phone = supporter?.whatsapp || supporter?.phone;
  const hasPhone = !!phoneDigits(phone);
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

  return (
    <Modal
      title="Enviar acesso por WhatsApp"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Fechar</button>
          <button className="btn" onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />} Copiar mensagem
          </button>
          {hasPhone && (
            <button className="btn btn-primary" disabled={sending} onClick={sendNow} title="Enviar automaticamente pela API oficial">
              <Send size={15} /> {sending ? 'Enviando…' : 'Enviar agora'}
            </button>
          )}
          {hasPhone ? (
            <a className="btn btn-green" href={link} target="_blank" rel="noopener noreferrer" onClick={onClose}>
              <WaIcon /> Abrir no WhatsApp
            </a>
          ) : (
            <button className="btn btn-green" disabled title="Apoiador sem telefone cadastrado">
              <WaIcon /> Abrir no WhatsApp
            </button>
          )}
        </>
      }
    >
      <div className="wa-send">
        <div className="wa-send-to">
          <span>Para</span>
          <strong>{supporter?.name || '—'}</strong>
          <em>{hasPhone ? prettyPhone(phone) : 'sem telefone cadastrado'}</em>
        </div>

        <label className="field-label" htmlFor="wa-msg">Mensagem</label>
        <textarea
          id="wa-msg"
          className="textarea"
          rows={6}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <p className="field-hint">
          <b>Enviar agora</b> dispara automaticamente pela API oficial (requer o número real conectado e o template aprovado).
          Ou use <b>Abrir no WhatsApp</b> para enviar manualmente já.
        </p>
      </div>
    </Modal>
  );
}
