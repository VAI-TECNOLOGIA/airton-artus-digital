import { useEffect, useState } from 'react';
import { Send, MessageSquare, Sparkles, Zap, FileText, Tag, User, Phone, Save, Hash, Users, Megaphone, Plus, Search, Image as ImageIcon } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { StatusBadge, Badge } from '../components/ui/Badge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { label, options } from '../config/enums.js';
import { formatDateTime } from '../lib/format.js';

export default function Conversations() {
  const [mode, setMode] = useState('whatsapp');
  return (
    <Layout title="Central de Comunicação" subtitle="Atendimento ao cliente (WhatsApp) e comunicação interna da equipe — separados e organizados">
      <div className="comm-switch">
        <button className={mode === 'whatsapp' ? 'on' : ''} onClick={() => setMode('whatsapp')}>
          <Phone size={16} /> WhatsApp <span>· atendimento externo</span>
        </button>
        <button className={mode === 'interno' ? 'on' : ''} onClick={() => setMode('interno')}>
          <Users size={16} /> Chat Interno <span>· equipe</span>
        </button>
      </div>
      {mode === 'whatsapp' ? <WhatsAppCRM /> : <InternalChat />}
    </Layout>
  );
}

/* =========================== WhatsApp (atendimento externo) =========================== */
const QUICK_REPLIES = [
  'Olá! 👋 Como posso ajudar?',
  'Obrigado pelo seu contato! 🙏',
  'Vou verificar e já te retorno.',
  'Pode me informar seu bairro?',
  'Que ótimo ter você com a gente! 💪',
];
const TEMPLATES = [
  { name: 'Boas-vindas voluntário', body: 'Olá! Que bom ter você na pré-campanha do Airton Artus! Para confirmar sua participação como voluntário, responda *SIM*. Juntos pelo Rio Grande!' },
  { name: 'Convite para evento', body: '📅 Você está convidado(a) para nossa próxima ação de rua! Confira a agenda e participe — sua presença faz a diferença!' },
  { name: 'Material digital', body: '📎 Aqui está nosso material digital para você compartilhar. Espalhe nas suas redes e ajude a campanha a crescer! 🚀' },
  { name: 'Faixa na sua casa', body: '🏠 Quer uma faixa na sua casa? Responda com seu endereço que organizamos a instalação. Obrigado pelo apoio!' },
  { name: 'Agradecimento', body: 'Muito obrigado pelo seu apoio! Conte com a gente e vamos juntos por um Rio Grande do Sul com mais saúde e desenvolvimento.' },
];
const TAGS = ['Voluntário', 'Apoiador', 'Liderança', 'Indeciso', 'Imprensa', 'Faixa', 'Material', 'Prioritário'];

function WhatsAppCRM() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [text, setText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showTpl, setShowTpl] = useState(false);
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState('');

  async function loadList() {
    try {
      const { data } = await api.get('/conversations', { params: { channel: 'WHATSAPP', ...(statusFilter ? { status: statusFilter } : {}) } });
      setList(data.data);
      if (!activeId && data.data[0]) setActiveId(data.data[0].id);
    } catch (e) { toast.error(apiError(e)); }
  }
  async function loadActive(id) {
    if (!id) return;
    try {
      const { data } = await api.get(`/conversations/${id}`);
      setActive(data); setTags(Array.isArray(data.tags) ? data.tags : []); setNotes(data.notes || '');
    } catch (e) { toast.error(apiError(e)); }
  }
  useEffect(() => { loadList(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadActive(activeId); }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bug 1: envio otimista — a mensagem aparece na hora; o POST roda em background.
  function sendText(body) {
    const id = activeId;
    if (!body.trim() || !id) return;
    const tmpId = 'tmp-' + Date.now();
    setActive((a) => (a && a.id === id ? { ...a, messages: [...(a.messages || []), { id: tmpId, direction: 'OUTBOUND', body, createdAt: new Date().toISOString(), _status: 'sending' }] } : a));
    setText(''); setShowTpl(false);
    api.post(`/conversations/${id}/reply`, { body })
      .then(() => { loadActive(id); loadList(); })
      .catch((e) => {
        toast.error(apiError(e));
        setActive((a) => (a && a.id === id ? { ...a, messages: a.messages.map((m) => (m.id === tmpId ? { ...m, _status: 'error' } : m)) } : a));
      });
  }
  async function changeStatus(status) {
    try { await api.put(`/conversations/${activeId}`, { status }); loadActive(activeId); loadList(); } catch (e) { toast.error(apiError(e)); }
  }
  // Bug 4: guarda contra clique duplicado/PUT repetido na mesma conversa.
  const [savingTag, setSavingTag] = useState(false);
  async function toggleTag(t) {
    if (savingTag) return;
    const next = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
    setTags(next); setSavingTag(true);
    try { await api.put(`/conversations/${activeId}`, { tags: next }); }
    catch (e) { toast.error(apiError(e)); setTags(tags); }
    finally { setSavingTag(false); }
  }
  async function saveNotes() {
    try { await api.put(`/conversations/${activeId}`, { notes }); toast.success('Anotações salvas.'); } catch (e) { toast.error(apiError(e)); }
  }
  // Bug 1: simular sem window.prompt (que bloqueava a main thread).
  function simulate() {
    const samples = ['Olá, quero ser voluntário!', 'Como faço pra pegar uma faixa?', 'Qual a agenda dessa semana?', 'Quero ajudar na campanha 💪'];
    const phone = '5551' + Math.floor(900000000 + Math.random() * 99999999);
    const body = samples[Math.floor(Math.random() * samples.length)];
    api.post('/whatsapp/simulate', { phone, body, name: 'Contato Simulado' })
      .then(() => { toast.success('Mensagem recebida registrada.'); loadList(); })
      .catch((e) => toast.error(apiError(e)));
  }

  return (
    <>
      <div className="toolbar">
        <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todas as conversas</option>
          {options('ConversationStatus').map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <div className="spacer" />
        <button className="btn" onClick={simulate}><Sparkles size={16} /> Simular mensagem recebida</button>
      </div>

      <div className="crm crm-3">
        <Card noBody>
          <div className="crm-list">
            {list.length === 0 && <EmptyState icon={MessageSquare} title="Sem conversas" />}
            {list.map((c) => (
              <div key={c.id} className={`convo-item ${c.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(c.id)}>
                <Avatar name={c.contactName || c.contactPhone} size="avatar-sm" />
                <div className="meta">
                  <strong><span>{c.contactName || c.contactPhone || 'Contato'}</span><Badge tone="blue">{label('Channel', c.channel)}</Badge></strong>
                  <p>{c._count?.messages || 0} mensagens · {label('ConversationStatus', c.status)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card noBody>
          {!active ? <EmptyState icon={MessageSquare} title="Selecione uma conversa" /> : (
            <div className="chat">
              <div className="chat-head">
                <div className="flex items-center gap-12">
                  <Avatar name={active.contactName || active.contactPhone} size="avatar-sm" />
                  <div><strong>{active.contactName || active.contactPhone}</strong><div className="text-sm muted">{label('Channel', active.channel)}</div></div>
                </div>
                <div className="flex items-center gap-8">
                  <StatusBadge group="ConversationStatus" value={active.status} />
                  <select className="select" style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }} value={active.status} onChange={(e) => changeStatus(e.target.value)}>
                    {options('ConversationStatus').map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
              </div>
              <div className="chat-body">
                {(active.messages || []).map((m) => (
                  <div key={m.id} className={`bubble ${m.direction === 'INBOUND' ? 'in' : 'out'} ${m._status === 'error' ? 'msg-error' : ''}`} data-testid="msg">
                    {m.body}
                    <small>
                      {m._status === 'sending' ? <span data-testid="msg-sending">enviando…</span>
                        : m._status === 'error' ? <span style={{ color: '#fca5a5', cursor: 'pointer' }} onClick={() => sendText(m.body)}>falhou — reenviar</span>
                        : formatDateTime(m.createdAt)}
                    </small>
                  </div>
                ))}
              </div>
              <div className="qr-bar">
                <span className="qr-label"><Zap size={13} /> Rápidas:</span>
                {QUICK_REPLIES.map((q, i) => (<button key={i} className="qr-chip" onClick={() => sendText(q)}>{q}</button>))}
              </div>
              <div className="chat-input">
                <div className="tpl-wrap">
                  <button className="btn" onClick={() => setShowTpl((s) => !s)} title="Templates"><FileText size={16} /></button>
                  {showTpl && (
                    <div className="tpl-menu">
                      <div className="tpl-menu-head">Enviar template</div>
                      {TEMPLATES.map((t, i) => (<button key={i} className="tpl-item" onClick={() => sendText(t.body)}><strong>{t.name}</strong><span>{t.body}</span></button>))}
                    </div>
                  )}
                </div>
                <input className="input" placeholder="Digite uma resposta..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendText(text)} />
                <button className="btn btn-primary" onClick={() => sendText(text)}><Send size={16} /> Enviar</button>
              </div>
            </div>
          )}
        </Card>

        <Card noBody>
          {!active ? <div className="empty" style={{ padding: 30 }}>—</div> : (
            <div className="crm-info">
              <div className="crm-info-top">
                <Avatar name={active.contactName || active.contactPhone} />
                <div><strong>{active.contactName || 'Sem nome'}</strong><div className="text-sm muted"><Phone size={12} /> {active.contactPhone || '—'}</div></div>
              </div>
              <div className="crm-info-row"><span className="k">Canal</span><Badge tone="blue">{label('Channel', active.channel)}</Badge></div>
              <div className="crm-info-row"><span className="k">Situação</span><StatusBadge group="ConversationStatus" value={active.status} /></div>
              <div className="crm-info-row"><span className="k">Cadastro</span>{active.supporter ? <span className="flex items-center gap-8" style={{ color: 'var(--green-rs)', fontWeight: 600, fontSize: 13 }}><User size={13} /> {active.supporter.name}</span> : <span className="muted text-sm">Lead novo</span>}</div>
              <div className="crm-info-sec"><Tag size={13} /> Classificação</div>
              <div className="tag-cloud">{TAGS.map((t) => (<button key={t} className={`tag-chip ${tags.includes(t) ? 'on' : ''}`} disabled={savingTag} onClick={() => toggleTag(t)}>{t}</button>))}</div>
              <div className="crm-info-sec">Anotações internas</div>
              <textarea className="textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações sobre este contato..." />
              <button className="btn btn-sm mt-16" onClick={saveNotes}><Save size={14} /> Salvar anotações</button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/* =========================== Chat Interno (equipe) =========================== */
const INT_TABS = [
  { key: 'DIRECT', label: 'Conversas', icon: MessageSquare },
  { key: 'GROUP', label: 'Grupos', icon: Users },
  { key: 'CAMPAIGN', label: 'Campanhas', icon: Megaphone },
];

function InternalChat() {
  const toast = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState('DIRECT');
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attach, setAttach] = useState(null); // imagem (data URL)
  const [dir, setDir] = useState([]); // diretório de membros
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState('');
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState([]);

  async function loadThreads() {
    try {
      const { data } = await api.get('/internal/threads', { params: { type: tab } });
      setThreads(data.data);
    } catch (e) { toast.error(apiError(e)); }
  }
  async function loadActive(id) {
    if (!id) { setActive(null); return; }
    try { const { data } = await api.get(`/internal/threads/${id}`); setActive(data); } catch (e) { toast.error(apiError(e)); }
  }
  async function loadDir() {
    try { const { data } = await api.get('/internal/users'); setDir(data.data); } catch (e) { toast.error(apiError(e)); }
  }
  useEffect(() => { loadThreads(); setActiveId(null); setActive(null); setShowNew(false); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadActive(activeId); }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadDir(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // refresh ativo a cada 8s (comunicação interna)
  useEffect(() => {
    if (!activeId) return;
    const t = setInterval(() => loadActive(activeId), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [activeId]);

  function threadTitle(t) {
    if (t.type === 'DIRECT') {
      const other = t.members.find((m) => m.user.id !== user?.id);
      return other?.user.name || 'Conversa';
    }
    return t.name || (t.type === 'GROUP' ? 'Grupo' : 'Campanha');
  }

  async function send() {
    if ((!text.trim() && !attach) || sending || !activeId) return;
    setSending(true);
    try {
      await api.post(`/internal/threads/${activeId}/messages`, { body: text, attachmentUrl: attach || undefined });
      setText(''); setAttach(null); await loadActive(activeId); loadThreads();
    } catch (e) { toast.error(apiError(e)); } finally { setSending(false); }
  }
  function onPickImage(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Selecione uma imagem.');
    if (f.size > 1_400_000) return toast.error('Imagem muito grande (máx. 1,4 MB).');
    const reader = new FileReader();
    reader.onload = () => setAttach(reader.result);
    reader.readAsDataURL(f);
  }
  async function openDirect(userId) {
    try { const { data } = await api.post('/internal/direct', { userId }); await loadThreads(); setActiveId(data.id); setShowNew(false); setQ(''); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function createGroup() {
    if (newName.trim().length < 2) return toast.error('Dê um nome.');
    try {
      const { data } = await api.post('/internal/threads', { type: tab, name: newName.trim(), memberIds: newMembers });
      setNewName(''); setNewMembers([]); setShowNew(false); await loadThreads(); setActiveId(data.id);
    } catch (e) { toast.error(apiError(e)); }
  }

  const myCode = user?.code || '—';
  const filteredDir = dir.filter((u) => u.id !== user?.id && (u.name.toLowerCase().includes(q.toLowerCase()) || (u.code || '').toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <div className="toolbar">
        <div className="int-tabs">
          {INT_TABS.map((t) => { const I = t.icon; return (
            <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}><I size={15} /> {t.label}</button>
          ); })}
        </div>
        <div className="spacer" />
        <span className="code-badge"><Hash size={13} /> Seu código: <b>{myCode}</b></span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew((s) => !s)}><Plus size={15} /> {tab === 'DIRECT' ? 'Nova conversa' : tab === 'GROUP' ? 'Novo grupo' : 'Nova campanha'}</button>
      </div>

      <div className="crm">
        <Card noBody>
          {showNew ? (
            <div className="int-new">
              {tab === 'DIRECT' ? (
                <>
                  <div className="search" style={{ margin: 12 }}><Search size={15} /><input className="input" placeholder="Buscar por nome ou código..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
                  <div className="crm-list">
                    {filteredDir.map((u) => (
                      <div key={u.id} className="convo-item" onClick={() => openDirect(u.id)}>
                        <Avatar name={u.name} src={u.avatarUrl} size="avatar-sm" />
                        <div className="meta"><strong><span>{u.name}</span></strong><p><Hash size={11} style={{ verticalAlign: '-1px' }} />{u.code || '—'} · {label('UserRole', u.role)}</p></div>
                      </div>
                    ))}
                    {filteredDir.length === 0 && <div className="empty" style={{ padding: 24 }}>Ninguém encontrado.</div>}
                  </div>
                </>
              ) : (
                <div style={{ padding: 14 }}>
                  <div className="field"><label>Nome {tab === 'GROUP' ? 'do grupo' : 'da campanha'}</label><input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={tab === 'GROUP' ? 'Ex.: Coordenação Zona Norte' : 'Ex.: Caminhada Centro'} /></div>
                  <label className="text-sm muted">Participantes</label>
                  <div className="int-pick">
                    {dir.filter((u) => u.id !== user?.id).map((u) => {
                      const on = newMembers.includes(u.id);
                      return (<button key={u.id} className={`tag-chip ${on ? 'on' : ''}`} onClick={() => setNewMembers((m) => on ? m.filter((x) => x !== u.id) : [...m, u.id])}>{u.name}</button>);
                    })}
                  </div>
                  <button className="btn btn-primary btn-block mt-16" onClick={createGroup}><Plus size={15} /> Criar</button>
                </div>
              )}
            </div>
          ) : (
            <div className="crm-list">
              {threads.length === 0 && <EmptyState icon={tab === 'DIRECT' ? MessageSquare : tab === 'GROUP' ? Users : Megaphone} title={`Sem ${tab === 'DIRECT' ? 'conversas' : tab === 'GROUP' ? 'grupos' : 'campanhas'}`} />}
              {threads.map((t) => (
                <div key={t.id} className={`convo-item ${t.id === activeId ? 'active' : ''} ${t.unread ? 'unread' : ''}`} onClick={() => setActiveId(t.id)}>
                  <div className={`int-ava ${t.type.toLowerCase()}`}>{t.type === 'DIRECT' ? (threadTitle(t)[0] || '?') : t.type === 'GROUP' ? <Users size={16} /> : <Megaphone size={16} />}</div>
                  <div className="meta">
                    <strong><span>{threadTitle(t)}</span>{t.unread > 0 && <span className="unread-badge">{t.unread}</span>}</strong>
                    <p>{t.messages?.[0]?.attachmentUrl ? '📷 Imagem' : (t.messages?.[0]?.body?.slice(0, 38) || (t.type === 'DIRECT' ? 'Conversa direta' : `${t.members.length} membros`))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card noBody>
          {!active ? <EmptyState icon={Users} title="Selecione uma conversa interna" sub="Comunicação privada da equipe — não vai para clientes." /> : (
            <div className="chat">
              <div className="chat-head">
                <div className="flex items-center gap-12">
                  <div className={`int-ava ${active.type.toLowerCase()}`}>{active.type === 'DIRECT' ? (threadTitle(active)[0] || '?') : active.type === 'GROUP' ? <Users size={16} /> : <Megaphone size={16} />}</div>
                  <div><strong>{threadTitle(active)}</strong><div className="text-sm muted">{active.type === 'DIRECT' ? 'Conversa direta' : `${active.members.length} participantes · ${active.type === 'GROUP' ? 'Grupo' : 'Campanha'}`}</div></div>
                </div>
                <Badge tone="violet">Interno</Badge>
              </div>
              <div className="chat-body">
                {(active.messages || []).map((m) => {
                  const mine = m.sender?.id === user?.id;
                  return (
                    <div key={m.id} className={`bubble ${mine ? 'out' : 'in'}`}>
                      {!mine && active.type !== 'DIRECT' && <b className="int-sender">{m.sender?.name || 'Membro'}</b>}
                      {m.attachmentUrl && <img className="bubble-img" src={m.attachmentUrl} alt="anexo" />}
                      {m.body}
                      <small>{formatDateTime(m.createdAt)}</small>
                    </div>
                  );
                })}
                {active.messages?.length === 0 && <div className="empty" style={{ padding: 20 }}>Comece a conversa 👋</div>}
              </div>
              {attach && (
                <div className="attach-preview">
                  <img src={attach} alt="prévia" />
                  <button className="attach-x" onClick={() => setAttach(null)} title="Remover">✕</button>
                </div>
              )}
              <div className="chat-input">
                <label className="btn" title="Anexar imagem" style={{ cursor: 'pointer' }}>
                  <ImageIcon size={16} />
                  <input type="file" accept="image/*" hidden onChange={onPickImage} />
                </label>
                <input className="input" placeholder="Mensagem para a equipe..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button className="btn btn-primary" disabled={sending} onClick={send}><Send size={16} /> Enviar</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
