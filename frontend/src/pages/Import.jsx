import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Download, Check, AlertTriangle, ArrowRight, X } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card } from '../components/ui/Card.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { options } from '../config/enums.js';

/* Campos do sistema que podem ser preenchidos pela planilha. */
const FIELDS = [
  { key: 'name', label: 'Nome', required: true, aliases: ['nome', 'name', 'nome completo', 'apoiador', 'contato'] },
  { key: 'phone', label: 'Telefone', required: true, aliases: ['telefone', 'phone', 'celular', 'fone', 'tel', 'whatsapp', 'whats', 'numero', 'número'] },
  { key: 'whatsapp', label: 'WhatsApp', aliases: ['whatsapp', 'whats', 'zap'] },
  { key: 'email', label: 'E-mail', aliases: ['email', 'e-mail', 'e mail', 'mail'] },
  { key: 'cpf', label: 'CPF', aliases: ['cpf', 'documento'] },
  { key: 'cep', label: 'CEP', aliases: ['cep', 'codigo postal', 'código postal'] },
  { key: 'street', label: 'Endereço (rua)', aliases: ['endereco', 'endereço', 'rua', 'logradouro', 'street', 'address'] },
  { key: 'number', label: 'Número', aliases: ['numero', 'número', 'num', 'nº', 'number'] },
  { key: 'complement', label: 'Complemento', aliases: ['complemento', 'compl', 'complement'] },
  { key: 'neighborhood', label: 'Bairro', aliases: ['bairro', 'neighborhood', 'district'] },
  { key: 'cityName', label: 'Cidade', aliases: ['cidade', 'municipio', 'município', 'city', 'localidade'] },
  { key: 'instagram', label: 'Instagram', aliases: ['instagram', 'insta', 'ig'] },
  { key: 'facebook', label: 'Facebook', aliases: ['facebook', 'face', 'fb'] },
  { key: 'notes', label: 'Observações', aliases: ['observacao', 'observação', 'observacoes', 'observações', 'obs', 'notas', 'notes'] },
];

const IGNORE = '__ignorar__';
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const CHUNK = 400;

export default function Import() {
  const toast = useToast();
  const fileRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]); // array de objetos { header: valor }
  const [mapping, setMapping] = useState({}); // fieldKey -> header (ou IGNORE)
  const [defaultType, setDefaultType] = useState('MATERIAL_DIGITAL');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const supportTypeOptions = options('SupportType');

  /* ---------- Leitura do arquivo (xlsx/xls/csv) ---------- */
  function handleFile(file) {
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
        if (!json.length) { toast.error('A planilha está vazia.'); return; }
        const hdr = json[0].map((h) => String(h).trim()).filter((h, i, a) => h !== '' || a.length);
        const dataRows = json.slice(1)
          .map((arr) => { const o = {}; hdr.forEach((h, i) => { o[h] = arr[i] != null ? String(arr[i]).trim() : ''; }); return o; })
          .filter((o) => Object.values(o).some((v) => v !== ''));
        setHeaders(hdr);
        setRows(dataRows);
        setFileName(file.name);
        setMapping(autoMap(hdr));
      } catch (err) {
        toast.error('Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /* Adivinha o mapeamento pelo nome das colunas. */
  function autoMap(hdr) {
    const map = {};
    const used = new Set();
    for (const f of FIELDS) {
      const match = hdr.find((h) => !used.has(h) && (norm(h) === norm(f.label) || f.aliases.includes(norm(h))));
      if (match) { map[f.key] = match; used.add(match); }
      else map[f.key] = IGNORE;
    }
    return map;
  }

  const nameCol = mapping.name && mapping.name !== IGNORE ? mapping.name : null;
  const phoneCol = mapping.phone && mapping.phone !== IGNORE ? mapping.phone : null;
  const canImport = rows.length > 0 && nameCol && phoneCol && !importing;

  /* Linhas mapeadas para o formato do sistema. */
  const mapped = useMemo(() => {
    if (!rows.length) return [];
    return rows.map((r, i) => {
      const o = { _row: i + 2 }; // +2: cabeçalho é a linha 1
      for (const f of FIELDS) {
        const col = mapping[f.key];
        if (col && col !== IGNORE) o[f.key] = r[col] || '';
      }
      return o;
    });
  }, [rows, mapping]);

  const preview = mapped.slice(0, 6);

  /* ---------- Envio em blocos com barra de progresso ---------- */
  async function runImport() {
    setImporting(true);
    setProgress(0);
    const total = mapped.length;
    const acc = { received: 0, imported: 0, duplicates: 0, blacklisted: 0, invalid: 0, errors: [] };
    try {
      for (let i = 0; i < total; i += CHUNK) {
        const slice = mapped.slice(i, i + CHUNK);
        const { data } = await api.post('/supporters/import', { rows: slice, defaults: { supportType: defaultType } });
        acc.received += data.received || 0;
        acc.imported += data.imported || 0;
        acc.duplicates += data.duplicates || 0;
        acc.blacklisted += data.blacklisted || 0;
        acc.invalid += data.invalid || 0;
        if (data.errors) acc.errors.push(...data.errors.slice(0, 50 - acc.errors.length));
        setProgress(Math.min(100, Math.round(((i + slice.length) / total) * 100)));
      }
      setResult(acc);
      toast.success(`${acc.imported} contato(s) importado(s)!`);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFileName(''); setHeaders([]); setRows([]); setMapping({}); setResult(null); setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  }

  function downloadTemplate() {
    const cols = ['Nome', 'Telefone', 'E-mail', 'CPF', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Cidade', 'Instagram', 'Observações'];
    const ex = ['Maria da Silva', '51999887766', 'maria@email.com', '', '95800-000', 'Rua Exemplo', '123', 'Apto 4', 'Centro', 'Venâncio Aires', '@maria', 'Indicada pelo João'];
    const ws = XLSX.utils.aoa_to_sheet([cols, ex]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');
    XLSX.writeFile(wb, 'modelo-importacao-apoiadores.xlsx');
  }

  return (
    <Layout title="Importar contatos" subtitle="Adicione vários apoiadores de uma vez a partir de uma planilha (Excel ou CSV)">
      {/* Passo 1 — arquivo */}
      {!rows.length && !result && (
        <Card noBody>
          <div className="card-body">
            <div
              className={'import-drop' + (dragOver ? ' over' : '')}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <div className="import-drop-ic"><Upload size={30} /></div>
              <h3>Arraste a planilha aqui ou clique para escolher</h3>
              <p>Formatos aceitos: <b>Excel (.xlsx, .xls)</b> ou <b>CSV</b>. A primeira linha deve conter os títulos das colunas.</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
            <div className="import-help">
              <div className="import-help-txt">
                <FileSpreadsheet size={18} />
                <span>Não tem um modelo? Baixe a planilha de exemplo com as colunas certas.</span>
              </div>
              <button className="btn" onClick={downloadTemplate}><Download size={15} /> Baixar modelo</button>
            </div>
          </div>
        </Card>
      )}

      {/* Passo 2 — mapear + prévia */}
      {rows.length > 0 && !result && (
        <>
          <Card noBody>
            <div className="card-head">
              <div className="card-title"><FileSpreadsheet size={16} /> {fileName} · <span className="card-subtitle">{rows.length} linha(s)</span></div>
              <button className="btn btn-sm btn-ghost" onClick={reset}><X size={14} /> Trocar arquivo</button>
            </div>
            <div className="card-body">
              <h4 className="import-sec">1 · Relacione as colunas</h4>
              <p className="import-note">O sistema tentou adivinhar. Ajuste se precisar. <b>Nome</b> e <b>Telefone</b> são obrigatórios.</p>
              <div className="import-map">
                {FIELDS.map((f) => (
                  <div className="import-map-row" key={f.key}>
                    <label>{f.label}{f.required && <span className="req"> *</span>}</label>
                    <select
                      className="select"
                      value={mapping[f.key] || IGNORE}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    >
                      <option value={IGNORE}>— não importar —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <h4 className="import-sec">2 · Tipo de apoio padrão</h4>
              <p className="import-note">Aplicado a todos os contatos importados (você pode reclassificar depois em Apoiadores).</p>
              <select className="select" style={{ maxWidth: 320 }} value={defaultType} onChange={(e) => setDefaultType(e.target.value)}>
                {supportTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {(!nameCol || !phoneCol) && (
                <div className="warning-box" style={{ marginTop: 16 }}>
                  <AlertTriangle size={16} /> Selecione as colunas de <b>Nome</b> e <b>Telefone</b> para continuar.
                </div>
              )}
            </div>
          </Card>

          <Card noBody>
            <div className="card-head"><div className="card-title">Prévia (primeiras {preview.length} linhas)</div></div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {FIELDS.filter((f) => mapping[f.key] && mapping[f.key] !== IGNORE).map((f) => <th key={f.key}>{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      {FIELDS.filter((f) => mapping[f.key] && mapping[f.key] !== IGNORE).map((f) => (
                        <td key={f.key}>{r[f.key] || <span className="cell-muted">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="import-actions">
            {importing ? (
              <div className="import-progress">
                <div className="bc-progress-bar"><div className="bc-progress-fill" style={{ width: progress + '%' }} /></div>
                <span className="bc-progress-info">Importando... {progress}%</span>
              </div>
            ) : (
              <button className="btn btn-primary btn-xl" disabled={!canImport} onClick={runImport}>
                Importar {rows.length} contato(s) <ArrowRight size={18} />
              </button>
            )}
          </div>
        </>
      )}

      {/* Passo 3 — resultado */}
      {result && (
        <Card noBody>
          <div className="card-body">
            <div className="import-done">
              <div className="import-done-ic"><Check size={34} /></div>
              <h3>Importação concluída</h3>
            </div>
            <div className="import-stats">
              <div className="import-stat ok"><b>{result.imported}</b><span>Importados</span></div>
              <div className="import-stat"><b>{result.duplicates}</b><span>Já cadastrados</span></div>
              <div className="import-stat"><b>{result.blacklisted}</b><span>Bloqueados</span></div>
              <div className="import-stat"><b>{result.invalid}</b><span>Inválidos</span></div>
            </div>
            {result.errors?.length > 0 && (
              <div className="import-errors">
                <h4 className="import-sec">Linhas não importadas</h4>
                <ul>
                  {result.errors.slice(0, 20).map((e, i) => <li key={i}>Linha {e.row}: {e.reason}</li>)}
                </ul>
                {result.errors.length > 20 && <p className="import-note">…e mais {result.errors.length - 20}.</p>}
              </div>
            )}
            <div className="import-actions">
              <button className="btn btn-primary" onClick={reset}>Importar outra planilha</button>
            </div>
          </div>
        </Card>
      )}
    </Layout>
  );
}
