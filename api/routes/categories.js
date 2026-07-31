import { Router } from 'express';
import { isMemoryMode, getPool, getMemoryCategories, addMemoryCategory, updateMemoryCategory, deleteMemoryCategory } from '../lib/db.js';

const router = Router();

function parseCategory(r) {
  return {
    ...r,
    track_record: typeof r.track_record === 'string' ? JSON.parse(r.track_record) : r.track_record,
    keywords: typeof r.keywords === 'string' ? JSON.parse(r.keywords) : r.keywords
  };
}

router.get('/', async (req, res) => {
  try {
    if (isMemoryMode()) {
      return res.json(getMemoryCategories());
    }
    const { rows } = await getPool().query('SELECT * FROM product_categories ORDER BY id');
    res.json(rows.map(parseCategory));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (isMemoryMode()) {
      const cat = getMemoryCategories().find(c => c.id === Number(req.params.id));
      if (!cat) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });
      return res.json(cat);
    }
    const { rows } = await getPool().query('SELECT * FROM product_categories WHERE id = $1', [Number(req.params.id)]);
    if (rows.length === 0) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });
    res.json(parseCategory(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, specs, track_record, keywords } = req.body;
    if (!name) return res.status(400).json({ error: '제품군명은 필수입니다.' });

    if (isMemoryMode()) {
      const cat = addMemoryCategory({ name, specs: specs || '', track_record: track_record || [], keywords: keywords || [] });
      return res.status(201).json(cat);
    }
    const { rows } = await getPool().query(
      'INSERT INTO product_categories (name, specs, track_record, keywords) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, specs || '', JSON.stringify(track_record || []), JSON.stringify(keywords || [])]
    );
    res.status(201).json(parseCategory(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, specs, track_record, keywords } = req.body;

    if (isMemoryMode()) {
      const cur = getMemoryCategories().find(c => c.id === Number(req.params.id));
      if (!cur) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });
      const updated = updateMemoryCategory(Number(req.params.id), {
        name: name || cur.name,
        specs: specs ?? cur.specs,
        track_record: track_record || cur.track_record,
        keywords: keywords || cur.keywords
      });
      return res.json(updated);
    }

    const pool = getPool();
    const existing = await pool.query('SELECT * FROM product_categories WHERE id = $1', [Number(req.params.id)]);
    if (existing.rows.length === 0) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });

    const cur = parseCategory(existing.rows[0]);
    const { rows } = await pool.query(
      'UPDATE product_categories SET name = $1, specs = $2, track_record = $3, keywords = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name || cur.name, specs ?? cur.specs, JSON.stringify(track_record || cur.track_record), JSON.stringify(keywords || cur.keywords), Number(req.params.id)]
    );
    res.json(parseCategory(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (isMemoryMode()) {
      if (!deleteMemoryCategory(Number(req.params.id))) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });
      return res.json({ message: '삭제되었습니다.' });
    }
    const pool = getPool();
    const existing = await pool.query('SELECT * FROM product_categories WHERE id = $1', [Number(req.params.id)]);
    if (existing.rows.length === 0) return res.status(404).json({ error: '제품군을 찾을 수 없습니다.' });
    await pool.query('DELETE FROM product_categories WHERE id = $1', [Number(req.params.id)]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
