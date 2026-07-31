const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '요청 실패');
  return data;
}

export const api = {
  screen: (body) => request('/screen', { method: 'POST', body: JSON.stringify(body) }),

  getRecords: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/records?${qs}`);
  },
  getRecord: (id) => request(`/records/${id}`),
  shareRecord: (id) => request(`/records/${id}/share`, { method: 'PATCH' }),

  getCategories: () => request('/categories'),
  getCategory: (id) => request(`/categories/${id}`),
  createCategory: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
};
