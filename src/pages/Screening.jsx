import React, { useState, useRef } from 'react';
import { api } from '../api';

const ACCEPT_TYPES = '.pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Screening() {
  const [form, setForm] = useState({
    announcement_title: '',
    agency: '한국수력원자력',
    spec_text: ''
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  function validate() {
    const e = {};
    if (!form.announcement_title.trim()) e.announcement_title = '공고명을 입력해주세요.';
    if (!form.spec_text.trim() && files.length === 0) e.spec_text = '규격서 내용을 입력하거나 첨부파일을 추가해주세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const attachments = [];
      for (const file of files) {
        const base64 = await readFileAsBase64(file);
        attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64
        });
      }
      const data = await api.screen({ ...form, attachments });
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

  function addFiles(newFiles) {
    const valid = [];
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        showToast(`${file.name}: 10MB 이하만 가능합니다.`);
        continue;
      }
      const ext = file.name.toLowerCase().split('.').pop();
      if (!['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
        showToast(`${file.name}: 지원하지 않는 형식입니다. (PDF, 이미지만 가능)`);
        continue;
      }
      if (files.length + valid.length >= 5) {
        showToast('첨부파일은 최대 5개까지 가능합니다.');
        break;
      }
      valid.push(file);
    }
    if (valid.length > 0) setFiles(prev => [...prev, ...valid]);
  }

  function handleFileChange(e) {
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
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
    setFiles([]);
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
                  첨부파일
                </label>
                <div
                  className={`file-dropzone ${dragOver ? 'file-dropzone-active' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_TYPES}
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div className="file-dropzone-text">
                    PDF, 이미지 파일을 드래그하거나 클릭하여 첨부
                  </div>
                  <div className="file-dropzone-hint">최대 5개, 10MB 이하 · 이미지는 AI가 직접 읽습니다</div>
                </div>

                {files.length > 0 && (
                  <div className="file-list">
                    {files.map((file, idx) => (
                      <div key={idx} className="file-item">
                        <div className="file-item-icon">
                          {file.type === 'application/pdf' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                          )}
                        </div>
                        <div className="file-item-info">
                          <span className="file-item-name">{file.name}</span>
                          <span className="file-item-size">{formatFileSize(file.size)}</span>
                        </div>
                        <button type="button" className="file-item-remove" onClick={() => removeFile(idx)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  규격서 내용 (텍스트) {files.length === 0 && <span className="required">*</span>}
                </label>
                <textarea
                  className="form-input"
                  placeholder="규격서 또는 공고 상세 내용을 붙여넣어 주세요... (첨부파일이 있으면 선택사항)"
                  value={form.spec_text}
                  onChange={e => setForm(f => ({ ...f, spec_text: e.target.value }))}
                />
                <div className="form-hint">첨부파일과 텍스트를 함께 입력하면 더 정확한 판정이 가능합니다.</div>
                {errors.spec_text && <div className="form-error">{errors.spec_text}</div>}
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {files.length > 0 ? '첨부파일 분석 + 판정 중...' : '판정 분석 중...'}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    AI 분석하기 {files.length > 0 && `(첨부 ${files.length}건 포함)`}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className={`card result-card ${result ? `verdict-${result.verdict}` : ''}`}>
          <div className="card-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            분석 결과
          </div>
          <div className="card-body">
            {loading && (
              <div className="loading-overlay">
                <div className="spinner" style={{ width: 36, height: 36 }}></div>
                <div className="loading-text">
                  {files.length > 0 ? 'AI가 첨부파일을 읽고 공고를 분석하고 있습니다...' : 'AI가 공고 내용을 분석하고 있습니다...'}
                </div>
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
