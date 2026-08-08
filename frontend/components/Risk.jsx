import Pill from './Pill';
import { formatNumber, riskDescription, riskLevel, RISK_LEGEND } from '../lib/utils';

export function RiskBadge({ score, showValue = true }) {
  const risk = riskLevel(score);
  const numeric =
    score === null || score === undefined || score === ''
      ? null
      : formatNumber(score);
  return (
    <span
      title={riskDescription(score)}
      className="inline-flex cursor-help items-center gap-1.5"
    >
      <Pill tone={risk.tone}>
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-current" />
        {risk.label}
        {showValue && numeric !== null && (
          <span className="opacity-70">· {numeric}</span>
        )}
      </Pill>
    </span>
  );
}

export function RiskLegend({ className = '' }) {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs ${className}`}
    >
      <span className="text-slate-500">Risk scale:</span>
      {RISK_LEGEND.map((level) => (
        <span key={level.label} className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-current" style={{ color: level.tone === 'success' ? '#10b981' : level.tone === 'warning' ? '#f59e0b' : '#ef4444' }} />
          {level.label}
          <span className="text-slate-500">({level.range})</span>
        </span>
      ))}
    </div>
  );
}
