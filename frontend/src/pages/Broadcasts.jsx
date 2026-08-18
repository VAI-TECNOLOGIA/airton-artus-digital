import { useEffect, useRef, useState } from 'react';
import { Plus, Send, Upload, Megaphone, X } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card } from '../components/ui/Card.jsx';
import Modal from '../components/ui/Modal.jsx';
import Field from '../components/ui/Field.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import { StatusBadge, Badge } from '../components/ui/Badge.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { label, options } from '../config/enums.js';

export default function Broadcasts() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({});
  const selectedTpl = templates.find((t) => t.name === form.templateName) || null;
  const [detail, setDetail] = useState(null);
  const [csv, setCsv] = useState('nome,telefone,cidade,bairro\nMaria,5551999990000,Porto Alegre,Centro');
  const [sendingState, setSendingState] = useState(null); // { sent, failed, total, pct } | null
  const cancelRef = useRef(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/broadcasts');
      setList(data.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    api.get('/broadcasts/templates').then(({ data }) => setTemplates(data.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prévia do template com as variáveis fixas preenchidas (o que a pessoa vai receber).
  function renderPreview(tpl, vars = {}) {
    return (tpl?.preview || '').replace(/\{(\w+)\}/g, (_, k) => {
      const v = tpl.vars.find((x) => x.key === k);
      if (v?.auto) return '(nome do contato)';
      return (vars[k] || '').trim() || `{${k}}`;
    });
  }

  function pickTemplate(name) {
    const tpl = templates.find((t) => t.name === name) || null;
    setForm((s) => ({
      ...s,
      templateName: name || null,
      templateVars: {},
      // guarda a prévia como "mensagem" pra passar a validação e aparecer no relatório
      message: tpl ? renderPreview(tpl, {}) : (s.message || ''),
    }));
  }

  async function create() {
    try {
      const payload = { ...form };
      if (form.templateName && selectedTpl) {
        payload.message = renderPreview(selectedTpl, form.templateVars || {});
      }
      await api.post('/broadcasts', payload);
      toast.success('Campanha criada!');
      setCreateOpen(false);
      setForm({});
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  async function openDetail(row) {
    const { data } = await api.get(`/broadcasts/${row.id}`);
    setDetail(data);
  }
  async function importContacts() {
    try {
      const { data } = await api.post(`/broadcasts/${detail.id}/contacts`, { csv });
      toast.success(`${data.imported} contatos importados.`);
      openDetail(detail);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  }
  // Bug 2: dispara em lotes com progresso; cada request responde rápido (202).
  async function send() {
    if (sendingState) return;
    const id = detail.id;
    const total = detail.totalContacts || 0;
    if (!total) { toast.error('Importe contatos antes de disparar.'); return; }
    cancelRef.current = false;
    setSendingState({ sent: detail.sentCount || 0, failed: detail.failedCount || 0, total, pct: 0 });
    try {
      let done = false;
      while (!done && !cancelRef.current) {
        const { data } = await api.post(`/broadcasts/${id}/send`);
        const processed = data.sentCount + data.failedCount;
        setSendingState({ sent: data.sentCount, failed: data.failedCount, total: data.totalContacts || total, pct: total ? Math.round((processed / total) * 100) : 100 });
        done = data.done;
        if (!done && data.sent === 0 && data.failed === 0) break; // nada a processar — evita loop
      }
      if (cancelRef.current) { await api.post(`/broadcasts/${id}/pause`).catch(() => {}); toast.success('Envio pausado.'); }
      else toast.success('Disparo concluído!');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSendingState(null);
      cancelRef.current = false;
      openDetail({ id });
      load();
    }
  }
  function cancelSend() { cancelRef.current = true; }

  const columns = [
    { key: 'name', label: 'Campanha', render: (r) => <div className="cell-strong">{r.name}</div> },
    { key: 'channel', label: 'Canal', render: (r) => <Badge tone="blue">{label('Channel', r.channel)}</Badge> },
    { key: 'contacts', label: 'Contatos', render: (r) => r._count?.contacts ?? r.totalContacts ?? 0 },
    { key: 'sent', label: 'Enviados', render: (r) => r.sentCount },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge group="BroadcastStatus" value={r.status} /> },
  ];

  return (
    <Layout title="Disparador da equipe" subtitle="Campanhas com variáveis e relatório — pronto para API Oficial">
      <div className="warning-box" style={{ marginBottom: 16 }}>
        <span>
          WhatsApp oficial <strong>conectado</strong> (Meta Cloud API) no número da campanha. Para disparar à
          <strong> base inteira</strong>, escolha um <strong>modelo aprovado</strong> ao criar a campanha —
          modelos entregam mesmo sem conversa aberta. O <strong>texto livre</strong> só chega a quem trocou
          mensagem com o número nas últimas 24h (regra da Meta).
        </span>
      </div>

      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => { setForm({ channel: 'WHATSAPP' }); setCreateOpen(true); }}>
          <Plus size={16} /> Nova campanha
        </button>
      </div>

      <Card noBody>
        {loading ? (
          <LoadingBox />
        ) : (
          <DataTable
            columns={columns}
            rows={list}
            empty={<EmptyState icon={Megaphone} title="Nenhuma campanha" message="Crie uma campanha de disparo para sua base." />}
            actions={(row) => (
              <button className="btn btn-ghost btn-sm" onClick={() => openDetail(row)}>Abrir</button>
            )}
          />
        )}
      </Card>

      {createOpen && (
        <Modal
          title="Nova campanha de disparo"
          onClose={() => setCreateOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCreateOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={create}>Criar</button>
            </>
          }
        >
          <Field field={{ name: 'name', label: 'Nome da campanha', required: true }} value={form.name} onChange={(n, v) => setForm((s) => ({ ...s, [n]: v }))} />
          <Field field={{ name: 'channel', label: 'Canal', type: 'select', options: options('Channel') }} value={form.channel} onChange={(n, v) => setForm((s) => ({ ...s, [n]: v }))} />

          {/* Seletor de modelo oficial — resolve o "botão pra usar o template". */}
          <div className="field">
            <label>Tipo de mensagem</label>
            <select className="select" value={form.templateName || ''} onChange={(e) => pickTemplate(e.target.value)}>
              <option value="">Texto livre (só entrega dentro da janela de 24h)</option>
              <optgroup label="Modelos aprovados (API Oficial — entregam à base fria)">
                {templates.map((t) => (
                  <option key={t.name} value={t.name}>{t.label} · {t.category === 'UTILITY' ? 'Utilidade' : 'Marketing'}</option>
                ))}
              </optgroup>
            </select>
            {selectedTpl && <div className="field-hint">{selectedTpl.description}</div>}
          </div>

          {selectedTpl ? (
            <>
              {selectedTpl.vars.filter((v) => !v.auto).map((v) => (
                <Field
                  key={v.key}
                  field={{ name: v.key, label: v.label, required: true, placeholder: v.placeholder }}
                  value={form.templateVars?.[v.key] || ''}
                  onChange={(n, val) => setForm((s) => ({ ...s, templateVars: { ...(s.templateVars || {}), [n]: val } }))}
                />
              ))}
              <div className="field">
                <label>Prévia da mensagem</label>
                <div className="tpl-preview">{renderPreview(selectedTpl, form.templateVars || {})}</div>
                <div className="field-hint">O nome de cada contato entra automaticamente. Modelo aprovado pela Meta — entrega mesmo sem conversa aberta.</div>
              </div>
            </>
          ) : (
            <Field
              field={{ name: 'message', label: 'Mensagem', type: 'textarea', rows: 4, hint: 'Variáveis: {{nome}}, {{cidade}}, {{bairro}}, {{responsavel}}' }}
              value={form.message}
              onChange={(n, v) => setForm((s) => ({ ...s, [n]: v }))}
            />
          )}
        </Modal>
      )}

      {detail && (
        <Modal title={detail.name} wide onClose={() => setDetail(null)}>
          <div className="grid stats-grid" style={{ marginBottom: 18 }}>
            <div className="stat-card"><div className="stat-meta"><div className="stat-label">Total</div><div className="stat-value">{detail.totalContacts}</div></div></div>
            <div className="stat-card"><div className="stat-meta"><div className="stat-label">Enviados</div><div className="stat-value" style={{ color: 'var(--green-rs)' }}>{detail.sentCount}</div></div></div>
            <div className="stat-card"><div className="stat-meta"><div className="stat-label">Pendentes</div><div className="stat-value" style={{ color: 'var(--amber)' }}>{detail.pendingCount}</div></div></div>
            <div className="stat-card"><div className="stat-meta"><div className="stat-label">Falhas</div><div className="stat-value" style={{ color: 'var(--red)' }}>{detail.failedCount}</div></div></div>
          </div>

          <div className="field">
            <label>Mensagem</label>
            <div className="media-caption">{detail.message}</div>
          </div>

          <div className="field">
            <label>Importar contatos (CSV)</label>
            <textarea className="textarea" rows={4} value={csv} onChange={(e) => setCsv(e.target.value)} />
            <div className="flex gap-8" style={{ marginTop: 8 }}>
              <button className="btn" onClick={importContacts} disabled={!!sendingState}><Upload size={15} /> Importar</button>
              {sendingState ? (
                <button className="btn btn-danger" onClick={cancelSend}><X size={15} /> Cancelar envio</button>
              ) : (
                <button className="btn btn-primary" onClick={send}><Send size={15} /> Disparar pendentes</button>
              )}
            </div>
            {sendingState && (
              <div className="bc-progress" style={{ marginTop: 12 }}>
                <div className="bc-progress-bar"><div className="bc-progress-fill" style={{ width: `${sendingState.pct}%` }} /></div>
                <div className="bc-progress-info">
                  Enviando… <b>{sendingState.sent}</b> enviados · {sendingState.failed} falhas · {sendingState.total} total ({sendingState.pct}%)
                </div>
              </div>
            )}
          </div>

          {detail.contacts?.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th>Nome</th><th>Telefone</th><th>Local</th><th>Status</th></tr></thead>
                <tbody>
                  {detail.contacts.slice(0, 50).map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td className="cell-muted">{[c.neighborhood, c.cityName].filter(Boolean).join(', ')}</td>
                      <td><StatusBadge group="BroadcastContactStatus" value={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}
