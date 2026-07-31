import { useEffect, useState } from 'react';
import { Copy, Check, Trash2, Users, ExternalLink } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import { StatusBadge } from './ui/Badge.jsx';
import { LoadingBox } from './ui/Spinner.jsx';
import EmptyState from './ui/EmptyState.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { prettyPhone, waLink } from '../lib/whatsapp.js';
import { WaIcon } from './WhatsAppMessageModal.jsx';

/**
 * Lista de convidados de um evento: mostra o link público de confirmação,
 * a contagem e a lista de quem confirmou / recusou.
 */
export default function GuestListModal({ event, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  const link = data?.token ? `${window.location.origin}/convite/${data.token}` : '';

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/events/${event.id}/guests`);
      setData(data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [event.id]);

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(link);
      setCopied(true);
      toast.success('Link copiado! Envie aos convidados.');
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error('Não foi possível copiar.'); }
  }

  async function removeGuest(g) {
    if (!window.confirm(`Remover ${g.name} da lista?`)) return;
    try {
      await api.delete(`/events/${event.id}/guests/${g.id}`);
      load();
    } catch (e) { toast.error(apiError(e)); }
  }

  const shareMsg = data?.event
    ? `Você está convidado para "${data.event.title}"! Confirme sua presença: ${link}`
    : link;

  return (
    <Modal title="Lista de convidados" onClose={onClose} wide
      footer={<button className="btn" onClick={onClose}>Fechar</button>}>
      {loading ? <LoadingBox /> : !data ? null : (
        <div className="guest">
          <div className="guest-event">
            <b>{data.event?.title}</b>
          </div>

          {/* Link público de confirmação */}
          <div className="guest-link-box">
            <div className="guest-link-label">Link de confirmação (envie aos convidados)</div>
            <div className="guest-link-row">
              <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} />
              <button className="btn" onClick={copyLink} title="Copiar link">
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <a className="btn btn-green" href={waLink('', shareMsg)} target="_blank" rel="noopener noreferrer" title="Compartilhar no WhatsApp">
                <WaIcon />
              </a>
              <a className="btn btn-outline" href={link} target="_blank" rel="noopener noreferrer" title="Abrir a página do convite">
                <ExternalLink size={15} />
              </a>
            </div>
          </div>

          {/* Contadores */}
          <div className="guest-stats">
            <div className="guest-stat go"><b>{data.counts.confirmed}</b><span>Confirmados</span></div>
            <div className="guest-stat no"><b>{data.counts.declined}</b><span>Não vão</span></div>
            <div className="guest-stat"><b>{data.counts.people}</b><span>Total de pessoas</span></div>
          </div>

          {/* Lista */}
          {data.guests.length === 0 ? (
            <EmptyState icon={Users} title="Ninguém respondeu ainda" message="Compartilhe o link acima para começar a receber confirmações." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Convidado</th><th>Telefone</th><th>Resposta</th><th>Leva</th><th></th></tr>
                </thead>
                <tbody>
                  {data.guests.map((g) => (
                    <tr key={g.id}>
                      <td className="cell-strong">{g.name}</td>
                      <td className="cell-muted">{prettyPhone(g.phone)}</td>
                      <td>
                        {g.status === 'CONFIRMADO'
                          ? <span className="badge badge-green"><span className="dot" /> Vai participar</span>
                          : <span className="badge badge-red"><span className="dot" /> Não vai</span>}
                      </td>
                      <td>{g.status === 'CONFIRMADO' && g.companions > 0 ? `+${g.companions}` : '—'}</td>
                      <td className="table-actions">
                        <button className="btn btn-ghost btn-sm" title="Remover" onClick={() => removeGuest(g)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
