import { formatDate, formatNumber } from '../lib/utils';

export function BarChart({ data, height = 96, barClass }) {
  if (!data || data.length === 0) return null;
  const values = data.map((item) => Number(item.value) || 0);
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 overflow-x-auto" style={{ height }}>
      {data.map((item, index) => (
        <div
          key={index}
          title={item.title || ''}
          className={`w-6 shrink-0 rounded-t ${barClass || 'bg-emerald-500/50'}`}
          style={{ height: `${Math.min(100, Math.max(3, ((Number(item.value) || 0) / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

export function RulCurveChart({ data }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map((point) => Number(point.rulDays) || 0), 1);
  const points = data
    .map(
      (point, index) =>
        `${(index / (data.length - 1)) * 100},${38 - ((Number(point.rulDays) || 0) / max) * 34}`,
    )
    .join(' ');
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-24 w-full">
        <polyline
          points={points}
          fill="none"
          stroke="#34d399"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{formatDate(data[0].date)}</span>
        <span>{data[data.length - 1].rulDays != null ? `${formatNumber(data[data.length - 1].rulDays, 0)}d remaining` : ''}</span>
      </div>
    </div>
  );
}
