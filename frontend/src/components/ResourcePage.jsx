import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Card } from './ui/Card.jsx';
import DataTable from './ui/DataTable.jsx';
import Modal from './ui/Modal.jsx';
import Field from './ui/Field.jsx';
import { LoadingBox } from './ui/Spinner.jsx';
import EmptyState from './ui/EmptyState.jsx';
import { options } from '../config/enums.js';
import { toInputDate } from '../lib/format.js';

/** Página de recurso genérica: lista paginada com busca, filtros e CRUD em modal. */
export default function ResourcePage({ config }) {
  const toast = useToast();
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [lookups, setLookups] = useState({});
  const [lookupRaw, setLookupRaw] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const has = (roles) => !roles || !user || roles.includes(user.role);
  const canCreate = config.create !== false && has(config.writeRoles);
  const canEdit = config.edit !== false && has(config.writeRoles);
  const canDelete = config.delete !== false && has(config.deleteRoles || config.writeRoles);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filterValues };
      if (search) params.search = search;
      const { data } = await api.get(config.endpoint, { params });
      setRows(data.data || data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.endpoint, search, JSON.stringify(filterValues)]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    (async () => {
      const map = {};
      const raw = {};
      for (const lk of config.lookups || []) {
        try {
          const { data } = await api.get(lk.endpoint, { params: lk.params });
          const items = data.data || data;
          raw[lk.key] = items;
          map[lk.key] = items.map((it) => ({
            value: it[lk.valueKey || 'id'],
            label: lk.labelFn ? lk.labelFn(it) : it[lk.labelKey || 'name'],
          }));
        } catch {
          map[lk.key] = [];
          raw[lk.key] = [];
        }
      }
      setLookups(map);
      setLookupRaw(raw);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resolveField(f) {
    if (f.optionsFrom) {
      const resolved = { ...f, type: f.type === 'datalist' ? 'datalist' : 'select', options: lookups[f.optionsFrom] || [] };
      // Ao escolher a região, mostra o coordenador responsável (vem no lookup).
      if (f.optionsFrom === 'regions' && form[f.name]) {
        const region = (lookupRaw.regions || []).find((r) => r.id === form[f.name]);
        const c = region?.coordinator;
        resolved.hint = c
          ? `Coordenador responsável: ${c.name}${c.phone ? ' · ' + c.phone : ''}`
          : 'Sem coordenador definido para esta região (defina em Configurações → Regiões).';
      }
      return resolved;
    }
    if (f.enumGroup) return { ...f, type: 'select', options: options(f.enumGroup) };
    return f;
  }

  function openCreate() {
    setForm({ ...(config.defaultValues || {}) });
    setErrors({});
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row) {
    const f = {};
    for (const field of config.fields || []) {
      let v = row[field.name];
      if (field.type === 'date') v = toInputDate(v);
      f[field.name] = v ?? '';
    }
    setForm(f);
    setEditing(row);
    setModalOpen(true);
  }

  async function submit() {
    // Bug 10: validação por campo antes de enviar.
    const fieldErrors = {};
    for (const f of config.fields || []) {
      const v = form[f.name];
      if (f.required && (v == null || String(v).trim() === '')) fieldErrors[f.name] = `${f.label} é obrigatório.`;
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      const labels = (config.fields || []).filter((f) => fieldErrors[f.name]).map((f) => f.label);
      toast.error(`Preencha: ${labels.join(', ')}.`);
      // foca o primeiro campo inválido
      const first = (config.fields || []).find((f) => fieldErrors[f.name]);
      setTimeout(() => document.querySelector(`[data-field="${first?.name}"]`)?.focus(), 0);
      return;
    }
    setErrors({});

    const payload = {};
    for (const f of config.fields || []) {
      let v = form[f.name];
      if (v === '') v = null;
      if (f.type === 'number' && v != null) v = Number(v);
      payload[f.name] = v;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`${config.endpoint}/${editing.id}`, payload);
        toast.success('Registro atualizado!');
      } else {
        const { data } = await api.post(config.endpoint, payload);
        config.onCreated?.(data, toast);
        toast.success('Registro criado com sucesso!');
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function del(row) {
    const name = row[config.titleField || 'name'] || row.title || 'este registro';
    if (!window.confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`${config.endpoint}/${row.id}`);
      toast.success('Registro excluído.');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  const renderActions =
    canEdit || canDelete || config.rowActionsExtra
      ? (row) => (
          <>
            {config.rowActionsExtra?.(row, load, toast)}
            {canEdit && (
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)} title="Editar">
                <Pencil size={15} />
              </button>
            )}
            {canDelete && (
              <button className="btn btn-ghost btn-sm" onClick={() => del(row)} title="Excluir">
                <Trash2 size={15} />
              </button>
            )}
          </>
        )
      : null;

  return (
    <>
      <div className="toolbar">
        {config.searchable !== false && (
          <div className="search">
            <Search size={16} />
            <input
              className="input"
              placeholder={config.searchPlaceholder || 'Buscar...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        {(config.filters || []).map((f) => {
          const opts = f.enumGroup ? options(f.enumGroup) : f.options || [];
          return (
            <select
              key={f.name}
              className="select"
              style={{ width: 'auto' }}
              value={filterValues[f.name] || ''}
              onChange={(e) => setFilterValues((v) => ({ ...v, [f.name]: e.target.value }))}
            >
              <option value="">{f.label}</option>
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        })}
        <div className="spacer" />
        {canCreate && config.fields && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {config.createLabel || 'Novo'}
          </button>
        )}
      </div>

      <Card noBody>
        {loading ? (
          <LoadingBox />
        ) : (
          <DataTable
            columns={config.columns}
            rows={rows}
            actions={renderActions}
            empty={
              <EmptyState
                title="Nenhum registro encontrado"
                message={config.emptyMessage}
                action={
                  canCreate && config.fields ? (
                    <button className="btn btn-primary" onClick={openCreate}>
                      <Plus size={16} /> {config.createLabel || 'Novo'}
                    </button>
                  ) : null
                }
              />
            }
          />
        )}
      </Card>

      {modalOpen && (
        <Modal
          title={editing ? `Editar ${config.singular || ''}` : config.createLabel || 'Novo registro'}
          onClose={() => setModalOpen(false)}
          wide={config.wideForm}
          footer={
            <>
              <button className="btn" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={saving} onClick={submit}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            {(config.fields || []).map((f) => (
              <Field
                key={f.name}
                field={resolveField(f)}
                value={form[f.name]}
                error={errors[f.name]}
                onChange={(name, val) => { setForm((s) => ({ ...s, [name]: val })); setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e)); }}
              />
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
