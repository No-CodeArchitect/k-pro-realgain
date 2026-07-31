import { Router } from 'express';
import { getPool } from '../lib/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { verdict, period, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = [];
    let params = [];
    let idx = 1;

    if (verdict && verdict !== '전체') {
      where.push(`r.verdict = $${idx++}`);
      params.push(verdict);
    }

    if (period && period !== '전체') {
      const now = new Date();
      let startDate;
      if (period === '오늘') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === '이번 주') {
        const day = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
      } else if (period === '이번 달') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      if (startDate) {
        where.push(`r.created_at >= $${idx++}`);
        params.push(startDate.toISOString());
      }
    }

    if (search) {
      where.push(`r.announcement_title ILIKE $${idx++}`);
      params.push(`%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM screening_records r ${whereClause}`,
      params
    );
    const total = Number(countResult.rows[0].total);

    const dataParams = [...params, Number(limit), offset];
    const { rows } = await pool.query(
      `SELECT r.*, c.name as matched_category_name
       FROM screening_records r
       LEFT JOIN product_categories c ON r.matched_category_id = c.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataParams
    );

    res.json({
      records: rows,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await getPool().query(
      `SELECT r.*, c.name as matched_category_name
       FROM screening_records r
       LEFT JOIN product_categories c ON r.matched_category_id = c.id
       WHERE r.id = $1`,
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
    await getPool().query('UPDATE screening_records SET shared_at = NOW() WHERE id = $1', [Number(req.params.id)]);
    res.json({ message: '공유 시각이 기록되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
