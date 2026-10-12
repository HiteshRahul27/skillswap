const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status; this.code = code; this.fields = fields || {};
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '' && v !== null)).toString() : '';
  let res;
  try {
    res = await fetch(`${BASE}${path}${qs}`, {
      method, credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and that the backend is running.');
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok || !json || json.success === false) {
    const e = json && json.error;
    const err = new ApiError(res.status, e?.code || 'ERROR', e?.message || 'Something went wrong. Please try again.', e?.fields);
    if (res.status === 401 && err.code === 'SESSION_EXPIRED') window.dispatchEvent(new Event('auth:expired'));
    throw err;
  }
  return json;
}

// Each call resolves to { data, meta }.
export const api = {
  get: (p, query) => request(p, { query }),
  post: (p, body) => request(p, { method: 'POST', body: body ?? {} }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
};
