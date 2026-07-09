import { useEffect, useState } from 'react';
import { UserCheck, Ban } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import WhatsAppMessageModal, { WaIcon } from '../components/WhatsAppMessageModal.jsx';
import { supporters } from '../config/resources.jsx';
import api, { apiError } from '../api/client.js';

export default function Supporters() {
  const [waRow, setWaRow] = useState(null);
  const [candidate, setCandidate] = useState('Airton Artus');

  useEffect(() => {
    api.get('/settings')
      .then((r) => { const c = r.data?.campaign?.candidate; if (c) setCandidate(c); })
      .catch(() => {});
  }, []);

  const config = {
    ...supporters,
    rowActionsExtra: (row, reload, toast) => (
      <>
        <button
          className="btn btn-ghost btn-sm"
          title="Enviar acesso por WhatsApp"
          onClick={() => setWaRow(row)}
        >
          <WaIcon size={15} />
        </button>

        {row.supportType === 'VOLUNTARIO' && row.status !== 'CONFIRMADO' && row.status !== 'BLACKLIST' && (
          <button
            className="btn btn-ghost btn-sm"
            title="Confirmar voluntário"
            onClick={async () => {
              try {
                await api.post(`/supporters/${row.id}/confirm`);
                toast.success('Voluntário confirmado! Envie o acesso pelo WhatsApp.');
                reload();
                // Abre o envio de boas-vindas já com o texto pós-confirmação.
                setWaRow({ ...row, status: 'CONFIRMADO' });
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
    <Layout title="Apoiadores e voluntários" subtitle="Base completa, com antifraude e envio de acesso via WhatsApp">
      <ResourcePage config={config} />
      {waRow && (
        <WhatsAppMessageModal
          supporter={waRow}
          candidate={candidate}
          onClose={() => setWaRow(null)}
        />
      )}
    </Layout>
  );
}
