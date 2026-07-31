import express from 'express';
import cors from 'cors';
import { initDb } from './lib/db.js';
import categoriesRouter from './routes/categories.js';
import recordsRouter from './routes/records.js';
import screenRouter from './routes/screen.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
  next();
});

app.use('/api/categories', categoriesRouter);
app.use('/api/records', recordsRouter);
app.use('/api/screen', screenRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

export default app;
