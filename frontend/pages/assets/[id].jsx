import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/api';
import {
  Alert,
  DangerButton,
  EmptyState,
  GhostButton,
  PrimaryButton,
  Spinner,
} from '../../components/Ui';
import Pill from '../../components/Pill';
import Modal from '../../components/Modal';
import AssetForm from '../../components/AssetForm';
import { BarChart, RulCurveChart } from '../../components/charts';
import { RiskBadge, RiskLegend } from '../../components/Risk';
import { formatCurrency, formatDate, formatDateTime, formatNumber, riskLevel } from '../../lib/utils';

const STATUS_TONE = {
  Available: 'success',
  Assigned: 'info',
  'Pending Return': 'warning',
  'In Service': 'info',
  Returned: 'neutral',
};

const RISK_BAND_TONE = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

export default function AssetDetailPage() {
  const router = useRouter();
  const { can, user } = useAuth();
  const permission = can.resource('assets');
  const assignmentPermission = can.resource('assignments');
  const isStaff = user?.role === 'staff';
  const assetId = router.query.id;

  const [asset, setAsset] = useState(null);
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [returns, setReturns] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDestination, setReturnDestination] = useState('available');
  const [submitting, setSubmitting] = useState(false);
  const [valuation, setValuation] = useState(null);
  const [aiTab, setAiTab] = useState('analysis');
  const [histKind, setHistKind] = useState('all');
  const [histRisk, setHistRisk] = useState('all');
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');

  const switchAiTab = (next) => {
    setAiTab((current) => {
      if (current === next) return current;
      api
        .post('/auditlogs', {
          action: next === 'analysis' ? 'ai.tab.analysis' : 'ai.tab.history',
          entityType: 'asset',
          entityId: String(assetId || ''),
          description: `Opened the AI ${next === 'analysis' ? 'Analysis' : 'History'} tab.`,
        })
        .catch(() => {});
      return next;
    });
  };

  const load = useCallback(async () => {
    if (!assetId) return;
    setError('');
    try {
      if (isStaff) {
        const data = await api.get(`/assets/${assetId}/details?role=staff`);
        setAsset(data);
        api
          .get(`/assets/${assetId}/analysis`)
          .then((result) => result && setAnalysis(result))
          .catch(() => setAnalysis(null));
        return;
      }
      const data = await api.get(`/assets/${assetId}`);
      setAsset(data);
      api
        .get(`/assets/${assetId}/assignments`)
        .then((rows) => Array.isArray(rows) && setAssignments(rows))
        .catch(() => setAssignments([]));
      api
        .get(`/assets/${assetId}/returns`)
        .then((rows) => Array.isArray(rows) && setReturns(rows))
        .catch(() => setReturns([]));
      api
        .get(`/assets/${assetId}/analysis`)
        .then((result) => result && setAnalysis(result))
        .catch(() => setAnalysis(null));
      api
        .get(`/assets/${assetId}/value`)
        .then((value) => value && setValuation(value))
        .catch(() => setValuation(null));
      api
        .get(`/auditlogs/${assetId}`)
        .then((rows) => Array.isArray(rows) && setAuditLogs(rows))
        .catch(() => setAuditLogs([]));
      api
        .get(`/services/asset/${assetId}`)
        .then((rows) => Array.isArray(rows) && setServiceRecords(rows))
        .catch(() => setServiceRecords([]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assetId, isStaff]);

  const loadHistory = useCallback(async () => {
    if (!assetId) return;
    const params = [];
    if (histKind && histKind !== 'all') params.push(`kind=${encodeURIComponent(histKind)}`);
    if (histRisk && histRisk !== 'all') params.push(`risk=${encodeURIComponent(histRisk)}`);
    if (histFrom) params.push(`from=${encodeURIComponent(histFrom)}`);
    if (histTo) params.push(`to=${encodeURIComponent(histTo)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    try {
      const rows = await api.get(`/assets/${assetId}/history${qs}`);
      setHistory(Array.isArray(rows) ? rows : []);
    } catch {
      setHistory([]);
    }
  }, [assetId, histKind, histRisk, histFrom, histTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isStaff) return;
    loadHistory();
  }, [isStaff, loadHistory]);

  const risk = useMemo(
    () => riskLevel(asset?.predictiveScore),
    [asset?.predictiveScore],
  );

  const runPrediction = async () => {
    setPredicting(true);
    setError('');
    try {
      const result = await api.post(`/assets/${assetId}/predict`, {});
      setPrediction(result);
      setNotice('Predictive analysis completed.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPredicting(false);
    }
  };

  const notifyMissingMetrics = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/assets/${assetId}/notify-missing`, {});
      setNotice('Admins have been notified about the missing AI metrics.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateReturn = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/assets/${assetId}/return-initiate`, {
        reason: returnReason,
      });
      setNotice('Return requested. An admin or technician will confirm it.');
      setReturnOpen(false);
      setReturnReason('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReturn = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/assets/${assetId}/return-confirm`, {
        destination: returnDestination,
      });
      setNotice(
        returnDestination === 'maintenance'
          ? 'Return confirmed. The asset was sent for maintenance.'
          : 'Return confirmed. The asset is available again.',
      );
      setReturnOpen(false);
      setReturnDestination('available');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (payload) => {
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/assets/${asset.assetId}`, payload);
      setNotice('Asset updated. Predictive score recalculated.');
      setEditOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.delete(`/assets/${asset.assetId}`);
      router.push('/assets');
    } catch (err) {
      setError(err.message);
      setDeleteOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading asset…" />;

  if (!asset) {
    return (
      <div>
        <Alert>{error || 'Asset not found.'}</Alert>
        <Link href="/assets" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Back to assets
        </Link>
      </div>
    );
  }

  if (isStaff) {
    const canRequestReturn =
      assignmentPermission.initiateReturn && asset.assetStatus === 'Assigned';
    const staffInsights = analysis?.insights || null;
    const staffScore = asset.predictiveScore ?? staffInsights?.currentRisk;
    const staffRisk = riskLevel(staffScore);
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link href="/assets" className="text-sm text-emerald-400 hover:text-emerald-300">
            ← Back to assets
          </Link>
          {canRequestReturn && (
            <GhostButton onClick={() => setReturnOpen(true)}>Request return</GhostButton>
          )}
        </div>

        <Alert>{error}</Alert>
        <Alert tone="success">{notice}</Alert>

        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
          <span>Some details are restricted to Admin/Tech accounts.</span>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{asset.assetName}</h1>
                <p className="text-sm text-slate-500">{asset.assetId}</p>
              </div>
              <Pill tone={STATUS_TONE[asset.assetStatus] || 'neutral'}>
                {asset.assetStatus || 'Unknown'}
              </Pill>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Asset Name</dt>
                <dd className="mt-0.5 text-sm text-slate-200">{asset.assetName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Asset ID / Tag</dt>
                <dd className="mt-0.5 text-sm text-slate-200">{asset.assetId || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Category</dt>
                <dd className="mt-0.5 text-sm text-slate-200">{asset.category || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Department</dt>
                <dd className="mt-0.5 text-sm text-slate-200">{asset.department || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Lifecycle</dt>
                <dd className="mt-0.5 text-sm text-slate-200">
                  {asset.lifecycleStatus || asset.condition || asset.assetLifecycle || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Make / Model</dt>
                <dd className="mt-0.5 text-sm text-slate-200">
                  {[asset.make, asset.model].filter(Boolean).join(' ') || '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">AI Risk Summary</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Predictive Score</p>
                <p className="mt-1 text-2xl font-semibold">
                  {staffScore != null ? formatNumber(staffScore) : '—'}
                </p>
                <div className="mt-2">
                  <RiskBadge score={staffScore} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Risk Band</p>
                <p className="mt-1 text-2xl font-semibold capitalize">
                  {asset.riskBand || staffRisk.label || 'unknown'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Trend</p>
                <p className="mt-1 text-2xl font-semibold capitalize">
                  {staffInsights?.trend || 'stable'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Modal
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
          title={`Request return — ${asset.assetId}`}
          footer={
            <>
              <GhostButton onClick={() => setReturnOpen(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleInitiateReturn} disabled={submitting}>
                {submitting ? 'Requesting…' : 'Request return'}
              </PrimaryButton>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Request to return <span className="font-medium">{asset.assetName}</span> (
              {asset.assetId}). An admin or technician will confirm the return.
            </p>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                Reason (optional)
              </label>
              <textarea
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value)}
                rows={3}
                placeholder="e.g. End of assignment, handover, upgrade…"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              />
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  const detailRows = [
    ['Asset ID', asset.assetId],
    ['Asset Name', asset.assetName],
    ['Category', asset.category || asset.assetType],
    ['Make', asset.make],
    ['Model', asset.model],
    ['Serial Number', asset.serialNumber],
    ['MAC Address', asset.macAddress],
    ['Vendor', asset.vendor || asset.vendorId],
    ['Delivery Date', formatDate(asset.deliveryDate)],
    ['Received By', asset.receivedBy],
    ['Warranty', asset.warranty],
    ['Status', asset.assetStatus],
    ['Lifecycle', asset.condition || asset.lifecycleStatus || asset.assetLifecycle],
    ['Location', asset.assetLocation],
    ['Notes', asset.notes],
    ['Purchase Cost', formatCurrency(asset.cost)],
    ['Usage Hours', formatNumber(asset.usageHours, 0)],
    ['Temperature', `${formatNumber(asset.temperature)} °C`],
    ['CPU Usage', `${formatNumber(asset.cpuUsage)}%`],
    ['Vibration', formatNumber(asset.vibration)],
    ['Load Factor', formatNumber(asset.loadFactor)],
    ['Years in Operation', formatNumber(asset.yearsOperation, 0)],
    ['Next Maintenance', formatDate(asset.nextMaintenanceDate)],
    ['Created', formatDate(asset.createdAt)],
  ];

  const latestPrediction = prediction || {
    predictiveScore: asset.predictiveScore,
    maintenanceForecast: risk.tone === 'danger' ? 'scheduled' : 'monitor',
    anomalyDetected: risk.tone === 'danger',
    rulDays: null,
    estimated: asset.scoreEstimated,
    fallback: !prediction,
  };

  const canInitiateReturn =
    assignmentPermission.initiateReturn && asset.assetStatus === 'Assigned';
  const canConfirmReturn =
    assignmentPermission.confirmReturn && asset.assetStatus === 'Pending Return';

  const insights = analysis?.insights || null;
  const riskTrendPoints = (analysis?.riskTrend || []).map((point) => ({
    title: `${formatDate(point.date)} — ${formatNumber(point.score * 100, 0)}%`,
    value: point.score,
  }));
  const rulCurvePoints = analysis?.rulCurve || [];
  const anomalyPoints = (analysis?.anomalyFrequency || []).map((point) => ({
    title: `${point.date} — ${point.count} anomaly(ies)`,
    value: point.count,
  }));
  const summaryRecords = analysis?.summary || [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/assets" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Back to assets
        </Link>
        <div className="flex flex-wrap gap-3">
          {canInitiateReturn && (
            <GhostButton onClick={() => setReturnOpen(true)}>Request return</GhostButton>
          )}
          {canConfirmReturn && (
            <PrimaryButton onClick={() => setReturnOpen(true)}>Confirm return</PrimaryButton>
          )}
          {permission.update && (
            <GhostButton onClick={() => setEditOpen(true)}>Edit</GhostButton>
          )}
          {permission.delete && (
            <DangerButton onClick={() => setDeleteOpen(true)}>Delete</DangerButton>
          )}
        </div>
      </div>

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{asset.assetName}</h1>
                <p className="text-sm text-slate-500">{asset.assetId}</p>
              </div>
              <Pill tone={STATUS_TONE[asset.assetStatus] || 'neutral'}>
                {asset.assetStatus || 'Unknown'}
              </Pill>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {detailRows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="mt-0.5 text-sm text-slate-200">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Predictive Maintenance</h2>
              {permission.predict && (
                <PrimaryButton onClick={runPrediction} disabled={predicting}>
                  {predicting ? 'Running AI…' : 'Run predictive analysis'}
                </PrimaryButton>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Predictive Score</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatNumber(latestPrediction.predictiveScore)}
                </p>
                <div className="mt-2">
                  <RiskBadge score={latestPrediction.predictiveScore} />
                </div>
                {(latestPrediction.estimated || asset.scoreEstimated) && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    Estimated score
                  </span>
                )}
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Maintenance Forecast</p>
                <p className="mt-1 text-2xl font-semibold capitalize">
                  {latestPrediction.maintenanceForecast || 'monitor'}
                </p>
                <p className="mt-2 text-xs text-slate-500">AI-driven schedule</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Anomaly Detected</p>
                <p className="mt-1 text-2xl font-semibold">
                  {latestPrediction.anomalyDetected ? 'Yes' : 'No'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  RUL: {latestPrediction.rulDays ? `${formatNumber(latestPrediction.rulDays, 0)} days` : '—'}
                </p>
              </div>
            </div>
            {latestPrediction.estimated || latestPrediction.fallback ? (
              <p className="mt-3 text-xs text-amber-300/80">
                AI metrics incomplete — fallback risk score applied. Please update
                telemetry for accurate prediction.
              </p>
            ) : (
              <p className="mt-3 text-xs text-emerald-300/80">
                Score computed by the AI service from live telemetry.
              </p>
            )}
            {asset.scoreEstimated && permission.predict && (
              <button
                onClick={notifyMissingMetrics}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
              >
                Notify admins of missing AI metrics
              </button>
            )}
            <div className="mt-4">
              <RiskLegend />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">AI Insights</h2>
              <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={() => switchAiTab('analysis')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    aiTab === 'analysis'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AI Analysis
                </button>
                <button
                  type="button"
                  onClick={() => switchAiTab('history')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    aiTab === 'history'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AI History
                </button>
              </div>
            </div>

            {aiTab === 'analysis' ? (
              insights ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Current Risk</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {insights.currentRisk != null ? `${formatNumber(insights.currentRisk * 100, 0)}%` : '—'}
                      </p>
                      <div className="mt-2">
                        <Pill tone={RISK_BAND_TONE[insights.riskBand] || 'neutral'}>
                          {insights.riskBand || 'unknown'}
                        </Pill>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Trend</p>
                      <p className="mt-1 text-2xl font-semibold capitalize">{insights.trend || 'stable'}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Avg risk: {insights.averageRisk != null ? `${formatNumber(insights.averageRisk * 100, 0)}%` : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Predictions</p>
                      <p className="mt-1 text-2xl font-semibold">{insights.totalPredictions || 0}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {insights.anomalyCount || 0} anomaly event(s)
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Maintenance forecast</p>
                      <p className="mt-1 text-sm capitalize text-slate-200">
                        {insights.maintenanceForecast || 'monitor'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Next maintenance</p>
                      <p className="mt-1 text-sm text-slate-200">
                        {formatDate(insights.nextMaintenanceDate) || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Estimated remaining life</p>
                      <p className="mt-1 text-sm text-slate-200">
                        {insights.rulDays != null ? `${formatNumber(insights.rulDays, 0)} days` : '—'}
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
                    {summaryRecords.length === 0 ? (
                      <EmptyState
                        title="No summary records yet"
                        description="Run predictive analysis to generate summary records."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="text-xs uppercase text-slate-500">
                            <tr className="border-b border-slate-800">
                              <th className="py-2 pr-4 font-medium">Date</th>
                              <th className="py-2 pr-4 font-medium">Score</th>
                              <th className="py-2 pr-4 font-medium">Risk</th>
                              <th className="py-2 pr-4 font-medium">Forecast</th>
                              <th className="py-2 pr-4 font-medium">Anomaly</th>
                              <th className="py-2 font-medium">Next maintenance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {summaryRecords.map((record) => (
                              <tr key={record.id}>
                                <td className="py-2.5 pr-4 text-slate-400">{formatDate(record.date)}</td>
                                <td className="py-2.5 pr-4 text-slate-200">{formatNumber(record.predictiveScore * 100, 0)}%</td>
                                <td className="py-2.5 pr-4">
                                  <Pill tone={RISK_BAND_TONE[record.riskBand] || 'neutral'}>
                                    {record.riskBand}
                                  </Pill>
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300">{record.maintenanceForecast || '—'}</td>
                                <td className="py-2.5 pr-4 text-slate-300">{record.anomalyDetected ? 'Yes' : 'No'}</td>
                                <td className="py-2.5 text-slate-400">{formatDate(record.nextMaintenanceDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No AI analysis yet"
                  description="Run predictive analysis to generate aggregated insights, graphs and summary records."
                />
              )
            ) : (
              <>
                <div className="mb-4 grid gap-2 sm:grid-cols-4">
                  <select
                    value={histKind}
                    onChange={(event) => setHistKind(event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    aria-label="Filter by kind"
                  >
                    <option value="all">All kinds</option>
                    <option value="predict">Predict</option>
                    <option value="anomaly">Anomaly</option>
                    <option value="maintenance_schedule">Maintenance schedule</option>
                  </select>
                  <select
                    value={histRisk}
                    onChange={(event) => setHistRisk(event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    aria-label="Filter by risk level"
                  >
                    <option value="all">All risk levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input
                    type="date"
                    value={histFrom}
                    onChange={(event) => setHistFrom(event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    aria-label="From date"
                  />
                  <input
                    type="date"
                    value={histTo}
                    onChange={(event) => setHistTo(event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    aria-label="To date"
                  />
                </div>
                {history.length === 0 ? (
                  <EmptyState
                    title="No AI events found"
                    description="Events from the AI service (predictions, anomalies, maintenance schedules) will appear here."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr className="border-b border-slate-800">
                          <th className="py-2 pr-4 font-medium">Kind</th>
                          <th className="py-2 pr-4 font-medium">Asset</th>
                          <th className="py-2 pr-4 font-medium">Result</th>
                          <th className="py-2 pr-4 font-medium">Risk</th>
                          <th className="py-2 font-medium">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {history.map((entry) => (
                          <tr key={entry.id}>
                            <td className="py-2.5 pr-4">
                              <Pill tone={entry.kind === 'anomaly' ? 'warning' : 'info'}>{entry.kind}</Pill>
                            </td>
                            <td className="py-2.5 pr-4 text-slate-300">{entry.assetName || entry.assetId}</td>
                            <td className="py-2.5 pr-4 text-slate-300">
                              {entry.kind === 'predict'
                                ? `Score ${formatNumber(entry.responsePayload?.predictive_score)}, RUL ${formatNumber(entry.responsePayload?.rul_days, 0)}d`
                                : entry.kind === 'anomaly'
                                  ? entry.responsePayload?.anomaly_detected
                                    ? 'Anomaly detected'
                                    : 'No anomaly'
                                  : 'Maintenance schedule'}
                            </td>
                            <td className="py-2.5 pr-4">
                              <Pill tone={RISK_BAND_TONE[entry.riskBand] || 'neutral'}>{entry.riskBand}</Pill>
                            </td>
                            <td className="py-2.5 text-slate-500">{formatDateTime(entry.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {valuation && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cost & Valuation</h2>
                <Pill tone="info">AI recommendation</Pill>
              </div>
              {valuation.cost ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Purchase Cost</p>
                    <p className="mt-1 text-2xl font-semibold">{formatCurrency(valuation.cost)}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {valuation.depreciationPercent}% depreciated
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Estimated Current Value</p>
                    <p className="mt-1 text-2xl font-semibold">{formatCurrency(valuation.estimatedValue)}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Based on usage ({valuation.basis?.effectiveYears} yrs) and {valuation.serviceCount} service record(s)
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-emerald-400">Recommended Auction Value</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-300">
                      {formatCurrency(valuation.recommendedAuctionValue)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Floor (salvage): {formatCurrency(valuation.salvageValue)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">{valuation.note}</p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Assignment History</h2>
            {assignments.length === 0 ? (
              <EmptyState
                title="No assignments yet"
                description="Assignments for this asset will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 pr-4 font-medium">Assigned To</th>
                      <th className="py-2 pr-4 font-medium">Department</th>
                      <th className="py-2 pr-4 font-medium">Assigned</th>
                      <th className="py-2 pr-4 font-medium">Returned</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id || assignment.assignmentId}>
                        <td className="py-2.5 pr-4 text-slate-200">{assignment.assignedTo}</td>
                        <td className="py-2.5 pr-4 text-slate-400">{assignment.department || '—'}</td>
                        <td className="py-2.5 pr-4 text-slate-400">{formatDate(assignment.assignedDate)}</td>
                        <td className="py-2.5 pr-4 text-slate-400">{formatDate(assignment.returnedDate)}</td>
                        <td className="py-2.5">
                          <Pill tone={assignment.status === 'assigned' ? 'info' : 'neutral'}>
                            {assignment.status}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Returns</h2>
            {returns.length === 0 ? (
              <EmptyState
                title="No returns yet"
                description="Initiations and confirmations for this asset will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 pr-4 font-medium">Initiated By</th>
                      <th className="py-2 pr-4 font-medium">Initiated</th>
                      <th className="py-2 pr-4 font-medium">Reason</th>
                      <th className="py-2 pr-4 font-medium">Confirmed By</th>
                      <th className="py-2 pr-4 font-medium">Confirmed</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {returns.map((item) => (
                      <tr key={item.assignmentId}>
                        <td className="py-2.5 pr-4 text-slate-200">{item.initiatedBy || '—'}</td>
                        <td className="py-2.5 pr-4 text-slate-400">{formatDateTime(item.initiatedAt)}</td>
                        <td className="py-2.5 pr-4 text-slate-400">{item.reason || '—'}</td>
                        <td className="py-2.5 pr-4 text-slate-200">{item.confirmedBy || '—'}</td>
                        <td className="py-2.5 pr-4 text-slate-400">{formatDateTime(item.confirmedAt)}</td>
                        <td className="py-2.5">
                          <Pill tone={item.status === 'returned' ? 'success' : 'warning'}>
                            {item.status}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Audit Log</h2>
            {auditLogs.length === 0 ? (
              <EmptyState
                title="No audit entries yet"
                description="Events for this asset will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 pr-4 font-medium">Action</th>
                      <th className="py-2 pr-4 font-medium">Actor</th>
                      <th className="py-2 pr-4 font-medium">Details</th>
                      <th className="py-2 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {auditLogs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 pr-4">
                          <Pill tone="neutral">{entry.action}</Pill>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-200">{entry.actor || '—'}</td>
                        <td className="py-2.5 pr-4 text-slate-400">
                          {entry.description || entry.details || '—'}
                        </td>
                        <td className="py-2.5 text-slate-500">{formatDateTime(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Service History</h2>
            {serviceRecords.length === 0 ? (
              <EmptyState
                title="No service records yet"
                description="Maintenance and service completions for this asset will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Technician</th>
                      <th className="py-2 pr-4 font-medium">Description</th>
                      <th className="py-2 pr-4 font-medium">Notes</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {serviceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 pr-4 text-slate-400">{formatDate(record.serviceDate)}</td>
                        <td className="py-2.5 pr-4 text-slate-200">{record.technician || '—'}</td>
                        <td className="py-2.5 pr-4 text-slate-300">{record.serviceDesc || '—'}</td>
                        <td className="py-2.5 pr-4 text-slate-400">{record.notes || '—'}</td>
                        <td className="py-2.5">
                          <Pill tone={record.serviceStatus === 'active' ? 'info' : 'neutral'}>
                            {record.serviceStatus || '—'}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {asset.currentAssignment && (
            <div className="rounded-xl border border-emerald-500/30 bg-slate-900 p-6">
              <h2 className="mb-4 text-lg font-semibold">Assigned To</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Staff</dt>
                  <dd className="font-medium text-slate-100">
                    {asset.currentAssignment.assignedTo}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Username</dt>
                  <dd className="text-slate-200">
                    {asset.currentAssignment.username}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Department</dt>
                  <dd className="text-slate-200">
                    {asset.currentAssignment.department || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="text-slate-200">
                    {asset.currentAssignment.email || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Assigned at</dt>
                  <dd className="text-slate-200">
                    {formatDateTime(asset.currentAssignment.assignedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Assigned by</dt>
                  <dd className="text-slate-200">
                    {asset.currentAssignment.assignedBy || '—'}
                  </dd>
                </div>
              </dl>
              {canInitiateReturn && (
                <GhostButton className="mt-4 w-full" onClick={() => setReturnOpen(true)}>
                  Request return
                </GhostButton>
              )}
              {canConfirmReturn && (
                <PrimaryButton className="mt-4 w-full" onClick={() => setReturnOpen(true)}>
                  Confirm return
                </PrimaryButton>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
            <h2 className="mb-4 text-lg font-semibold">QR Code</h2>
            {asset.qrCode ? (
              <img
                src={asset.qrCode}
                alt={`QR code for ${asset.assetId}`}
                className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
              />
            ) : (
              <p className="text-sm text-slate-500">QR code unavailable.</p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Scans open a public page at{' '}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">/view/{asset.uniqueId || asset.assetId}</code>{' '}
              showing the device and its assigned user. No login required.
            </p>
            <Link
              href={`/view/${asset.uniqueId || asset.assetId}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
            >
              Open public view
            </Link>
            {permission.predict && (
              <Link
                href="/scan"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Open scanner
              </Link>
            )}
            {asset.qrCode && (
              <a
                href={asset.qrCode}
                download={`${asset.assetId}-qr.png`}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Download QR
              </a>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title={
          canConfirmReturn ? 'Confirm return' : `Request return — ${asset.assetId}`
        }
        footer={
          <>
            <GhostButton onClick={() => setReturnOpen(false)}>Cancel</GhostButton>
            {canConfirmReturn ? (
              <PrimaryButton onClick={handleConfirmReturn} disabled={submitting}>
                {submitting ? 'Confirming…' : 'Confirm return'}
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={handleInitiateReturn} disabled={submitting}>
                {submitting ? 'Requesting…' : 'Request return'}
              </PrimaryButton>
            )}
          </>
        }
      >
        {canConfirmReturn ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Confirm the return of <span className="font-medium">{asset.assetName}</span> (
              {asset.assetId}). The assigned user will be notified.
            </p>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                Destination
              </label>
              <select
                value={returnDestination}
                onChange={(event) => setReturnDestination(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              >
                <option value="available">Available (return to inventory)</option>
                <option value="maintenance">In Service (send for maintenance)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Request to return <span className="font-medium">{asset.assetName}</span> (
              {asset.assetId}). An admin or technician will confirm the return.
            </p>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                Reason (optional)
              </label>
              <textarea
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value)}
                rows={3}
                placeholder="e.g. End of assignment, handover, upgrade…"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit asset — ${asset.assetId}`}
        footer={
          <>
            <GhostButton onClick={() => setEditOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('asset-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </PrimaryButton>
          </>
        }
      >
        <AssetForm asset={asset} onSubmit={handleEdit} onCancel={() => setEditOpen(false)} submitting={submitting} />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete asset"
        footer={
          <>
            <GhostButton onClick={() => setDeleteOpen(false)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete asset'}
            </DangerButton>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete <span className="font-medium">{asset.assetName}</span> (
          {asset.assetId})? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
