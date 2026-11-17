// The Express app, kept separate from index.js so tests can import it without starting a server.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './middleware/auth.js';
import vendorsRouter from './routes/vendors.js';
import contractsRouter from './routes/contracts.js';
import rfxRouter from './routes/rfx.js';
import agentRouter from './routes/agent.js';

const app = express();
app.set('trust proxy', 1); // Azure App Service sits behind a proxy; keeps rate limiting per real client
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 100, standardHeaders: 'draft-7', legacyHeaders: false }));

// Public
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Everything below needs a valid token
app.use('/api', requireAuth);
app.get('/api/me', (req, res) => res.json(req.user));
app.use('/api/vendors', vendorsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/rfx', rfxRouter);

// LLM calls cost money: stricter limits, and a very strict one for demo visitors
app.use('/api/agent', rateLimit({
  windowMs: 60 * 60_000, max: 5, skip: req => !req.user?.demo, standardHeaders: 'draft-7', legacyHeaders: false
}));
app.use('/api/agent', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: 'draft-7', legacyHeaders: false }), agentRouter);

// Unknown API path
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler: log the details, never leak stack traces to the client
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body is not valid JSON' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

export default app;
