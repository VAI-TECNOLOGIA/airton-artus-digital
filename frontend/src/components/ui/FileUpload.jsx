import { useRef, useState } from 'react';
import { UploadCloud, X, FileCheck2, Loader2, Link2 } from 'lucide-react';
import api, { apiError } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

const MAX_MB = 25;

/**
 * Anexo de arquivo com upload direto pro Vercel Blob (POST /api/upload).
 * Preenche `value` com a URL pública retornada. Mantém a opção de colar
 * um link, pra quem já tem o arquivo hospedado em outro lugar.
 */
export default function FileUpload({
  value,
  onChange,
  accept = 'image/*,video/*,audio/*,application/pdf',
  maxSizeMB = MAX_MB,
  previewImages = true,
}) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    const mb = file.size / (1024 * 1024);
    if (mb > maxSizeMB) {
      toast.error(`Arquivo muito grande (${mb.toFixed(1)} MB). Máximo ${maxSizeMB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // upload de vídeo pode passar do timeout padrão
      });
      onChange(data.url);
      toast.success('Arquivo anexado!');
    } catch (e) {
      toast.error(apiError(e, 'Falha ao enviar o arquivo.'));
    } finally {
      setUploading(false);
    }
  }

  function onInput(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    handleFile(f);
  }
  function onDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }

  const isImg = value && /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(value);

  return (
    <div className="upload">
      {value ? (
        <div className="upload-done">
          {previewImages && isImg ? (
            <img className="upload-preview" src={value} alt="prévia" />
          ) : (
            <div className="upload-preview file"><FileCheck2 size={22} /></div>
          )}
          <div className="upload-done-info">
            <span className="upload-done-name">Arquivo anexado</span>
            <a className="upload-done-link" href={value} target="_blank" rel="noreferrer">
              {String(value).split('/').pop()}
            </a>
          </div>
          <button type="button" className="upload-remove" title="Remover" onClick={() => onChange('')}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`upload-drop ${uploading ? 'busy' : ''}`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <><Loader2 size={20} className="spin" /><span>Enviando…</span></>
          ) : (
            <>
              <UploadCloud size={22} />
              <span><strong>Anexar arquivo</strong> ou arraste aqui</span>
              <small>Imagem, vídeo, áudio ou PDF · até {maxSizeMB} MB</small>
            </>
          )}
          <input ref={inputRef} type="file" accept={accept} hidden onChange={onInput} />
        </div>
      )}

      <button type="button" className="upload-url-toggle" onClick={() => setShowUrl((s) => !s)}>
        <Link2 size={12} /> {showUrl ? 'Ocultar link' : 'Ou colar um link'}
      </button>
      {showUrl && (
        <input
          className="input"
          placeholder="https://..."
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
