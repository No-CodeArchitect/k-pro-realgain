import { Router } from 'express';
import { isMemoryMode, getPool, getMemoryRecords } from '../lib/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { verdict, period, search, page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (isMemoryMode()) {
      let filtered = [...getMemoryRecords()];

      if (verdict && verdict !== '전체') {
        filtered = filtered.filter(r => r.verdict === verdict);
      }
      if (period && period !== '전체') {
        const now = new Date();
        let startDate;
        if (period === '오늘') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        else if (period === '이번 주') { const day = now.getDay(); startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1)); }
        else if (period === '이번 달') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        if (startDate) filtered = filtered.filter(r => new Date(r.created_at) >= startDate);
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(r => r.announcement_title.toLowerCase().includes(s));
      }

      const total = filtered.length;
      const offset = (pageNum - 1) * limitNum;
      const records = filtered.slice(offset, offset + limitNum);

      return res.json({ records, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    }

    const pool = getPool();
    const offset = (pageNum - 1) * limitNum;
    let where = [];
    let params = [];
    let idx = 1;

    if (verdict && verdict !== '전체') { where.push(`r.verdict = $${idx++}`); params.push(verdict); }
    if (period && period !== '전체') {
      const now = new Date();
      let startDate;
      if (period === '오늘') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (period === '이번 주') { const day = now.getDay(); startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1)); }
      else if (period === '이번 달') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      if (startDate) { where.push(`r.created_at >= $${idx++}`); params.push(startDate.toISOString()); }
    }
    if (search) { where.push(`r.announcement_title ILIKE $${idx++}`); params.push(`%${search}%`); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM screening_records r ${whereClause}`, params);
    const total = Number(countResult.rows[0].total);

    const { rows } = await pool.query(
      `SELECT r.*, c.name as matched_category_name FROM screening_records r LEFT JOIN product_categories c ON r.matched_category_id = c.id ${whereClause} ORDER BY r.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limitNum, offset]
    );

    res.json({ records: rows, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (isMemoryMode()) {
      const rec = getMemoryRecords().find(r => r.id === Number(req.params.id));
      if (!rec) return res.status(404).json({ error: '이력을 찾을 수 없습니다.' });
      return res.json(rec);
    }
    const { rows } = await getPool().query(
      `SELECT r.*, c.name as matched_category_name FROM screening_records r LEFT JOIN product_categories c ON r.matched_category_id = c.id WHERE r.id = $1`,
      [Number(req.params.id)]
    );
    if (rows.length === 0) return res.status(404).json({ error: '이력을 찾을 수 없습니다.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/share', async (req, res) => {
  try {
    if (isMemoryMode()) {
      const rec = getMemoryRecords().find(r => r.id === Number(req.params.id));
      if (rec) rec.shared_at = new Date().toISOString();
      return res.json({ message: '공유 시각이 기록되었습니다.' });
    }
    await getPool().query('UPDATE screening_records SET shared_at = NOW() WHERE id = $1', [Number(req.params.id)]);
    res.json({ message: '공유 시각이 기록되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
