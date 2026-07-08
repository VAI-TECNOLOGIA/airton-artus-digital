import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 4000);

function abortProd(msg, hint) {
  console.error(`\n❌ FATAL: ${msg}`);
  if (hint) console.error(`   ${hint}`);
  console.error('   Configure no painel da Vercel (Project Settings > Environment Variables) e refaça o deploy.\n');
  process.exit(1);
}

// === Banco de dados ===
// Usamos APP_* para evitar colisão com integrações Vercel-Neon/Supabase que
// auto-injetam DATABASE_URL. schema.prisma SEMPRE lê APP_DATABASE_URL/APP_DIRECT_URL.
// Em dev, aceita DATABASE_URL como fallback (compatibilidade com .env legado).
const databaseUrl = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
if (isProd && !process.env.APP_DATABASE_URL) {
  abortProd(
    "APP_DATABASE_URL ausente em produção.",
    "Defina a connection string Postgres pooled (Neon/Supabase). Também configure APP_DIRECT_URL para migrações."
  );
}

// === JWT ===
const INSECURE_DEFAULT = 'dev-secret-troque-em-producao';
const rawSecret = process.env.JWT_SECRET;
if (isProd && (!rawSecret || rawSecret === INSECURE_DEFAULT)) {
  abortProd(
    "JWT_SECRET ausente ou usando valor padrão inseguro em produção.",
    "Gere um segredo forte com: openssl rand -base64 48"
  );
}
const jwtSecret = rawSecret || INSECURE_DEFAULT;

// === Upload em serverless ===
// 'local' em Vercel/Lambda escreve em /tmp (efêmero) — arquivos somem entre
// invocações. Fotos de faixa, mídia kit, etc. seriam perdidos silenciosamente.
const uploadDriver = process.env.UPLOAD_DRIVER || 'local';
if (isProd && uploadDriver === 'local') {
  abortProd(
    "UPLOAD_DRIVER='local' não persiste em produção serverless.",
    "Configure UPLOAD_DRIVER='s3' com credenciais S3 (S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY). Alternativa: Vercel Blob (S3-compatível)."
  );
}

const env = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtResetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '1h',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  uploadDriver,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${port}`,
  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || 'simulado',
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'aad-verify',
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'simulado',
    apiKey: process.env.SMS_API_KEY || '',
  },
};

export default env;
