import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import env from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/error.js';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv === 'development') app.use(morgan('dev'));

// Arquivos enviados (driver de upload local)
app.use(`/${env.uploadDir}`, express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get('/health', (req, res) =>
  res.json({ status: 'ok', name: 'Campanha DEMO API', ts: new Date().toISOString() })
);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
