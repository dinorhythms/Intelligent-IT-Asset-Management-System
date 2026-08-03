import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Alert, EmptyState, PageHeader, Spinner } from '../../components/Ui';
import Pill from '../../components/Pill';
import { formatDate, formatNumber } from '../../lib/utils';

function summarize(entry) {
  const response = entry.responsePayload || {};
  switch (entry.kind) {
    case 'predict':
      return `Score ${formatNumber(response.predictive_score)}, RUL ${formatNumber(response.rul_days, 0)} days`;
    case 'anomaly':
      return response.anomaly_detected
        ? `Anomaly detected (${response.findings?.length || 0} finding(s))`
        : 'No anomaly';
    case 'recommend':
      return Array.isArray(response.recommended_actions)
        ? `${response.recommended_actions.length} recommended action(s)`
        : 'Recommendations computed';
    case 'maintenance_schedule':
      return `Next maintenance ${response.next_maintenance_date || '—'}`;
    default:
      return JSON.stringify(response).slice(0, 120);
  }
}

export default function AnalyticsPage() {
  const { can } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kindFilter, setKindFilter] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      if (can.analytics) {
        const data = await api.get('/analytics/dashboard');
        setDashboard(data);
      }
      const allHistory = await api.get('/ai/history');
      setHistory(Array.isArray(allHistory) ? allHistory : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [can.analytics]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!kindFilter) return history;
    return history.filter((entry) => entry.kind === kindFilter);
  }, [history, kindFilter]);

  const kinds = useMemo(() => [...new Set(history.map((entry) => entry.kind))], [history]);

  if (loading) return <Spinner label="Loading analytics…" />;

  const metricCards = dashboard
    ? [
        { label: 'Asset Utilization', value: `${dashboard.assetUtilization}%`, tone: 'info' },
        { label: 'Service Performance', value: `${dashboard.servicePerformance}%`, tone: 'success' },
        {
          label: 'Compliance Status',
          value: dashboard.complianceStatus,
          tone: dashboard.complianceStatus === 'compliant' ? 'success' : 'warning',
        },
      ]
    : [];

  const predictKinds = history.filter((entry) => entry.kind === 'predict');
  const anomalies = history.filter((entry) => entry.kind === 'anomaly' && entry.responsePayload?.anomaly_detected);

  return (
    <div>
      <PageHeader
        title="Analytics & AI History"
        description="Predictive maintenance results and the full history of AI service calls."
      />

      <Alert>{error}</Alert>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        {metricCards.length > 0 ? (
          metricCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{card.label}</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-2xl font-semibold capitalize">{card.value}</p>
                <Pill tone={card.tone}>{card.value}</Pill>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 md:col-span-3">
            <p className="text-sm text-slate-400">
              Your role does not have access to the analytics dashboard summary.
            </p>
          </div>
        )}
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Total AI Calls</p>
          <p className="mt-1 text-3xl font-semibold">{history.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Predictive Runs</p>
          <p className="mt-1 text-3xl font-semibold">{predictKinds.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Anomalies Flagged</p>
          <p className="mt-1 text-3xl font-semibold">{anomalies.length}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">AI Service History</h2>
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
          >
            <option value="">All kinds</option>
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No AI activity yet"
            description="AI service calls are recorded automatically when assets, requests and services are created."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-2.5 pr-4 font-medium">Kind</th>
                  <th className="py-2.5 pr-4 font-medium">Asset</th>
                  <th className="py-2.5 pr-4 font-medium">Result</th>
                  <th className="py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((entry) => {
                  const anomalyDetected = entry.responsePayload?.anomaly_detected;
                  const tone =
                    entry.kind === 'anomaly'
                      ? anomalyDetected
                        ? 'danger'
                        : 'success'
                      : entry.kind === 'predict'
                        ? 'info'
                        : 'neutral';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 pr-4">
                        <Pill tone={tone}>{entry.kind}</Pill>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-300">{entry.assetId}</td>
                      <td className="py-2.5 pr-4 text-slate-300">{summarize(entry)}</td>
                      <td className="py-2.5 text-slate-500">{formatDate(entry.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
