export function Alert({ tone = 'error', children }) {
  const tones = {
    error: 'border-red-500/40 bg-red-500/10 text-red-200',
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    info: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  };
  if (!children) return null;
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-12 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function AccessDenied({ title = 'Access denied', description }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-300">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        {description || 'You do not have permission to view this page. If you believe this is a mistake, contact your administrator.'}
      </p>
    </div>
  );
}
