import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/view', '/403'];

const DENIED_PATHS = {
  admin: [],
  technician: ['/users', '/audit', '/settings', '/categories', '/register'],
  staff: [
    '/users',
    '/audit',
    '/settings',
    '/categories',
    '/register',
    '/vendors',
    '/assignments',
    '/analytics',
  ],
};

function parseUser(request) {
  const raw = request.cookies.get('auth_user')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

function isDenied(pathname, role) {
  if (!role) return false;
  const denied = DENIED_PATHS[role] || [];
  return denied.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;
  const user = parseUser(request);
  const role = user?.role;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!token && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (token && (pathname === '/login' || pathname.startsWith('/login/'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isDenied(pathname, role) && !isPublic) {
    return NextResponse.redirect(new URL('/403', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/assets/:path*',
    '/requests',
    '/assignments',
    '/services',
    '/categories',
    '/vendors',
    '/analytics',
    '/scan',
    '/users',
    '/audit',
    '/settings',
    '/register',
  ],
};
