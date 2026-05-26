import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import { sharedAuthRouter } from './routes/sharedAuth.js';
import { mobileRouter } from './routes/mobile.js';
import { tripTrackingRouter } from './routes/tripTrackingMobile.js';
import { dashboardRouter } from './routes/dashboard.js';

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

app.use('/api/shared/auth', sharedAuthRouter);
app.use('/api/mobile', tripTrackingRouter);
app.use('/api/mobile', mobileRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(env.port, () => {
  console.log(`[safe-backend] listening on http://127.0.0.1:${env.port}`);
});
