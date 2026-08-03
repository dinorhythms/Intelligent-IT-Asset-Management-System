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
import { formatDate, formatNumber, riskLevel } from '../../lib/utils';

export default function AssetDetailPage() {
  const router = useRouter();
  const { can } = useAuth();
  const permission = can.resource('assets');
  const assetId = router.query.id;

  const [asset, setAsset] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!assetId) return;
    setError('');
    try {
      const data = await api.get(`/assets/${assetId}`);
      setAsset(data);
      const allHistory = await api.get('/ai/history');
      setHistory(
        (Array.isArray(allHistory) ? allHistory : []).filter(
          (entry) =>
            entry.assetId === assetId &&
            ['predict', 'anomaly'].includes(entry.kind),
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const detailRows = [
    ['Asset ID', asset.assetId],
    ['Asset Name', asset.assetName],
    ['Identifier', asset.assetIdentifier],
    ['Type', asset.assetType],
    ['Status', asset.assetStatus],
    ['Lifecycle', asset.assetLifecycle],
    ['Manufacturer', asset.manufacturer],
    ['Location', asset.assetLocation],
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
    fallback: !prediction,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/assets" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Back to assets
        </Link>
        <div className="flex gap-3">
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
              <Pill tone={asset.assetStatus === 'active' ? 'success' : 'neutral'}>
                {asset.assetStatus}
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
                  <Pill tone={riskLevel(latestPrediction.predictiveScore).tone}>
                    {riskLevel(latestPrediction.predictiveScore).label}
                  </Pill>
                </div>
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
            {latestPrediction.fallback && (
              <p className="mt-3 text-xs text-amber-300/80">
                Showing stored score — the AI service may be offline. Run the analysis to refresh.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Recent AI Activity</h2>
            {history.length === 0 ? (
              <EmptyState title="No AI results yet" description="Predictions appear here after the AI service processes this asset." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 pr-4 font-medium">Kind</th>
                      <th className="py-2 pr-4 font-medium">Result</th>
                      <th className="py-2 pr-4 font-medium">Asset</th>
                      <th className="py-2 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {history.slice(0, 8).map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2.5 pr-4">
                          <Pill tone={entry.kind === 'anomaly' ? 'warning' : 'info'}>{entry.kind}</Pill>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-300">
                          {entry.kind === 'predict'
                            ? `Score ${formatNumber(entry.responsePayload?.predictive_score)}, RUL ${formatNumber(entry.responsePayload?.rul_days, 0)}d`
                            : entry.responsePayload?.anomaly_detected
                              ? 'Anomaly detected'
                              : 'No anomaly'}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500">{entry.assetId}</td>
                        <td className="py-2.5 text-slate-500">{formatDate(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
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
              Scan with the QR Scan page to view this asset from any authenticated device.
            </p>
            <Link
              href="/scan"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
            >
              Open scanner
            </Link>
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit asset — ${asset.assetId}`}
        footer={
          <>
            <GhostButton onClick={() => setEditOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.querySelector('#asset-form-submit')?.click()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save'}
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
