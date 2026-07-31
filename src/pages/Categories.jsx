import React, { useState, useEffect } from 'react';
import { api } from '../api';

const emptyForm = { name: '', specs: '', track_record: '', keywords: '' };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(cat) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      specs: cat.specs,
      track_record: cat.track_record.join(', '),
      keywords: cat.keywords.join(', ')
    });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        specs: form.specs.trim(),
        track_record: form.track_record.split(',').map(s => s.trim()).filter(Boolean),
        keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean)
      };
      if (editingId) {
        await api.updateCategory(editingId, body);
        showToast('제품군이 수정되었습니다.');
      } else {
        await api.createCategory(body);
        showToast('제품군이 추가되었습니다.');
      }
      setShowModal(false);
      loadCategories();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteCategory(id);
      setConfirmDelete(null);
      showToast('제품군이 삭제되었습니다.');
      loadCategories();
    } catch (err) {
      showToast(err.message);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">기준 문서 관리</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          제품군 추가
        </button>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" style={{ width: 28, height: 28 }}></div>
          <div className="loading-text">제품군 정보를 불러오는 중...</div>
        </div>
      ) : categories.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">등록된 제품군이 없습니다</div>
            <div className="empty-state-desc">제품군을 추가하여 AI 판정 기준을 설정하세요.</div>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>제품군 추가</button>
          </div>
        </div>
      ) : (
        <div className="category-grid">
          {categories.map(cat => (
            <div key={cat.id} className="card category-card">
              <div className="card-body">
                <div className="category-name">{cat.name}</div>
                <div className="category-specs">{cat.specs}</div>
                <div className="category-tags">
                  {cat.keywords.slice(0, 8).map((kw, i) => (
                    <span key={i} className="tag tag-teal">{kw}</span>
                  ))}
                  {cat.keywords.length > 8 && (
                    <span className="tag">+{cat.keywords.length - 8}</span>
                  )}
                </div>
                <div className="category-track">
                  적용 이력: {cat.track_record.join(', ') || '-'}
                </div>
                <div className="category-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(cat)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    수정
                  </button>
                  {confirmDelete === cat.id ? (
                    <>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.id)}>삭제 확인</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(null)}>취소</button>
                    </>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(cat.id)} style={{ color: 'var(--red)' }}>
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingId ? '제품군 수정' : '제품군 추가'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">제품군명 <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="예) 방사선감시설비(RMS)"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">대표 제품/스펙</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: 100 }}
                    placeholder="주요 제품명과 스펙을 기술하세요"
                    value={form.specs}
                    onChange={e => setForm(f => ({ ...f, specs: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">적용 이력</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="콤마로 구분 (예: 한빛 3·4호기, 한울 1~6호기)"
                    value={form.track_record}
                    onChange={e => setForm(f => ({ ...f, track_record: e.target.value }))}
                  />
                  <div className="form-hint">여러 건은 콤마(,)로 구분하세요.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">매칭 키워드</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="콤마로 구분 (예: RMS, 방사선감시, N-16)"
                    value={form.keywords}
                    onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                  />
                  <div className="form-hint">AI 판정 시 매칭에 활용됩니다. 콤마(,)로 구분하세요.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '저장 중...' : (editingId ? '수정' : '추가')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
