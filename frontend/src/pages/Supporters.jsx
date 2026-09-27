import { useEffect, useState } from 'react';
import { UserCheck, Ban, Send } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import WhatsAppMessageModal, { WaIcon } from '../components/WhatsAppMessageModal.jsx';
import { supporters } from '../config/resources.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api, { apiError } from '../api/client.js';

export default function Supporters() {
  const [waRow, setWaRow] = useState(null);
  const [candidate, setCandidate] = useState('Airton Artus');
  const [bulkSending, setBulkSending] = useState(false);
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    api.get('/settings')
      .then((r) => { const c = r.data?.campaign?.candidate; if (c) setCandidate(c); })
      .catch(() => {});
  }, []);

  async function sendAccessBulk() {
    if (!window.confirm('Enviar o acesso por WhatsApp (API oficial) para os cadastros NOVOS que ainda não têm acesso? Até 150 por vez (limite diário da Meta).')) return;
    setBulkSending(true);
    try {
      const { data } = await api.post('/supporters/send-access-bulk', { status: 'NOVO', limit: 150 });
      if (data.eligible === 0) {
        toast.success('Nenhum cadastro novo pendente de acesso.');
      } else {
        let msg = `Acesso enviado para ${data.sent} de ${data.eligible} novo(s).`;
        if (data.failed) msg += ` ${data.failed} falha(s).`;
        if (data.remaining) msg += ` Faltam ${data.remaining} — rode de novo depois (limite/dia).`;
        toast.success(msg);
      }
    } catch (e) {
      toast.error(apiError(e, 'Não foi possível enviar os acessos em lote.'));
    } finally {
      setBulkSending(false);
    }
  }

  const config = {
    ...supporters,
    toolbarExtra: user?.role === 'LIDER' ? (
      <button className="btn" onClick={sendAccessBulk} disabled={bulkSending} title="Enviar acesso aos cadastros novos sem acesso">
        <Send size={15} /> {bulkSending ? 'Enviando…' : 'Enviar acesso aos novos'}
      </button>
    ) : null,
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
