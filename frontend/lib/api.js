import { clearSession, getToken } from './auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const API_URL = API_BASE_URL;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function friendlyMessage(status, data) {
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) {
    const msg =
      data?.message === 'Insufficient role permissions'
        ? 'You do not have permission to perform this action.'
        : 'You do not have permission to access this resource.';
    return msg;
  }
  if (status === 502)
    return data?.message || 'The AI service is temporarily unavailable.';
  if (status === 400) return data?.message || 'The request was invalid.';
  if (status === 404) return 'The requested record was not found.';
  if (data?.message && typeof data.message === 'string') return data.message;
  return 'Something went wrong. Please try again.';
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new ApiError(
      `Cannot reach the API server at ${API_BASE_URL}. Is the backend running?`,
      0,
      networkError,
    );
  }

  if (response.status === 401) {
    clearSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401, null);
  }

  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(friendlyMessage(response.status, body), response.status, body);
  }
  return body;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
