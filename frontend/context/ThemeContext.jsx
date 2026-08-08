import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../lib/api';
import { getToken } from '../lib/auth';

const ThemeContext = createContext(null);

const THEME_KEY = 'theme';

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(
      '(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)',
    ),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(value) {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_KEY}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function getInitialTheme() {
  if (typeof document !== 'undefined') {
    const stored = readCookie(THEME_KEY) || localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      return 'light';
    }
  }
  return 'dark';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within a ThemeProvider');
  return value;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    if (!getToken()) return;
    api
      .get('/settings/theme')
      .then((data) => {
        const serverTheme =
          data?.theme === 'light' || data?.theme === 'dark' ? data.theme : null;
        if (serverTheme) {
          setTheme(serverTheme);
          applyTheme(serverTheme);
        }
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_KEY, next);
        writeCookie(next);
      }
      applyTheme(next);
      if (getToken()) {
        api.put('/settings/theme', { theme: next }).catch(() => {});
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, toggle, isLight: theme === 'light' }),
    [theme, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
