import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, Check, X, Users } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import '../styles/landing.css';

const WEEK = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MONTH = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function prettyDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  // Datas são armazenadas como meia-noite UTC (campo só-data) — usar componentes
  // UTC evita o dia "voltar" um por causa do fuso local.
  return `${WEEK[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTH[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export default function Rsvp() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', companions: 0 });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null); // 'CONFIRMADO' | 'RECUSADO'
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/public/rsvp/${token}`)
      .then((r) => setData(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(status) {
    setErr('');
    if (form.name.trim().length < 2) { setErr('Informe seu nome.'); return; }
    if (form.phone.replace(/\D/g, '').length < 8) { setErr('Informe um telefone válido.'); return; }
    setSending(true);
    try {
      await api.post(`/public/rsvp/${token}`, {
        name: form.name.trim(),
        phone: form.phone,
        status,
        companions: status === 'CONFIRMADO' ? Number(form.companions) || 0 : 0,
      });
      setDone(status);
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setSending(false);
    }
  }

  const ev = data?.event;

  return (
    <div className="rsvp">
      <div className="mlp-tricolor" aria-hidden="true"><i className="g" /><i className="r" /><i className="y" /></div>
      <div className="rsvp-wrap">
        <div className="rsvp-brand">
          <img src="/logo-horizontal-branco.png" alt="Airton Artus" className="rsvp-logo" />
          <small>Pré-candidato a Deputado Estadual · RS</small>
        </div>

        {loading && <div className="rsvp-card"><p className="rsvp-muted">Carregando convite…</p></div>}

        {!loading && notFound && (
          <div className="rsvp-card rsvp-center">
            <div className="rsvp-badge red"><X size={28} /></div>
            <h2>Convite não encontrado</h2>
            <p className="rsvp-muted">O link pode ter expirado ou está incorreto. Peça um novo à equipe da campanha.</p>
          </div>
        )}

        {!loading && ev && !done && (
          <div className="rsvp-card">
            <span className="rsvp-eyebrow">Você está convidado</span>
            <h1 className="rsvp-title">{ev.title}</h1>
            {ev.description && <p className="rsvp-desc">{ev.description}</p>}

            <div className="rsvp-info">
              <div className="rsvp-info-row"><Calendar size={18} /><span>{prettyDate(ev.date)}</span></div>
              {ev.time && <div className="rsvp-info-row"><Clock size={18} /><span>{ev.time}</span></div>}
              {(ev.location || ev.cityName) && (
                <div className="rsvp-info-row"><MapPin size={18} /><span>{[ev.location, ev.neighborhood, ev.cityName].filter(Boolean).join(' · ')}</span></div>
              )}
            </div>

            {data.confirmed > 0 && (
              <div className="rsvp-social"><Users size={15} /> {data.people} {data.people > 1 ? 'pessoas já confirmaram' : 'pessoa já confirmou'} presença</div>
            )}

            <div className="rsvp-form">
              <h3>Confirme sua presença</h3>
              <div className="rsvp-field">
                <label htmlFor="rsvp-name">Seu nome</label>
                <input id="rsvp-name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="rsvp-field">
                <label htmlFor="rsvp-phone">WhatsApp</label>
                <input id="rsvp-phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="(DDD) 9 9999-9999" inputMode="tel" />
              </div>
              <div className="rsvp-field">
                <label htmlFor="rsvp-comp">Vou levar quantas pessoas comigo? <span className="rsvp-opt">(opcional)</span></label>
                <input id="rsvp-comp" type="number" min="0" max="50" value={form.companions} onChange={(e) => setForm((s) => ({ ...s, companions: e.target.value }))} />
              </div>

              {err && <div className="rsvp-err">{err}</div>}

              <div className="rsvp-actions">
                <button className="rsvp-btn go" disabled={sending} onClick={() => respond('CONFIRMADO')}>
                  <Check size={18} /> Vou participar
                </button>
                <button className="rsvp-btn no" disabled={sending} onClick={() => respond('RECUSADO')}>
                  Não vou conseguir
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && done && (
          <div className="rsvp-card rsvp-center">
            <div className={'rsvp-badge ' + (done === 'CONFIRMADO' ? 'green' : 'navy')}>
              {done === 'CONFIRMADO' ? <Check size={30} /> : <Calendar size={28} />}
            </div>
            {done === 'CONFIRMADO' ? (
              <>
                <h2>Presença confirmada!</h2>
                <p className="rsvp-muted">Que bom ter você com a gente. Te esperamos lá! Guarde a data.</p>
              </>
            ) : (
              <>
                <h2>Tudo bem, obrigado pelo retorno!</h2>
                <p className="rsvp-muted">Sentiremos sua falta. Na próxima a gente conta com você.</p>
              </>
            )}
            {ev && <div className="rsvp-recap"><b>{ev.title}</b><span>{prettyDate(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</span></div>}
          </div>
        )}

        <div className="rsvp-foot">
          <div className="mlp-foot-stripe" aria-hidden="true"><i className="g" /><i className="r" /><i className="y" /></div>
          Airton Artus · Campanha 2026
        </div>
      </div>
    </div>
  );
}
