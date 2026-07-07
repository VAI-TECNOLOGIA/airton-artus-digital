// Função serverless da Vercel que serve a API Express completa.
// O app já é exportado separado do listen (backend/src/app.js).
import app from '../backend/src/app.js';

export default function handler(req, res) {
  return app(req, res);
}
