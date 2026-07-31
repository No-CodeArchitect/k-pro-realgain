import { Router } from 'express';
import { getAll, getOne, runInsert, runQuery } from '../db.js';

const router = Router();

function parseCategory(r) {
  return {
    ...r,
    track_record: JSON.parse(r.track_record || '[]'),
    keywords: JSON.parse(r.keywords || '[]')
  };
}

router.get('/', (req, res) => {
  const rows = getAll('SELECT * FROM product_categories ORDER BY id');
  res.json(rows.map(parseCategory));
});

router.get('/:id', (req, res) => {
  const row = getOne('SELECT * FROM product_categories WHERE id = ?', [Number(req.params.id)]);
  if (!row) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });
  res.json(parseCategory(row));
});

router.post('/', (req, res) => {
  const { name, specs, track_record, keywords } = req.body;
  if (!name) return res.status(400).json({ error: '제품군명은 필수입니다.' });

  const id = runInsert(
    `INSERT INTO product_categories (name, specs, track_record, keywords) VALUES (?, ?, ?, ?)`,
    [name, specs || '', JSON.stringify(track_record || []), JSON.stringify(keywords || [])]
  );

  const created = getOne('SELECT * FROM product_categories WHERE id = ?', [id]);
  res.status(201).json(parseCategory(created));
});

router.put('/:id', (req, res) => {
  const { name, specs, track_record, keywords } = req.body;
  const existing = getOne('SELECT * FROM product_categories WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });

  runQuery(
    `UPDATE product_categories SET name = ?, specs = ?, track_record = ?, keywords = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
    [
      name || existing.name,
      specs ?? existing.specs,
      JSON.stringify(track_record || JSON.parse(existing.track_record)),
      JSON.stringify(keywords || JSON.parse(existing.keywords)),
      Number(req.params.id)
    ]
  );

  const updated = getOne('SELECT * FROM product_categories WHERE id = ?', [Number(req.params.id)]);
  res.json(parseCategory(updated));
});

router.delete('/:id', (req, res) => {
  const existing = getOne('SELECT * FROM product_categories WHERE id = ?', [Number(req.params.id)]);
  if (!existing) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });

  runQuery('DELETE FROM product_categories WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: '삭제되었습니다.' });
});

export default router;
