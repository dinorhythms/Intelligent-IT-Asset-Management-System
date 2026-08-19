export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(digits);
}

let currencyCode = 'NGN';

export function setCurrencyCode(code) {
  currencyCode = (code || 'NGN').trim().toUpperCase() || 'NGN';
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, {
    style: 'currency',
    currency: currencyCode,
  });
}

export const RISK_LEGEND = [
  { label: 'Low Risk', tone: 'success', range: '0.0 – 0.4' },
  { label: 'Medium Risk', tone: 'warning', range: '0.5 – 0.7' },
  { label: 'High Risk', tone: 'danger', range: '0.8 – 1.0' },
];

export function riskLevel(score) {
  const num = Number(score);
  if (Number.isNaN(num)) return { label: 'Unknown', tone: 'neutral' };
  if (num > 0.7) return { label: 'High Risk', tone: 'danger' };
  if (num > 0.4) return { label: 'Medium Risk', tone: 'warning' };
  return { label: 'Low Risk', tone: 'success' };
}

export function riskDescription(score) {
  const num = Number(score);
  if (Number.isNaN(num)) return 'No predictive score available for this asset.';
  if (num > 0.7) return 'High risk (0.8–1.0): asset is very likely to fail soon. Schedule immediate maintenance.';
  if (num > 0.4) return 'Medium risk (0.5–0.7): some degradation detected. Monitor closely.';
  return 'Low risk (0.0–0.4): asset is healthy. Continue normal operation.';
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function initials(name = '') {
  return name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}
