import { useState } from 'react';
import { History, Package } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import Modal from '../components/ui/Modal.jsx';
import { StatusBadge, Badge } from '../components/ui/Badge.jsx';
import { formatDate } from '../lib/format.js';
import { options } from '../config/enums.js';
import api, { apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function MaterialRequests() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = ['LIDER', 'MEMBRO', 'MEMBRO'].includes(user?.role);
  const [historyFor, setHistoryFor] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  async function openHistory(row) {
    setHistoryFor(row);
    setHistoryData(null);
    try {
      const { data } = await api.get(`/material-requests/history/${row.requesterId}`);
      setHistoryData(data);
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  async function changeStatus(row, status, reload) {
    try {
      await api.patch(`/material-requests/${row.id}/status`, { status });
      toast.success(`Status atualizado para ${status}.`);
      reload();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  const config = {
    endpoint: '/material-requests',
    singular: 'pedido',
    createLabel: 'Solicitar material',
    titleField: 'materialName',
    searchable: false,
    edit: false,
    delete: false,
    lookups: [{ key: 'materials', endpoint: '/materials', valueKey: 'name', labelKey: 'name' }],
    filters: [{ name: 'status', label: 'Status', enumGroup: 'MaterialRequestStatus' }],
    columns: [
      { key: 'materialName', label: 'Material', render: (r) => <div className="cell-strong">{r.quantity}× {r.materialName}</div> },
      { key: 'requester', label: 'Solicitante', render: (r) => r.requester?.name || '—' },
      { key: 'local', label: 'Local', render: (r) => [r.neighborhood, r.cityName].filter(Boolean).join(', ') || '—' },
      { key: 'requestedAt', label: 'Solicitado', render: (r) => formatDate(r.createdAt) },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge group="MaterialRequestStatus" value={r.status} /> },
    ],
    fields: [
      { name: 'materialName', label: 'Material', optionsFrom: 'materials', required: true },
      { name: 'quantity', label: 'Quantidade', type: 'number', required: true },
      { name: 'justification', label: 'Justificativa', type: 'textarea', full: true },
      { name: 'cityName', label: 'Cidade' },
      { name: 'neighborhood', label: 'Bairro' },
      { name: 'deliveryAddress', label: 'Endereço de entrega', full: true },
    ],
    rowActionsExtra: (row, reload) => (
      <>
        {canManage && (
          <select
            className="select select-compact"
            value={row.status}
            onChange={(e) => changeStatus(row, e.target.value, reload)}
          >
            {options('MaterialRequestStatus').map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
        {row.requesterId && (
          <button className="btn btn-ghost btn-sm" title="Histórico do solicitante" onClick={() => openHistory(row)}>
            <History size={15} />
          </button>
        )}
      </>
    ),
  };

  return (
    <Layout title="Solicitações de material" subtitle="Faixas, adesivos, camisetas e mais — com controle anti-desperdício">
      <ResourcePage config={config} />

      {historyFor && (
        <Modal title={`Histórico de ${historyFor.requester?.name || 'solicitante'}`} onClose={() => setHistoryFor(null)}>
          {!historyData ? (
            <p className="muted">Carregando...</p>
          ) : (
            <>
              <h4 style={{ marginBottom: 10 }}>Já recebido (entregue)</h4>
              {historyData.deliveredTotals.length === 0 ? (
                <p className="muted">Nenhuma entrega registrada ainda.</p>
              ) : (
                <div className="chip-row" style={{ marginBottom: 18 }}>
                  {historyData.deliveredTotals.map((t) => (
                    <Badge key={t.material} tone="green">{t.quantity}× {t.material}</Badge>
                  ))}
                </div>
              )}
              <h4 style={{ margin: '10px 0' }}>Todos os pedidos</h4>
              <div className="rank-list">
                {historyData.history.map((h) => (
                  <div className="rank-row" key={h.id}>
                    <Package size={16} className="muted" />
                    <div className="rank-info">
                      <strong>{h.quantity}× {h.materialName}</strong>
                      <span>{formatDate(h.createdAt)}</span>
                    </div>
                    <StatusBadge group="MaterialRequestStatus" value={h.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </Layout>
  );
}
