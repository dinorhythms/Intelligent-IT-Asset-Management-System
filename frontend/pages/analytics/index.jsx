import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Alert, EmptyState, PageHeader, Spinner } from '../../components/Ui';
import Pill from '../../components/Pill';
import { BarChart, RulCurveChart } from '../../components/charts';
import { formatDate, formatNumber } from '../../lib/utils';

const KIND_OPTIONS = ['predict', 'anomaly', 'maintenance_schedule', 'recommend'];
const RISK_OPTIONS = ['low', 'medium', 'high'];
const RISK_TONE = { low: 'success', medium: 'warning', high: 'danger' };

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

function groupByDay(entries, pickValue) {
  const byDate = {};
  entries.forEach((entry) => {
    const date = String(entry.createdAt || '').slice(0, 10);
    const value = pickValue(entry);
    if (!date || value == null) return;
    (byDate[date] = byDate[date] || []).push(value);
  });
  return Object.entries(byDate)
    .map(([date, values]) => ({ date, values }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export default function AnalyticsPage() {
  const { can } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('analysis');
  const [kindFilter, setKindFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

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

  const switchTab = (next) => {
    setTab((current) => {
      if (current === next) return current;
      api
        .post('/auditlogs', {
          action: next === 'analysis' ? 'ai.tab.analysis' : 'ai.tab.history',
          description: `Opened the AI ${next === 'analysis' ? 'Analysis' : 'History'} tab on Analytics.`,
        })
        .catch(() => {});
      return next;
    });
  };

  const filteredHistory = useMemo(
    () =>
      history.filter((entry) => {
        if (kindFilter !== 'all' && entry.kind !== kindFilter) return false;
        if (riskFilter !== 'all' && entry.riskBand !== riskFilter) return false;
        const day = String(entry.createdAt || '').slice(0, 10);
        if (fromFilter && day < fromFilter) return false;
        if (toFilter && day > toFilter) return false;
        return true;
      }),
    [history, kindFilter, riskFilter, fromFilter, toFilter],
  );

  const predictEvents = useMemo(
    () => history.filter((entry) => entry.kind === 'predict'),
    [history],
  );
  const anomalyDetected = useMemo(
    () =>
      history.filter(
        (entry) =>
          entry.kind === 'anomaly' && entry.responsePayload?.anomaly_detected,
      ),
    [history],
  );

  const riskTrendPoints = useMemo(() => {
    const groups = groupByDay(predictEvents, (entry) =>
      Number(entry.responsePayload?.predictive_score),
    );
    return groups.map(({ date, values }) => ({
      title: date,
      value: Math.round(
        (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
      ),
    }));
  }, [predictEvents]);

  const rulCurvePoints = useMemo(() => {
    const latestByDay = {};
    predictEvents.forEach((entry) => {
      const date = String(entry.createdAt || '').slice(0, 10);
      const rulDays = Number(entry.responsePayload?.rul_days);
      if (!date || !Number.isFinite(rulDays)) return;
      latestByDay[date] = { date, rulDays };
    });
    return Object.values(latestByDay).sort((a, b) =>
      a.date < b.date ? -1 : 1,
    );
  }, [predictEvents]);

  const anomalyPoints = useMemo(
    () =>
      groupByDay(anomalyDetected, () => 1).map(({ date, values }) => ({
        title: date,
        value: values.length,
      })),
    [anomalyDetected],
  );

  const summaryRecords = useMemo(
    () =>
      [...predictEvents, ...anomalyDetected].sort((a, b) =>
        String(a.createdAt) < String(b.createdAt) ? 1 : -1,
      ),
    [predictEvents, anomalyDetected],
  );

  const averageRisk = useMemo(() => {
    if (predictEvents.length === 0) return null;
    const total = predictEvents.reduce((sum, entry) => {
      const score = Number(entry.responsePayload?.predictive_score);
      return sum + (Number.isFinite(score) ? score : 0);
    }, 0);
    const avg = total / predictEvents.length;
    return {
      percent: Math.round(avg * 100),
      band: avg < 0.4 ? 'low' : avg <= 0.7 ? 'medium' : 'high',
    };
  }, [predictEvents]);

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

  return (
    <div>
      <PageHeader
        title="Analytics & AI"
        description="Predictive maintenance insights and the full history of AI service calls."
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

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => switchTab('analysis')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === 'analysis'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AI Analysis
            </button>
            <button
              type="button"
              onClick={() => switchTab('history')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === 'history'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AI History
            </button>
          </div>
        </div>

        {tab === 'analysis' ? (
          history.length === 0 ? (
            <EmptyState
              title="No AI activity yet"
              description="AI service calls are recorded automatically when assets, requests and services are created."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total AI Calls</p>
                  <p className="mt-1 text-2xl font-semibold">{history.length}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Predictive Runs</p>
                  <p className="mt-1 text-2xl font-semibold">{predictEvents.length}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Anomalies Flagged</p>
                  <p className="mt-1 text-2xl font-semibold">{anomalyDetected.length}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Average Risk</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {averageRisk ? `${averageRisk.percent}%` : '—'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {averageRisk ? (
                      <Pill tone={RISK_TONE[averageRisk.band]}>{averageRisk.band}</Pill>
                    ) : (
                      'No predictions yet'
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Risk trend</p>
                  {riskTrendPoints.length > 1 ? (
                    <BarChart data={riskTrendPoints} />
                  ) : (
                    <p className="text-xs text-slate-500">Not enough data yet.</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">RUL curve</p>
                  {rulCurvePoints.length > 1 ? (
                    <RulCurveChart data={rulCurvePoints} />
                  ) : (
                    <p className="text-xs text-slate-500">Not enough data yet.</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Anomaly frequency</p>
                  {anomalyPoints.length > 0 ? (
                    <BarChart data={anomalyPoints} barClass="bg-amber-500/60" />
                  ) : (
                    <p className="text-xs text-slate-500">No anomalies recorded.</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Summary records</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr className="border-b border-slate-800">
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Asset</th>
                        <th className="py-2 pr-4 font-medium">Kind</th>
                        <th className="py-2 pr-4 font-medium">Risk</th>
                        <th className="py-2 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {summaryRecords.map((entry) => {
                        const score = Number(entry.responsePayload?.predictive_score);
                        return (
                          <tr key={entry.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 pr-4 text-slate-500">{formatDate(entry.createdAt)}</td>
                            <td className="py-2.5 pr-4 text-slate-300">
                              {entry.assetName || entry.assetId}
                            </td>
                            <td className="py-2.5 pr-4">
                              <Pill tone={entry.kind === 'predict' ? 'info' : 'warning'}>
                                {entry.kind}
                              </Pill>
                            </td>
                            <td className="py-2.5 pr-4">
                              <Pill tone={RISK_TONE[entry.riskBand] || 'neutral'}>
                                {entry.riskBand || 'low'}
                              </Pill>
                            </td>
                            <td className="py-2.5 text-slate-300">
                              {entry.kind === 'predict' && Number.isFinite(score)
                                ? `${formatNumber(score * 100, 0)}% risk`
                                : summarize(entry)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Event type</label>
                <select
                  value={kindFilter}
                  onChange={(event) => setKindFilter(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="all">All types</option>
                  {KIND_OPTIONS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Risk level</label>
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="all">All risks</option>
                  {RISK_OPTIONS.map((risk) => (
                    <option key={risk} value={risk}>
                      {risk}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">From</label>
                <input
                  type="date"
                  value={fromFilter}
                  onChange={(event) => setFromFilter(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">To</label>
                <input
                  type="date"
                  value={toFilter}
                  onChange={(event) => setToFilter(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <EmptyState
                title="No AI events match your filters"
                description="Try adjusting the event type, risk level, or date range."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-800">
                      <th className="py-2.5 pr-4 font-medium">Kind</th>
                      <th className="py-2.5 pr-4 font-medium">Asset</th>
                      <th className="py-2.5 pr-4 font-medium">Result</th>
                      <th className="py-2.5 pr-4 font-medium">Risk</th>
                      <th className="py-2.5 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredHistory.map((entry) => {
                      const anomalyDetectedFlag = entry.responsePayload?.anomaly_detected;
                      const tone =
                        entry.kind === 'anomaly'
                          ? anomalyDetectedFlag
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
                          <td className="py-2.5 pr-4">
                            <Link
                              href={`/assets/${entry.assetId}`}
                              className="text-slate-300 hover:text-emerald-300"
                            >
                              {entry.assetName || entry.assetId}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-300">{summarize(entry)}</td>
                          <td className="py-2.5 pr-4">
                            <Pill tone={RISK_TONE[entry.riskBand] || 'neutral'}>
                              {entry.riskBand || 'low'}
                            </Pill>
                          </td>
                          <td className="py-2.5 text-slate-500">{formatDate(entry.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
