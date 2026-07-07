import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import Modal from '../components/ui/Modal.jsx';
import Field from '../components/ui/Field.jsx';
import { Badge, StatusBadge } from '../components/ui/Badge.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { label, options, LABELS } from '../config/enums.js';

const COLUMNS = ['NOVA', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDA', 'ARQUIVADA'];

const FIELDS = [
  { name: 'citizenName', label: 'Nome do cidadão', required: true, full: true },
  { name: 'phone', label: 'Telefone', type: 'tel' },
  { name: 'category', label: 'Categoria', type: 'select', options: options('DemandCategory'), required: true },
  { name: 'priority', label: 'Prioridade', type: 'select', options: options('Priority') },
  { name: 'cityName', label: 'Cidade' },
  { name: 'neighborhood', label: 'Bairro' },
  { name: 'description', label: 'Descrição da demanda', type: 'textarea', full: true, required: true },
];

export default function Demands() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/demands', { params: { pageSize: 500 } });
      setItems(data.data);
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

  async function move(demand, status) {
    setItems((arr) => arr.map((d) => (d.id === demand.id ? { ...d, status } : d)));
    try {
      await api.put(`/demands/${demand.id}`, { status });
    } catch (e) {
      toast.error(apiError(e));
      load();
    }
  }

  async function submit() {
    setSaving(true);
    try {
      await api.post('/demands', form);
      toast.success('Demanda registrada!');
      setOpen(false);
      setForm({});
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Departamento de demandas" subtitle="Pedidos da população organizados em quadro Kanban">
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => { setForm({ category: 'OUTROS', priority: 'MEDIA' }); setOpen(true); }}>
          <Plus size={16} /> Nova demanda
        </button>
      </div>

      {loading ? (
        <LoadingBox />
      ) : (
        <div className="kanban">
          {COLUMNS.map((col) => {
            const cards = items.filter((d) => d.status === col);
            return (
              <div className="kanban-col" key={col}>
                <div className="kanban-col-head">
                  <span>{LABELS.DemandStatus[col]}</span>
                  <span className="kanban-count">{cards.length}</span>
                </div>
                <div className="kanban-col-body">
                  {cards.map((d) => (
                    <div className="kanban-card" key={d.id}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                        <Badge tone="blue">{label('DemandCategory', d.category)}</Badge>
                        <StatusBadge group="Priority" value={d.priority} />
                      </div>
                      <h5>{d.citizenName}</h5>
                      <p>{d.description}</p>
                      <div className="text-sm muted" style={{ marginBottom: 8 }}>{[d.neighborhood, d.cityName].filter(Boolean).join(', ')}</div>
                      <select className="select" style={{ padding: '5px 8px', fontSize: 12 }} value={d.status} onChange={(e) => move(d, e.target.value)}>
                        {COLUMNS.map((c) => (
                          <option key={c} value={c}>{LABELS.DemandStatus[c]}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {cards.length === 0 && <div className="text-sm muted" style={{ padding: 10, textAlign: 'center' }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal
          title="Nova demanda"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Salvando...' : 'Registrar'}</button>
            </>
          }
        >
          <div className="form-grid">
            {FIELDS.map((f) => (
              <Field key={f.name} field={f} value={form[f.name]} onChange={(n, v) => setForm((s) => ({ ...s, [n]: v }))} />
            ))}
          </div>
        </Modal>
      )}
    </Layout>
  );
}
