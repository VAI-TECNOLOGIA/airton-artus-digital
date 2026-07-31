import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronDown, Circle, LayoutDashboard, MapPinned, BarChart3, UserPlus, Users,
  ShieldAlert, Ban, Megaphone, Image, Trophy, Footprints, CalendarDays, Package,
  Flag, MessageSquare, Inbox, Send, Bot, UserCog, Settings, Tv, Upload, LogOut, UserX,
} from 'lucide-react';
import DeleteAccountModal from '../DeleteAccountModal.jsx';

// Mapa explícito de ícones da navegação — evita `import * as` (que puxa a
// biblioteca lucide inteira para o bundle do layout).
const ICONS = {
  LayoutDashboard, MapPinned, BarChart3, UserPlus, Users, ShieldAlert, Ban,
  Megaphone, Image, Trophy, Footprints, CalendarDays, Package, Flag,
  MessageSquare, Inbox, Send, Bot, UserCog, Settings, Tv, Upload,
};
import { NAV, can } from '../../lib/permissions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Avatar from '../ui/Avatar.jsx';
import { label } from '../../config/enums.js';

const STORE_KEY = 'aad_nav_collapsed';
function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [deleting, setDeleting] = useState(false);

  const groups = [];
  NAV.forEach((item) => {
    if (item.section) groups.push({ section: item.section, items: [] });
    else if (can(user, item.roles)) {
      if (!groups.length) groups.push({ section: null, items: [] });
      groups[groups.length - 1].items.push(item);
    }
  });
  const visible = groups.filter((g) => g.items.length);

  function toggle(section) {
    setCollapsed((c) => {
      const next = { ...c, [section]: !c[section] };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark"><img src="/candidato.jpg" alt="Airton Artus" /></div>
        <div className="brand-text">
          <strong>Airton Artus</strong>
          <span>Digital</span>
        </div>
      </div>

      <nav className="nav">
        {visible.map((group, gi) => {
          const isCollapsed = group.section ? !!collapsed[group.section] : false;
          return (
            <div key={gi} className={`nav-group ${isCollapsed ? 'collapsed' : ''}`}>
              {group.section && (
                <button className="nav-section" onClick={() => toggle(group.section)} type="button">
                  <span>{group.section}</span>
                  <ChevronDown size={13} className="nav-chevron" />
                </button>
              )}
              <div className="nav-group-items">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon] || Circle;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                      onClick={onClose}
                    >
                      <Icon size={17} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <Avatar name={user?.name} src={user?.avatarUrl} size="avatar-sm" />
          <div className="user-chip-info">
            <strong>{user?.name}</strong>
            <span>{label('UserRole', user?.role)}</span>
          </div>
        </div>
        <div className="account-actions">
          <button type="button" className="account-btn" onClick={logout}>
            <LogOut size={15} /> Sair
          </button>
          <button type="button" className="account-btn danger" onClick={() => setDeleting(true)}>
            <UserX size={15} /> Excluir minha conta
          </button>
        </div>
      </div>
      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
    </aside>
  );
}
