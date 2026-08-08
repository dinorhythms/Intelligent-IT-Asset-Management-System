import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-10 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-300">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          You do not have permission to view this page. If you believe this is a
          mistake, contact your administrator.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
