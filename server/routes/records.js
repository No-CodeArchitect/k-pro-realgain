import { Router } from 'express';
import { getAll, getOne, runQuery } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { verdict, period, search, page = 1, limit = 20 } = req.query;
  let where = [];
  let params = [];

  if (verdict && verdict !== '전체') {
    where.push('r.verdict = ?');
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
      where.push('r.created_at >= ?');
      params.push(startDate.toISOString().slice(0, 10));
    }
  }

  if (search) {
    where.push('r.announcement_title LIKE ?');
    params.push(`%${search}%`);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countRow = getOne(`SELECT COUNT(*) as total FROM screening_records r ${whereClause}`, params);

  const rows = getAll(`
    SELECT r.*, c.name as matched_category_name
    FROM screening_records r
    LEFT JOIN product_categories c ON r.matched_category_id = c.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), offset]);

  res.json({
    records: rows,
    total: countRow.total,
    page: Number(page),
    totalPages: Math.ceil(countRow.total / Number(limit))
  });
});

router.get('/:id', (req, res) => {
  const row = getOne(`
    SELECT r.*, c.name as matched_category_name
    FROM screening_records r
    LEFT JOIN product_categories c ON r.matched_category_id = c.id
    WHERE r.id = ?
  `, [Number(req.params.id)]);

  if (!row) return res.status(404).json({ error: '이력을 찾을 수 없습니다.' });
  res.json(row);
});

router.patch('/:id/share', (req, res) => {
  runQuery(`UPDATE screening_records SET shared_at = datetime('now','localtime') WHERE id = ?`, [Number(req.params.id)]);
  res.json({ message: '공유 시각이 기록되었습니다.' });
});

export default router;
