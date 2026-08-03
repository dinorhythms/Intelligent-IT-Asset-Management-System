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

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(digits);
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

export function riskLevel(score) {
  const num = Number(score);
  if (Number.isNaN(num)) return { label: 'Unknown', tone: 'neutral' };
  if (num > 0.7) return { label: 'Critical', tone: 'danger' };
  if (num > 0.45) return { label: 'Warning', tone: 'warning' };
  return { label: 'Healthy', tone: 'success' };
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
