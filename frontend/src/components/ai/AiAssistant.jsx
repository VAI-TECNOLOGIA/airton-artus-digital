import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send, X, Loader2, Bot } from 'lucide-react';
import api, { apiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const SUGESTOES = [
  'Como está a nossa campanha hoje?',
  'Quais regiões precisam de mais atenção?',
  'Sugira uma mensagem de convocação para uma caminhada.',
];

export default function AiAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null); // { enabled, hasToken, provider, model }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get('/ai/status').then(({ data }) => setStatus(data)).catch(() => setStatus({ enabled: false, hasToken: false }));
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

  if (!user) return null;

  const active = status?.enabled && status?.hasToken;

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post('/ai/chat', { messages: next }, { timeout: 90000 });
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${apiError(e, 'Não consegui responder agora.')}`, error: true }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {!open && (
        <button className="ai-fab" onClick={() => setOpen(true)} title="Assistente de IA" aria-label="Abrir assistente de IA">
          <Sparkles size={22} />
        </button>
      )}

      <div className={`ai-panel ${open ? 'open' : ''}`} role="dialog" aria-label="Assistente de IA">
        <div className="ai-head">
          <div className="ai-head-title">
            <div className="ai-head-icon"><Bot size={18} /></div>
            <div>
              <strong>Assistente da campanha</strong>
              <span>{user.name} · {user.role === 'LIDER' ? 'Líder' : user.role === 'MEMBRO' ? 'Membro' : 'Parceiro'}</span>
            </div>
          </div>
          <button className="ai-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="ai-body" ref={scrollRef}>
          {!active ? (
            <div className="ai-empty">
              <div className="ai-empty-icon"><Sparkles size={26} /></div>
              <h4>Assistente ainda não ativado</h4>
              {user.role === 'LIDER' ? (
                <p>Ative a IA colando o token do provedor em <Link to="/configuracoes" onClick={() => setOpen(false)}>Configurações → Assistente de IA</Link>.</p>
              ) : (
                <p>Peça ao líder da campanha para ativar a IA nas configurações.</p>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className="ai-welcome">
              <p>Olá, {user.name.split(' ')[0]}! Sou seu assistente da campanha. Posso responder sobre os dados que <strong>você tem permissão</strong> de ver.</p>
              <div className="ai-suggests">
                {SUGESTOES.map((s) => (
                  <button key={s} className="ai-suggest" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role} ${m.error ? 'err' : ''}`}>
                {m.content.split('\n').map((line, j) => <p key={j}>{line}</p>)}
              </div>
            ))
          )}
          {sending && (
            <div className="ai-msg assistant">
              <Loader2 size={16} className="spin" /> <span className="muted">Pensando…</span>
            </div>
          )}
        </div>

        {active && (
          <div className="ai-input">
            <textarea
              rows={1}
              value={input}
              placeholder="Pergunte algo à campanha…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button className="ai-send" disabled={sending || !input.trim()} onClick={() => send()} aria-label="Enviar">
              {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            </button>
          </div>
        )}
      </div>

      {open && <div className="ai-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
