import React, { useState } from 'react';
import { api } from '../api';

export default function Screening() {
  const [form, setForm] = useState({
    announcement_title: '',
    agency: '한국수력원자력',
    spec_text: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  function validate() {
    const e = {};
    if (!form.announcement_title.trim()) e.announcement_title = '공고명을 입력해주세요.';
    if (!form.spec_text.trim()) e.spec_text = '규격서 내용을 입력해주세요.';
    else if (form.spec_text.trim().length < 20) e.spec_text = '최소 20자 이상 입력을 권장합니다.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.screen(form);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry() {
    setError('');
    await handleSubmit(new Event('submit'));
  }

  function buildShareText(r) {
    return `[K-PRO 스크리닝 결과]\n공고명: ${r.announcement_title}\n발주처: ${r.agency}\n판정: ${r.verdict} (신뢰도: ${r.confidence})\n매칭 제품군: ${r.matched_category_name || '-'}\n근거: ${r.reasoning}`;
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildShareText(result));
      if (result.id) api.shareRecord(result.id).catch(() => {});
      showToast('클립보드에 복사되었습니다.');
    } catch {
      showToast('복사에 실패했습니다.');
    }
  }

  function handleMail() {
    if (!result) return;
    const subject = encodeURIComponent(`[K-PRO 스크리닝] ${result.announcement_title} - ${result.verdict}`);
    const body = encodeURIComponent(buildShareText(result));
    window.open(`mailto:?subject=${subject}&body=${body}`);
    if (result.id) api.shareRecord(result.id).catch(() => {});
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function handleReset() {
    setForm({ announcement_title: '', agency: '한국수력원자력', spec_text: '' });
    setResult(null);
    setError('');
    setErrors({});
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">신규 스크리닝</h1>
        {result && (
          <button className="btn btn-outline btn-sm" onClick={handleReset}>
            새 공고 분석하기
          </button>
        )}
      </div>

      <div className="screening-layout">
        {/* 입력 카드 */}
        <div className="card">
          <div className="card-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            공고 정보 입력
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  공고명 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="예) ○○원전 방사선감시설비(RMS) 정비용역"
                  value={form.announcement_title}
                  onChange={e => setForm(f => ({ ...f, announcement_title: e.target.value }))}
                />
                {errors.announcement_title && <div className="form-error">{errors.announcement_title}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">발주처</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="한국수력원자력"
                  value={form.agency}
                  onChange={e => setForm(f => ({ ...f, agency: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  첨부 규격서 내용 <span className="required">*</span>
                </label>
                <textarea
                  className="form-input"
                  placeholder="규격서 또는 공고 상세 내용을 붙여넣어 주세요..."
                  value={form.spec_text}
                  onChange={e => setForm(f => ({ ...f, spec_text: e.target.value }))}
                />
                <div className="form-hint">최소 20자 이상 입력을 권장합니다. 규격서 내용이 상세할수록 판정 정확도가 높아집니다.</div>
                {errors.spec_text && <div className="form-error">{errors.spec_text}</div>}
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    판정 분석 중...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    AI 분석하기
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 결과 카드 */}
        <div className={`card result-card ${result ? `verdict-${result.verdict}` : ''}`}>
          <div className="card-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            분석 결과
          </div>
          <div className="card-body">
            {loading && (
              <div className="loading-overlay">
                <div className="spinner" style={{ width: 36, height: 36 }}></div>
                <div className="loading-text">AI가 공고 내용을 분석하고 있습니다...</div>
              </div>
            )}

            {error && !loading && (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ color: 'var(--red)' }}>!</div>
                <div className="empty-state-title">{error}</div>
                <button className="btn btn-primary btn-sm" onClick={handleRetry} style={{ marginTop: 12 }}>다시 시도</button>
              </div>
            )}

            {!loading && !error && !result && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
                  </svg>
                </div>
                <div className="empty-state-title">분석 대기 중</div>
                <div className="empty-state-desc">왼쪽에 공고 정보를 입력하고 분석을 시작하세요.</div>
              </div>
            )}

            {!loading && result && (
              <div>
                <div className="result-verdict">
                  <span className={`badge badge-${result.verdict} verdict-large`}>{result.verdict}</span>
                  {result.confidence && (
                    <span className="confidence-label">
                      신뢰도: <strong>{result.confidence}</strong>
                    </span>
                  )}
                </div>

                <div className="result-reasoning">{result.reasoning}</div>

                <div className="result-meta">
                  {result.matched_category_name && (
                    <div>추천 제품군: <strong>{result.matched_category_name}</strong></div>
                  )}
                  <div>발주처: <strong>{result.agency}</strong></div>
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
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
