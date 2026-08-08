const TONES = {
  danger: 'bg-red-500/15 text-red-300 border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  neutral: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export default function Pill({ tone = 'neutral', children }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone] || TONES.neutral}`}>
      {children}
    </span>
  );
}
