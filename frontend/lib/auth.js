const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function readCookie(name) {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function getToken() {
  if (typeof document === 'undefined') return null;
  return readCookie(TOKEN_KEY);
}

export function getUser() {
  if (typeof document === 'undefined') return null;
  const raw = readCookie(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 7;
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(
    token,
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${USER_KEY}=${encodeURIComponent(
    JSON.stringify(user),
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSession() {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${USER_KEY}=; path=/; max-age=0`;
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${USER_KEY}=; path=/; max-age=0; SameSite=Lax`;
}
