import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

const VERDICT_OPTIONS = ['전체', '적합', '보류', '제외'];
const PERIOD_OPTIONS = ['전체', '오늘', '이번 주', '이번 달'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [verdict, setVerdict] = useState('전체');
  const [period, setPeriod] = useState('전체');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [verdict, period, page]);

  async function loadRecords() {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (verdict !== '전체') params.verdict = verdict;
      if (period !== '전체') params.period = period;
      if (search.trim()) params.search = search.trim();
      const data = await api.getRecords(params);
      setRecords(data.records);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadRecords();
  }

  function formatDate(dt) {
    if (!dt) return '-';
    const d = new Date(dt);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}.${day} ${h}:${min}`;
  }

  function truncate(str, len = 40) {
    if (!str) return '-';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">스크리닝 이력</h1>
        <Link to="/screening" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          신규 스크리닝
        </Link>
      </div>

      <div className="filters">
        <div className="filter-group">
          {VERDICT_OPTIONS.map(v => (
            <button
              key={v}
              className={`filter-btn ${verdict === v ? 'active' : ''}`}
              onClick={() => { setVerdict(v); setPage(1); }}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p}
              className={`filter-btn ${period === p ? 'active' : ''}`}
              onClick={() => { setPeriod(p); setPage(1); }}
            >
              {p}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            className="search-input"
            placeholder="공고명 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-outline btn-sm">검색</button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner" style={{ width: 28, height: 28 }}></div>
            <div className="loading-text">이력을 불러오는 중...</div>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
              </svg>
            </div>
            <div className="empty-state-title">아직 스크리닝 이력이 없습니다</div>
            <div className="empty-state-desc">새 공고를 분석해보세요.</div>
            <Link to="/screening" className="btn btn-primary btn-sm">신규 스크리닝 시작</Link>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>판정일시</th>
                    <th>공고명</th>
                    <th>발주처</th>
                    <th>판정</th>
                    <th>추천 제품군</th>
                    <th>신뢰도</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--gray)' }}>{formatDate(r.created_at)}</td>
                      <td style={{ fontWeight: 500 }}>{truncate(r.announcement_title, 35)}</td>
                      <td style={{ color: 'var(--gray)', fontSize: 13 }}>{r.agency}</td>
                      <td><span className={`badge badge-${r.verdict}`}>{r.verdict}</span></td>
                      <td style={{ fontSize: 13 }}>{r.matched_category_name || '-'}</td>
                      <td style={{ fontSize: 13 }}>{r.confidence || '-'}</td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/records/${r.id}`)}
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  이전
                </button>
                <span className="pagination-info">{page} / {totalPages} (총 {total}건)</span>
                <button
                  className="pagination-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
