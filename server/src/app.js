import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import vendorsRouter from './routes/vendors.js';
import contractsRouter from './routes/contracts.js';

const app = express();
app.use(helmet());                                             // secure HTTP headers
app.use('/api', rateLimit({ windowMs: 60_000, limit: 100 }));  // 100 requests/min per IP
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));                     // reject huge bodies

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/vendors', vendorsRouter);
app.use('/api/contracts', contractsRouter);

// Central error handler: never leak stack traces to the client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

export default app;


