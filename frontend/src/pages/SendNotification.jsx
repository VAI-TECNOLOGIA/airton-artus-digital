import { useEffect, useMemo, useState } from 'react';
import { Bell, Send, Smartphone, Search } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { label } from '../config/enums.js';

const ROLES = ['LIDER', 'MEMBRO', 'PARCEIRO'];

export default function SendNotification() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [health, setHealth] = useState(null);
  const [mode, setMode] = useState('all');
  const [roles, setRoles] = useState(['MEMBRO', 'LIDER']);
  const [selected, setSelected] = useState([]); // userIds
  const [q, setQ] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/notifications/recipients')
      .then(({ data }) => { setPeople(data.data || []); setHealth(data.health || null); })
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? people.filter((p) => p.name.toLowerCase().includes(t)) : people;
  }, [q, people]);

  const targetCount = useMemo(() => {
    if (mode === 'all') return people.length;
    if (mode === 'roles') return people.filter((p) => roles.includes(p.role)).length;
    return selected.length;
  }, [mode, roles, selected, people]);

  function toggleRole(r) {
    setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
  }
  function toggleUser(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function send() {
    if (title.trim().length < 2 || body.trim().length < 2) { toast.error('Preencha título e mensagem.'); return; }
    if (mode === 'all' && !window.confirm(`Enviar para TODOS os ${people.length} usuários ativos?`)) return;
    setSending(true);
    setResult(null);
    try {
      const payload = { mode, title: title.trim(), body: body.trim(), link: link.trim() || null };
      if (mode === 'roles') payload.roles = roles;
      if (mode === 'users') payload.userIds = selected;
      const { data } = await api.post('/notifications/send', payload);
      setResult(data);
      const p = data.push || {};
      const modo = p.simulated ? ' (modo simulado — sem credencial de push no servidor)' : '';
      toast.success(`Enviado para ${data.recipients} pessoa(s) · push em ${p.sent || 0} aparelho(s)${modo}.`);
      setTitle(''); setBody(''); setLink('');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Layout title="Enviar notificação"><LoadingBox /></Layout>;

  return (
    <Layout title="Enviar notificação" subtitle="Avise a equipe pelo sino do sistema e por push no celular">
      {health && (
        <div className="notif-health">
          <Smartphone size={15} />
          <span><b>{health.withDevice}</b> de {health.total} com aparelho registrado · {health.android} Android · {health.ios} iPhone{health.web ? ` · ${health.web} navegador` : ''}</span>
        </div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card title="Para quem" icon={Bell}>
          <div className="seg">
            <button className={`seg-btn ${mode === 'all' ? 'active' : ''}`} onClick={() => setMode('all')}>Todos</button>
            <button className={`seg-btn ${mode === 'roles' ? 'active' : ''}`} onClick={() => setMode('roles')}>Por perfil</button>
            <button className={`seg-btn ${mode === 'users' ? 'active' : ''}`} onClick={() => setMode('users')}>Escolher pessoas</button>
          </div>

          {mode === 'all' && <p className="muted" style={{ marginTop: 12 }}>Todos os {people.length} usuários ativos recebem.</p>}

          {mode === 'roles' && (
            <div className="chk-row" style={{ marginTop: 12 }}>
              {ROLES.map((r) => (
                <label key={r} className="aud-check">
                  <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} />
                  {label('UserRole', r)}
                </label>
              ))}
            </div>
          )}

          {mode === 'users' && (
            <div style={{ marginTop: 12 }}>
              <div className="input-icon">
                <Search size={15} />
                <input className="input" placeholder="Buscar pessoa…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="person-list">
                {filtered.map((p) => (
                  <label key={p.id} className={`person-row ${selected.includes(p.id) ? 'on' : ''}`}>
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleUser(p.id)} />
                    <span className="person-name">{p.name}</span>
                    <span className="person-role">{label('UserRole', p.role)}</span>
                    {p.hasDevice
                      ? <span className="person-dev on" title={p.platforms.join(', ')}><Smartphone size={13} /></span>
                      : <span className="person-dev" title="Sem aparelho registrado"><Smartphone size={13} /></span>}
                  </label>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Mensagem" icon={Send}>
          <div className="field">
            <label>Título</label>
            <input className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reunião da equipe amanhã" />
          </div>
          <div className="field">
            <label>Mensagem</label>
            <textarea className="textarea" rows={4} maxLength={400} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva o aviso…" />
          </div>
          <div className="field">
            <label>Abrir ao tocar (opcional)</label>
            <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/mural, /agenda, /disparos…" />
            <div className="field-hint">Rota interna do sistema aberta ao tocar na notificação.</div>
          </div>

          <div className="tpl-preview" style={{ marginBottom: 12 }}>
            <strong>{title || 'Título da notificação'}</strong>
            <div style={{ marginTop: 4 }}>{body || 'Prévia da mensagem que a pessoa vai receber.'}</div>
          </div>

          <button className="btn btn-primary btn-block btn-xl" onClick={send} disabled={sending || targetCount === 0}>
            <Send size={16} /> {sending ? 'Enviando…' : `Enviar para ${targetCount} pessoa(s)`}
          </button>

          {result && (
            <div className="send-result">
              Enviado para <b>{result.recipients}</b> pessoa(s) · push disparado para <b>{result.push?.sent || 0}</b> aparelho(s)
              {result.push?.failed ? ` · ${result.push.failed} falha(s)` : ''}
              {result.push?.simulated ? ' · modo simulado (sem credencial de push no servidor)' : ''}.
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
