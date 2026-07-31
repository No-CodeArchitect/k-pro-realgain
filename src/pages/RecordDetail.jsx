import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function RecordDetail() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.getRecord(id).then(setRecord).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  function buildShareText(r) {
    return `[K-PRO 스크리닝 결과]\n공고명: ${r.announcement_title}\n발주처: ${r.agency}\n판정: ${r.verdict} (신뢰도: ${r.confidence})\n매칭 제품군: ${r.matched_category_name || '-'}\n근거: ${r.reasoning}`;
  }

  async function handleCopy() {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(buildShareText(record));
      api.shareRecord(record.id).catch(() => {});
      showToast('클립보드에 복사되었습니다.');
    } catch {
      showToast('복사에 실패했습니다.');
    }
  }

  function handleMail() {
    if (!record) return;
    const subject = encodeURIComponent(`[K-PRO 스크리닝] ${record.announcement_title} - ${record.verdict}`);
    const body = encodeURIComponent(buildShareText(record));
    window.open(`mailto:?subject=${subject}&body=${body}`);
    api.shareRecord(record.id).catch(() => {});
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" style={{ width: 28, height: 28 }}></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">이력을 찾을 수 없습니다.</div>
        <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>대시보드로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="detail-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        대시보드로 돌아가기
      </Link>

      <div className="page-header">
        <h1 className="page-title">{record.announcement_title}</h1>
      </div>

      <div className="detail-grid">
        {/* 원본 입력 */}
        <div className="card">
          <div className="card-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
            공고 원본 정보
          </div>
          <div className="card-body">
            <div className="form-group">
              <div className="form-label">공고명</div>
              <div style={{ fontSize: 14 }}>{record.announcement_title}</div>
            </div>
            <div className="form-group">
              <div className="form-label">발주처</div>
              <div style={{ fontSize: 14 }}>{record.agency}</div>
            </div>
            <div className="form-group">
              <div className="form-label">규격서 내용</div>
              <div style={{
                fontSize: 13,
                lineHeight: 1.7,
                background: 'var(--bg)',
                padding: 16,
                borderRadius: 'var(--radius-sm)',
                maxHeight: 400,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {record.spec_text}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-light)' }}>
              판정일시: {record.created_at}
              {record.shared_at && ` · 공유: ${record.shared_at}`}
            </div>
          </div>
        </div>

        {/* 판정 결과 */}
        <div className={`card result-card verdict-${record.verdict}`}>
          <div className="card-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            분석 결과
          </div>
          <div className="card-body">
            <div className="result-verdict">
              <span className={`badge badge-${record.verdict} verdict-large`}>{record.verdict}</span>
              {record.confidence && (
                <span className="confidence-label">
                  신뢰도: <strong>{record.confidence}</strong>
                </span>
              )}
            </div>

            <div className="result-reasoning">{record.reasoning}</div>

            <div className="result-meta">
              {record.matched_category_name && (
                <div>추천 제품군: <strong>{record.matched_category_name}</strong></div>
              )}
            </div>

            <div className="result-actions">
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                클립보드 복사
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleMail}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
                메일로 공유
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
