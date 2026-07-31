import { useState } from 'react';
import { Users } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import GuestListModal from '../components/GuestListModal.jsx';
import { events } from '../config/resources.jsx';

export default function Agenda() {
  const [guestEvent, setGuestEvent] = useState(null);

  const config = {
    ...events,
    rowActionsExtra: (row) => (
      <button
        className="btn btn-ghost btn-sm"
        title="Lista de convidados"
        onClick={() => setGuestEvent(row)}
      >
        <Users size={15} />
      </button>
    ),
  };

  return (
    <Layout title="Agenda da campanha" subtitle="Eventos, reuniões, caminhadas e prazos — com lista de convidados">
      <ResourcePage config={config} />
      {guestEvent && <GuestListModal event={guestEvent} onClose={() => setGuestEvent(null)} />}
    </Layout>
  );
}
