import { useEffect, useState } from 'react';
import { ShieldAlert, Check, Ban, Trash2 } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card } from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { formatPhone } from '../lib/format.js';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Suspects() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/supporters/suspects');
      setRows(data.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(row) {
    try {
      await api.put(`/supporters/${row.id}`, { status: 'ATIVO', flaggedReason: null });
      toast.success('Cadastro aprovado.');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  }
  async function block(row) {
    const reason = window.prompt('Motivo:') || 'Suspeita confirmada';
    try {
      await api.post(`/supporters/${row.id}/blacklist`, { reason });
      toast.success('Movido para a blacklist.');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  }
  async function del(row) {
    if (!window.confirm('Excluir este cadastro?')) return;
    try {
      await api.delete(`/supporters/${row.id}`);
      toast.success('Excluído.');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  const columns = [
    { key: 'name', label: 'Nome', render: (r) => <div className="cell-strong">{r.name}</div> },
    { key: 'phone', label: 'Telefone', render: (r) => formatPhone(r.phone) },
    { key: 'reason', label: 'Motivo da suspeita', render: (r) => <span className="cell-muted">{r.flaggedReason || '—'}</span> },
    { key: 'dup', label: 'Duplicado de', render: (r) => r.duplicateOf?.name ? <span className="cell-strong">{r.duplicateOf.name}</span> : <span className="cell-muted">Não identificado</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge group="SupporterStatus" value={r.status} /> },
  ];

  return (
    <Layout title="Suspeitos" subtitle="Análise manual de cadastros com telefone duplicado">
      <Card noBody>
        {loading ? (
          <LoadingBox />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            empty={<EmptyState icon={ShieldAlert} title="Nenhum suspeito" message="Cadastros com telefone duplicado aparecem aqui para revisão." />}
            actions={(row) => (
              <>
                <button className="btn btn-ghost btn-sm" title="Aprovar" onClick={() => approve(row)}>
                  <Check size={15} />
                </button>
                <button className="btn btn-ghost btn-sm" title="Blacklist" onClick={() => block(row)}>
                  <Ban size={15} />
                </button>
                <button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => del(row)}>
                  <Trash2 size={15} />
                </button>
              </>
            )}
          />
        )}
      </Card>
    </Layout>
  );
}
