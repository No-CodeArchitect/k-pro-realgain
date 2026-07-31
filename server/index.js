import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDb } from './db.js';
import categoriesRouter from './routes/categories.js';
import recordsRouter from './routes/records.js';
import screenRouter from './routes/screen.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/categories', categoriesRouter);
app.use('/api/records', recordsRouter);
app.use('/api/screen', screenRouter);

const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

async function start() {
  await getDb();

  const { default: seed } = await import('./seed.js');
  await seed();

  app.listen(PORT, () => {
    console.log(`K-PRO 스크리닝 서버 실행 중: http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('서버 시작 실패:', err);
  process.exit(1);
});
