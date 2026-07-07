import { useEffect, useState } from 'react';
import { Image, Copy, Download, Plus, Film } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import Modal from '../components/ui/Modal.jsx';
import Field from '../components/ui/Field.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { label, options } from '../config/enums.js';

const FIELDS = [
  { name: 'title', label: 'Título', required: true, full: true },
  { name: 'type', label: 'Tipo', type: 'select', options: options('MediaType'), required: true },
  { name: 'network', label: 'Rede indicada', type: 'select', options: options('SocialNetwork') },
  { name: 'priority', label: 'Prioridade', type: 'select', options: options('Priority') },
  { name: 'fileUrl', label: 'Arquivo (imagem, vídeo ou áudio)', type: 'upload', full: true, hint: 'Anexe o arquivo — a equipe baixa e compartilha direto daqui.' },
  { name: 'thumbnailUrl', label: 'Miniatura (opcional)', type: 'upload', accept: 'image/*', full: true },
  { name: 'captionText', label: 'Texto pronto (legenda)', type: 'textarea', full: true },
  { name: 'hashtags', label: 'Hashtags', full: true },
  { name: 'guidance', label: 'Orientação de postagem', type: 'textarea', full: true },
];

// Bug 8: prévia real com fallback explícito.
function MediaThumb({ item: m }) {
  const isVideo = ['VIDEO', 'REELS', 'STORY'].includes(m.type);
  const isAudio = m.type === 'JINGLE';
  const img = m.thumbnailUrl || (!isVideo && !isAudio ? m.fileUrl : null);
  const [failed, setFailed] = useState(false);

  if (img && !failed) {
    return (
      <div className="media-thumb has-img">
        <img src={img} alt={m.title} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </div>
    );
  }
  if (isVideo) {
    return <div className="media-thumb"><Film size={34} /><small>{m.fileUrl ? 'Vídeo' : 'Mídia indisponível'}</small></div>;
  }
  if (isAudio) {
    return <div className="media-thumb"><span style={{ fontSize: 30 }}>🎵</span><small>{m.fileUrl ? 'Áudio' : 'Mídia indisponível'}</small></div>;
  }
  return <div className="media-thumb media-empty"><Image size={28} /><small>Mídia indisponível</small></div>;
}

export default function MediaKit() {
  const toast = useToast();
  const { user } = useAuth();
  const canManage = ['LIDER', 'MEMBRO'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/media-kit');
      setItems(data.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function copy(text, msg = 'Copiado!') {
    navigator.clipboard?.writeText(text || '');
    toast.success(msg);
  }

  async function submit() {
    if (!form.title || !form.type) { toast.error('Preencha: Título, Tipo.'); return; }
    setSaving(true);
    try {
      await api.post('/media-kit', form);
      toast.success('Material publicado!');
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
    <Layout title="Mídia Kit da campanha" subtitle="Artes, vídeos, jingles e textos prontos para a militância">
      <div className="toolbar">
        <div className="spacer" />
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setForm({ type: 'ARTE', network: 'INSTAGRAM', priority: 'MEDIA' }); setOpen(true); }}>
            <Plus size={16} /> Publicar material
          </button>
        )}
      </div>

      {loading ? (
        <LoadingBox />
      ) : items.length === 0 ? (
        <EmptyState icon={Image} title="Nenhum material publicado" message="A equipe de marketing publica artes, vídeos e textos aqui." />
      ) : (
        <div className="media-grid">
          {items.map((m) => (
            <div className="media-card" key={m.id}>
              <MediaThumb item={m} />
              <div className="body">
                <div className="flex items-center justify-between">
                  <Badge tone="blue">{label('MediaType', m.type)}</Badge>
                  <span className="text-sm muted">{label('SocialNetwork', m.network)}</span>
                </div>
                <h4>{m.title}</h4>
                {m.captionText && <div className="media-caption">{m.captionText}</div>}
                {m.hashtags && <div className="text-sm" style={{ color: 'var(--brand)' }}>{m.hashtags}</div>}
                <div className="flex gap-8 wrap" style={{ marginTop: 'auto' }}>
                  {m.captionText && (
                    <button className="btn btn-sm" onClick={() => copy(m.captionText, 'Legenda copiada!')}>
                      <Copy size={14} /> Legenda
                    </button>
                  )}
                  {m.hashtags && (
                    <button className="btn btn-sm" onClick={() => copy(m.hashtags, 'Hashtags copiadas!')}># Hashtags</button>
                  )}
                  {m.fileUrl && (
                    <a className="btn btn-sm" href={m.fileUrl} target="_blank" rel="noreferrer">
                      <Download size={14} /> Baixar
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title="Publicar material"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Salvando...' : 'Publicar'}</button>
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
