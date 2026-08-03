import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/api';
import {
  Alert,
  DangerButton,
  EmptyState,
  GhostButton,
  PageHeader,
  PrimaryButton,
  Spinner,
} from '../../components/Ui';
import Pill from '../../components/Pill';
import Modal from '../../components/Modal';
import AssetForm from '../../components/AssetForm';
import { formatDate, formatNumber, riskLevel } from '../../lib/utils';

export default function AssetsPage() {
  const { can } = useAuth();
  const permission = can.resource('assets');

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/assets');
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!filter) return assets;
    return assets.filter((asset) =>
      [asset.assetId, asset.assetName, asset.assetType, asset.assetStatus, asset.assetLocation]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [assets, filter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (asset) => {
    setEditing(asset);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (editing) {
        await api.put(`/assets/${editing.assetId}`, payload);
        setNotice(`Asset ${editing.assetId} updated. Predictive score recalculated.`);
      } else {
        await api.post('/assets', payload);
        setNotice('Asset created. AI predictive scoring is running.');
      }
      setModalOpen(false);
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
    setNotice('');
    try {
      await api.delete(`/assets/${deleting.assetId}`);
      setNotice(`Asset ${deleting.assetId} deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading assets…" />;

  return (
    <div>
      <PageHeader
        title="Asset Management"
        description="Register, update and track assets with QR codes and predictive health."
        actions={
          permission.create && (
            <PrimaryButton onClick={openCreate}>
              <span className="text-lg leading-none">+</span> Add asset
            </PrimaryButton>
          )
        }
      />

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <div className="mb-4">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search by ID, name, type, status or location…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No assets found"
          description="Register your first asset to start tracking it with QR codes and AI predictions."
          action={
            permission.create && (
              <PrimaryButton onClick={openCreate}>Add asset</PrimaryButton>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">Asset</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Location</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Risk Score</th>
                  <th className="py-3 pr-4 font-medium">Next Maintenance</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((asset) => {
                  const risk = riskLevel(asset.predictiveScore);
                  return (
                    <tr key={asset.id} className="hover:bg-slate-800/40">
                      <td className="py-3 pl-4 pr-4">
                        <Link
                          href={`/assets/${asset.assetId}`}
                          className="font-medium hover:text-emerald-300"
                        >
                          {asset.assetName}
                        </Link>
                        <p className="text-xs text-slate-500">{asset.assetId}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{asset.assetType || '—'}</td>
                      <td className="py-3 pr-4 text-slate-400">{asset.assetLocation || '—'}</td>
                      <td className="py-3 pr-4">
                        <Pill tone={asset.assetStatus === 'active' ? 'success' : 'neutral'}>
                          {asset.assetStatus || 'unknown'}
                        </Pill>
                      </td>
                      <td className="py-3 pr-4">
                        <Pill tone={risk.tone}>{formatNumber(asset.predictiveScore)}</Pill>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {formatDate(asset.nextMaintenanceDate)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/assets/${asset.assetId}`}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                          >
                            View
                          </Link>
                          {permission.update && (
                            <button
                              onClick={() => openEdit(asset)}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                          )}
                          {permission.delete && (
                            <button
                              onClick={() => setDeleting(asset)}
                              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit asset — ${editing.assetId}` : 'Add a new asset'}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() =>
                document.querySelector('#asset-form-submit')?.click()
              }
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save'}
            </PrimaryButton>
          </>
        }
      >
        <AssetForm
          asset={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete asset"
        footer={
          <>
            <GhostButton onClick={() => setDeleting(null)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete asset'}
            </DangerButton>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete{' '}
          <span className="font-medium text-slate-100">{deleting?.assetName}</span> (
          {deleting?.assetId})? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
