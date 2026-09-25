import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import api from '../api/client.js';

function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function NotificationBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.data || []);
      setUnread(data.unread || 0);
    } catch { /* silencioso — sino não pode quebrar a tela */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function markAll() {
    try {
      const { data } = await api.post('/notifications/read', { all: true });
      setUnread(data.unread ?? 0);
      setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    } catch { /* noop */ }
  }

  async function openItem(n) {
    if (!n.readAt) {
      try { await api.post('/notifications/read', { id: n.id }); } catch { /* noop */ }
      setUnread((u) => Math.max(0, u - 1));
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    setOpen(false);
    if (n.link) nav(n.link);
  }

  return (
    <div className="notif" ref={ref}>
      <button className="icon-btn notif-btn" onClick={() => setOpen((o) => !o)} title="Notificações" aria-label="Notificações">
        <Bell size={18} />
        {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-pop" role="menu">
          <div className="notif-head">
            <strong>Notificações</strong>
            {unread > 0 && (
              <button className="notif-mark" onClick={markAll}><Check size={13} /> Marcar todas como lidas</button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">Nenhuma notificação por aqui.</div>
            ) : (
              items.map((n) => (
                <button key={n.id} className={`notif-item ${n.readAt ? '' : 'unread'}`} onClick={() => openItem(n)}>
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-body">{n.body}</div>
                  <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
