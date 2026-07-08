import { useEffect, useState } from 'react';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export default function Header({ title, subtitle, onMenu }) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('aad_theme', theme); } catch (e) {}
  }, [theme]);

  return (
    <header className="topbar">
      <div className="flex items-center gap-12">
        <button className="icon-btn menu-toggle" onClick={onMenu} aria-label="Menu">
          <Menu size={18} />
        </button>
        <div className="topbar-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="topbar-actions">
        <span className="text-sm muted">
          Olá, <strong>{user?.name?.split(' ')[0]}</strong>
        </span>
        <button
          className="icon-btn"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-btn" onClick={logout} title="Sair">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
