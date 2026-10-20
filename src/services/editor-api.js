const EDITOR_API = import.meta.env.VITE_EDITOR_URL || 'http://localhost:3003/api/editor';

async function request(path, options = {}) {
  const res = await fetch(`${EDITOR_API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Editor API error');
  }
  return res.json();
}

export async function fetchArticles({ status, page = 1, pageSize = 20, tag } = {}) {
  const params = new URLSearchParams({ page, pageSize });
  if (status) params.set('status', status);
  if (tag) params.set('tag', tag);
  return request(`/articles?${params}`);
}

export async function fetchArticle(id) {
  return request(`/articles/${id}`);
}

export async function createArticle(data) {
  return request('/articles', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateArticle(id, data) {
  return request(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteArticle(id) {
  return request(`/articles/${id}`, { method: 'DELETE' });
}

export async function publishArticle(id) {
  return request(`/articles/${id}/publish`, { method: 'POST' });
}

export async function fetchDrafts(articleId) {
  return request(`/drafts/${articleId}`);
}

export async function saveDraft(articleId, content, savedBy) {
  return request('/drafts', { method: 'POST', body: JSON.stringify({ articleId, content, savedBy }) });
}

export async function fetchSetting(key) {
  return request(`/settings/${key}`);
}

export async function updateSetting(key, value) {
  return request(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
}
