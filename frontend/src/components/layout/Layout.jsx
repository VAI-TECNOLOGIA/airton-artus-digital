import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import AiAssistant from '../ai/AiAssistant.jsx';

export default function Layout({ title, subtitle, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <div className="main">
        <Header title={title} subtitle={subtitle} onMenu={() => setOpen(true)} />
        <div className="content">{children}</div>
      </div>
      <AiAssistant />
    </div>
  );
}
