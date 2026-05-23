import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import { sharedAuthRouter } from './routes/sharedAuth.js';
import { mobileRouter } from './routes/mobile.js';
import { dashboardRouter } from './routes/dashboard.js';
import { prisma } from './lib/prisma.js';

const app = express();

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/time', (_req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

app.get('/api/cover-products', async (_req, res) => {
  const products = await prisma.coverProduct.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' },
  });
  res.json({ products });
});

app.use('/api/shared/auth', sharedAuthRouter);
app.use('/api/mobile', mobileRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(env.port, () => {
  console.log(`[safe-backend] listening on http://127.0.0.1:${env.port}`);
});
