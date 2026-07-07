import { UserCheck, Ban } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import { supporters } from '../config/resources.jsx';
import api, { apiError } from '../api/client.js';

export default function Supporters() {
  const config = {
    ...supporters,
    rowActionsExtra: (row, reload, toast) => (
      <>
        {row.supportType === 'VOLUNTARIO' && row.status !== 'CONFIRMADO' && row.status !== 'BLACKLIST' && (
          <button
            className="btn btn-ghost btn-sm"
            title="Confirmar voluntário"
            onClick={async () => {
              try {
                await api.post(`/supporters/${row.id}/confirm`);
                toast.success('Voluntário confirmado!');
                reload();
              } catch (e) {
                toast.error(apiError(e));
              }
            }}
          >
            <UserCheck size={15} />
          </button>
        )}
        {row.status !== 'BLACKLIST' && (
          <button
            className="btn btn-ghost btn-sm"
            title="Mover para blacklist"
            onClick={async () => {
              const reason = window.prompt('Motivo para mover à blacklist:');
              if (reason === null) return;
              try {
                await api.post(`/supporters/${row.id}/blacklist`, { reason });
                toast.success('Movido para a blacklist.');
                reload();
              } catch (e) {
                toast.error(apiError(e));
              }
            }}
          >
            <Ban size={15} />
          </button>
        )}
      </>
    ),
  };

  return (
    <Layout title="Apoiadores e voluntários" subtitle="Base completa, com antifraude e confirmação automática via WhatsApp">
      <ResourcePage config={config} />
    </Layout>
  );
}
