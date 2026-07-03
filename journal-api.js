const API_BASE = '/api/journal';

export async function apiFetch(path, options = {}, userId = null) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (userId) url.searchParams.set('user', userId);

  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const resp = await fetch(url.toString(), { ...options, headers });
  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const err = new Error(data.error || `Request failed (${resp.status})`);
    err.status = resp.status;
    throw err;
  }

  return data;
}

export function formatDateLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getParticipantId() {
  return document.body.dataset.participant || null;
}
