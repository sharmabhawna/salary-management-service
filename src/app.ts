import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from '@/middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}