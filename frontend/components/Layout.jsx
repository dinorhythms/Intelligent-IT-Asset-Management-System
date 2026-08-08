import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { initials } from '../lib/utils';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10',
  },
  { href: '/assets', label: 'Assets', icon: 'M4 6h16M4 12h16M4 18h16' },
  {
    href: '/requests',
    label: 'Requests',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    href: '/assignments',
    label: 'Assignments',
    icon: 'M8 7h8M8 12h8M8 17h5M3 5a2 2 0 012-2h2a2 2 0 012 2M15 5a2 2 0 012-2h2a2 2 0 012 2M3 19a2 2 0 012-2h2a2 2 0 012 2M15 19a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    href: '/services',
    label: 'Services',
    icon: 'M12 9v2m0 4h.01M11 4.5L3.5 17a2 2 0 001.76 3h13.48a2 2 0 001.76-3L13 4.5a2 2 0 00-3.5 0z',
  },
  {
    href: '/categories',
    label: 'Categories',
    icon: 'M4 6h16M4 10h16M4 14h10M4 18h7M15 15l3-3m0 0l3 3m-3-3v9',
  },
  {
    href: '/vendors',
    label: 'Vendors',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: 'M9 19v-6M15 19V9M5 19V5M19 19h2M3 3v18h18',
  },
  {
    href: '/departments',
    label: 'Departments',
    icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M15 9h.01M15 13h.01M9 17h6',
  },
  {
    href: '/scan',
    label: 'QR Scan',
    icon: 'M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2M7 12h10',
  },
  {
    href: '/users',
    label: 'Users',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    href: '/audit',
    label: 'Audit Log',
    icon: 'M9 12h6m-6 4h6M9 8h1M7 4h10a2 2 0 012 2v14l-3-2-3 2-2-2-2 2-3-2V6a2 2 0 012-2z',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2-1V9l2-1-2-3-2 1a7 7 0 00-2-1L14 3h-4l-.8 2a7 7 0 00-2 1l-2-1-2 3 2 1v2l-2 1 2 3 2-1a7 7 0 002 1l.8 2h4l.8-2a7 7 0 002-1l2 1 2-3z',
  },
];

const ADMIN_ONLY = [
  '/users',
  '/audit',
  '/settings',
  '/categories',
  '/departments',
];
const STAFF_AND_UP = ['/requests'];
const TECHNICIAN_AND_UP = ['/assignments', '/analytics', '/vendors', '/scan'];

const ROLE_LABELS = {
  admin: 'Admin',
  technician: 'Technician',
  staff: 'Staff',
};

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const { theme, toggle } = useTheme();

  if (!loading && !isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-slate-950'>
        <div className='h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400' />
      </div>
    );
  }

  const role = user?.role;
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (ADMIN_ONLY.includes(item.href)) return role === 'admin';
    if (TECHNICIAN_AND_UP.includes(item.href)) {
      return ['admin', 'technician'].includes(role);
    }
    if (STAFF_AND_UP.includes(item.href)) return true;
    return true;
  });

  return (
    <div className='flex min-h-screen bg-slate-950 text-slate-100'>
      <aside className='sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900'>
        <div className='border-b border-slate-800 px-5 py-5'>
          <Link href='/' className='flex items-center gap-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 font-bold text-emerald-950'>
              IT
            </div>
            <div>
              <p className='text-sm font-semibold leading-tight'>
                IT Asset Manager
              </p>
              <p className='text-xs text-slate-500'>QR + AI Maintenance</p>
            </div>
          </Link>
        </div>

        <nav className='flex-1 space-y-1 overflow-y-auto p-3'>
          {visibleItems.map((item) => {
            const active =
              item.href === '/'
                ? router.pathname === '/'
                : router.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}>
                <svg
                  className='h-5 w-5 shrink-0'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={1.8}
                  strokeLinecap='round'
                  strokeLinejoin='round'>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className='border-t border-slate-800 p-4 flex items-center justify-between'>
          <Link
            href='/profile'
            className='flex items-center gap-3 rounded-lg transition hover:bg-slate-800'
            title='My profile'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold uppercase border-2 border-slate-600'>
              {initials(user?.username)}
            </div>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium'>{user?.username}</p>
              <p className='text-xs capitalize text-slate-500'>
                {ROLE_LABELS[user?.role] || user?.role}
              </p>
            </div>
          </Link>
          <div className='mt-1 flex items-center justify-between'>
            {/* <Link
              href='/profile'
              className='rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-emerald-300'
              title='My profile'>
              <svg
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={1.8}
                strokeLinecap='round'>
                <path d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
            </Link> */}
            <button
              onClick={logout}
              title='Log out'
              className='rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400'>
              <svg
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={1.8}
                strokeLinecap='round'>
                <path d='M15 12H3m0 0l4-4m-4 4l4 4M13 5V3a2 2 0 012-2h4a2 2 0 012 2v18a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2' />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className='flex-1 overflow-x-hidden'>
        <header className='sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur'>
          <p className='text-sm text-slate-400'>
            {NAV_ITEMS.find(
              (item) =>
                router.pathname.startsWith(item.href) && item.href !== '/',
            )?.label || 'Dashboard'}
          </p>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs'>
              <span className='h-2 w-2 rounded-full bg-emerald-400' />
              Connected
            </div>
            <button
              onClick={toggle}
              title={
                theme === 'light'
                  ? 'Switch to dark theme'
                  : 'Switch to light theme'
              }
              className='rounded-full border border-slate-800 bg-slate-900 p-2 text-slate-400 transition hover:text-slate-100'>
              {theme === 'light' ? (
                <svg
                  className='h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={1.8}
                  strokeLinecap='round'>
                  <path d='M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z' />
                </svg>
              ) : (
                <svg
                  className='h-4 w-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={1.8}
                  strokeLinecap='round'>
                  <path d='M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m9.9 9.9l1.4 1.4M5.6 18.4l1.4-1.4m9.9-9.9l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z' />
                </svg>
              )}
            </button>
          </div>
        </header>
        <div className='p-6'>{children}</div>
      </main>
    </div>
  );
}
