import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { Alert, Spinner, EmptyState } from '../components/Ui';
import Pill from '../components/Pill';
import { RiskBadge } from '../components/Risk';
import { formatDate, formatNumber, riskLevel } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const STATUS_TONE = {
  Available: 'success',
  Assigned: 'info',
  Returned: 'neutral',
};

export default function DashboardPage() {
  const { user, can } = useAuth();
  const isAdminTech = ['admin', 'technician'].includes(user?.role);
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setError('');
      try {
        const [assetData, requestData, serviceData] = await Promise.all([
          api.get('/assets'),
          api.get(isAdminTech ? '/requests' : '/requests/mine'),
          api.get('/services'),
        ]);
        if (!active) return;
        setAssets(assetData || []);
        setRequests(requestData || []);
        setServices(serviceData || []);
        if (can.analytics) {
          api
            .get('/analytics/dashboard')
            .then((data) => active && setAnalytics(data))
            .catch(() => active && setAnalytics(null));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load dashboard data.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [can.analytics, isAdminTech]);

  const summary = useMemo(() => {
    const openRequests = requests.filter(
      (r) => r.approvalStatus === 'pending' || r.requestStatus === 'open',
    ).length;
    const assignedAssets = assets.filter((a) => a.assetStatus === 'Assigned').length;
    const scored = assets.filter((a) => a.predictiveScore !== null && a.predictiveScore !== undefined);
    const avgRisk =
      scored.length > 0
        ? scored.reduce((sum, a) => sum + Number(a.predictiveScore || 0), 0) / scored.length
        : null;
    const critical = scored.filter((a) => riskLevel(a.predictiveScore).tone === 'danger').length;
    return { openRequests, assignedAssets, avgRisk, critical };
  }, [assets, requests]);

  const chartData = useMemo(() => {
    const statusCounts = {};
    assets.forEach((asset) => {
      const key = asset.assetStatus || 'unknown';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    return {
      labels: Object.keys(statusCounts).length ? Object.keys(statusCounts) : ['No data'],
      datasets: [
        {
          label: 'Assets',
          data: Object.keys(statusCounts).length ? Object.values(statusCounts) : [0],
          backgroundColor: ['#10b981', '#3b82f6', '#94a3b8', '#f59e0b', '#ef4444'],
          borderRadius: 6,
        },
      ],
    };
  }, [assets]);

  const maintenanceDue = useMemo(
    () =>
      [...assets]
        .filter((a) => a.nextMaintenanceDate)
        .sort((a, b) => (a.nextMaintenanceDate < b.nextMaintenanceDate ? -1 : 1))
        .slice(0, 5),
    [assets],
  );

  if (loading) return <Spinner label="Loading dashboard…" />;

  const cards = [
    { label: 'Assets Managed', value: assets.length, sub: `${summary.assignedAssets} assigned`, href: '/assets' },
    { label: isAdminTech ? 'Open Requests' : 'My Requests', value: summary.openRequests, sub: `${requests.length} total`, href: '/requests' },
    { label: 'Service Records', value: services.length, sub: 'maintenance history', href: '/services' },
    can.analytics
      ? {
          label: 'Avg Predictive Risk',
          value: summary.avgRisk === null ? '—' : `${Math.round(summary.avgRisk * 100)}%`,
          sub: `${summary.critical} critical`,
          href: '/analytics',
        }
      : { label: 'My Pending Requests', value: summary.openRequests, sub: 'awaiting approval', href: '/requests' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back, <span className="capitalize">{user?.username}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {can.analytics
              ? 'Overview of assets, maintenance requests, service history and predictive health.'
              : 'Overview of assets, your maintenance requests and service history.'}
          </p>
        </div>
        {isAdminTech && (
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2M7 12h10" />
            </svg>
            Scan QR Code
          </Link>
        )}
      </div>

      <Alert>{error}</Alert>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </Link>
        ))}
      </section>

      {analytics && (
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Asset Utilization</p>
            <p className="mt-1 text-3xl font-semibold">{analytics.assetUtilization}%</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Service Performance</p>
            <p className="mt-1 text-3xl font-semibold">{analytics.servicePerformance}%</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Compliance Status</p>
            <Pill tone={analytics.complianceStatus === 'compliant' ? 'success' : 'warning'}>
              {analytics.complianceStatus}
            </Pill>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Assets by Status</h2>
          {assets.length === 0 ? (
            <EmptyState title="No assets yet" />
          ) : (
            <div className="h-64">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' }, beginAtZero: true },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Upcoming Maintenance</h2>
          {maintenanceDue.length === 0 ? (
            <EmptyState title="No maintenance scheduled" />
          ) : (
            <ul className="space-y-3">
              {maintenanceDue.map((asset) => {
                const risk = riskLevel(asset.predictiveScore);
                return (
                  <li key={asset.id}>
                    <Link
                      href={`/assets/${asset.assetId}`}
                      className="flex items-center justify-between rounded-lg border border-slate-800 p-3 transition hover:border-slate-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {asset.assetName || [asset.make, asset.model].filter(Boolean).join(' ') || asset.assetId}
                        </p>
                        <p className="text-xs text-slate-500">{asset.assetId}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Pill tone={risk.tone}>{risk.label}</Pill>
                        <span className="text-xs text-slate-400">
                          {formatDate(asset.nextMaintenanceDate)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Assets</h2>
          <Link href="/assets" className="text-sm text-emerald-400 hover:text-emerald-300">
            View all
          </Link>
        </div>
        {assets.length === 0 ? (
          <EmptyState title="No assets registered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-2 pr-4 font-medium">Asset</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Risk</th>
                  <th className="py-2 font-medium">Next Maintenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {assets.slice(0, 8).map((asset) => {
                  const risk = riskLevel(asset.predictiveScore);
                  return (
                    <tr key={asset.id}>
                      <td className="py-2.5 pr-4">
                        <Link href={`/assets/${asset.assetId}`} className="font-medium hover:text-emerald-300">
                          {asset.assetName || [asset.make, asset.model].filter(Boolean).join(' ') || asset.assetId}
                        </Link>
                        <p className="text-xs text-slate-500">{asset.assetId}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400">
                        {asset.category || asset.assetType || '—'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Pill tone={STATUS_TONE[asset.assetStatus] || 'neutral'}>
                          {asset.assetStatus || 'Unknown'}
                        </Pill>
                      </td>
                      <td className="py-2.5 pr-4">
                        <RiskBadge score={asset.predictiveScore} />
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {formatDate(asset.nextMaintenanceDate)}
                      </td>
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
