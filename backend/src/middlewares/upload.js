import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import env from '../config/env.js';

const USE_BLOB = env.uploadDriver === 'blob';

// Storage: memory p/ blob (buffer em req.file.buffer), disk p/ local dev.
const memoryStorage = multer.memoryStorage();

let uploadRoot;
if (!USE_BLOB) {
  uploadRoot = path.resolve(process.cwd(), env.uploadDir);
  try {
    if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
  } catch (e) {
    console.warn('[upload] uploadDir principal indisponível, tentando /tmp:', e.message);
    uploadRoot = path.join('/tmp', 'uploads');
    try {
      fs.mkdirSync(uploadRoot, { recursive: true });
    } catch (e2) {
      console.error('[upload] /tmp tambem falhou — uploads locais quebrarão:', e2.message);
    }
  }
}

const diskStorage = USE_BLOB ? null : multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const multerInstance = multer({
  storage: USE_BLOB ? memoryStorage : diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Após multer, envia os buffers para o Vercel Blob (quando driver=blob).
// Guarda a URL absoluta em req.file.filename para fileUrl() encaminhar.
async function persistToBlob(req, res, next) {
  if (!USE_BLOB) return next();
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const arr of Object.values(req.files)) if (Array.isArray(arr)) files.push(...arr);
  }
  if (!files.length) return next();
  try {
    const { put } = await import('@vercel/blob');
    for (const file of files) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const blob = await put(`uploads/${name}`, file.buffer, {
        access: 'public',
        contentType: file.mimetype,
      });
      file.filename = blob.url;      // URL absoluta — fileUrl() detecta e passa direto
      file.blobUrl = blob.url;       // alias explícito
      file.buffer = undefined;        // libera memória
    }
    next();
  } catch (e) {
    console.error('blob upload error', e);
    next(e);
  }
}

// Wrapper compat: `upload.single(field)` — mantém contrato usado nas rotas.
function wrap(multerMw) {
  return (req, res, next) => {
    multerMw(req, res, (err) => {
      if (err) return next(err);
      persistToBlob(req, res, next);
    });
  };
}

export const upload = {
  single: (field) => wrap(multerInstance.single(field)),
  array: (field, max) => wrap(multerInstance.array(field, max)),
  fields: (fields) => wrap(multerInstance.fields(fields)),
  none: () => wrap(multerInstance.none()),
};

/** Monta URL pública. Se filename já é URL absoluta (blob), retorna direto. */
export function fileUrl(filename) {
  if (!filename) return '';
  if (/^https?:\/\//i.test(filename)) return filename;
  return `${env.publicUrl}/${env.uploadDir}/${filename}`;
}
