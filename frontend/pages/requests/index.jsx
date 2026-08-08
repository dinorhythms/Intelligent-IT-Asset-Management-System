import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
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
import RequestForm from '../../components/RequestForm';
import { formatDate } from '../../lib/utils';

const PRIORITY_TONE = {
  urgent: 'danger',
  high: 'warning',
  normal: 'info',
  low: 'neutral',
};

function approvalTone(status) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
}

export default function RequestsPage() {
  const { user, can } = useAuth();
  const permission = can.resource('requests');
  const isAdminTech = ['admin', 'technician'].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('');

  const [approving, setApproving] = useState(null);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [approveError, setApproveError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get(isAdminTech ? '/requests' : '/requests/mine');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdminTech]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!filter) return requests;
    return requests.filter((request) =>
      [
        request.requestNo,
        request.category,
        request.requestPriority,
        request.requestedBy,
        request.approvalStatus,
      ]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [requests, filter]);

  const filteredAvailable = useMemo(() => {
    const term = search.trim().toLowerCase();
    return availableAssets.filter((asset) => {
      if (lifecycleFilter !== 'all' && asset.lifecycleStatus !== lifecycleFilter) {
        return false;
      }
      if (!term) return true;
      const haystack = [
        asset.assetName,
        asset.assetId,
        asset.category,
        asset.department,
        asset.lifecycleStatus,
        asset.condition,
        asset.lastServiceDate ? formatDate(asset.lastServiceDate) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [availableAssets, search, lifecycleFilter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (editing) {
        await api.put(`/requests/${editing.requestNo}`, payload);
        setNotice(`Request ${editing.requestNo} updated.`);
      } else {
        await api.post('/requests', payload);
        setNotice('Request submitted. An administrator will review it.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadDetails = useCallback(async (assetId) => {
    setDetails(null);
    try {
      const data = await api.get(`/assets/${assetId}/details`);
      setDetails(data);
    } catch {
      setDetails(null);
    }
  }, []);

  const openApprove = async (request) => {
    setError('');
    setApproveError('');
    setApproving(request);
    setSelectedId(null);
    setSearch('');
    setLifecycleFilter('all');
    setDropdownOpen(true);
    setDetails(null);
    setAvailableAssets([]);
    setAvailableLoading(true);
    try {
      const category = request.category || '';
      const data = await api.get(
        `/assets/available${category ? `?category=${encodeURIComponent(category)}` : ''}`,
      );
      const list = Array.isArray(data) ? data : [];
      setAvailableAssets(list);
      if (list.length > 0) {
        setSelectedId(list[0].assetId);
        await loadDetails(list[0].assetId);
      }
    } catch (err) {
      setApproveError(err.message);
    } finally {
      setAvailableLoading(false);
    }
  };

  const selectAsset = async (asset) => {
    setSelectedId(asset.assetId);
    setSearch('');
    setDropdownOpen(false);
    await loadDetails(asset.assetId);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setDetails(null);
    setDropdownOpen(true);
  };

  const confirmApprove = async () => {
    setSubmitting(true);
    setError('');
    setNotice('');
    setApproveError('');
    try {
      const result = await api.put(`/requests/${approving.requestNo}/approve`, {
        assetIds: selectedId ? [selectedId] : [],
      });
      const assigned = result?.assignments?.length || 0;
      setNotice(
        assigned > 0
          ? `Request ${approving.requestNo} approved and ${assigned} asset(s) assigned.`
          : `Request ${approving.requestNo} approved. No available assets in this category — it stays approved but unfulfilled.`,
      );
      setApproving(null);
      await load();
    } catch (err) {
      setApproveError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (request) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.put(`/requests/${request.requestNo}/reject`, {
        comment: 'Rejected by approver.',
      });
      setNotice(`Request ${request.requestNo} rejected.`);
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
      await api.delete(`/requests/${deleting.requestNo}`);
      setNotice(`Request ${deleting.requestNo} deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading requests…" />;

  return (
    <div>
      <PageHeader
        title="Request Management"
        description={
          isAdminTech
            ? 'Review asset requests, approve or reject them. Approval opens a modal to select which available devices to assign.'
            : 'Request a device by category. Approved requests are fulfilled by an administrator or technician.'
        }
        actions={
          permission.create && (
            <PrimaryButton onClick={openCreate}>
              <span className="text-lg leading-none">+</span> New request
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
          placeholder="Search requests…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No requests found"
          description={
            permission.create
              ? isAdminTech
                ? 'There are no requests to review yet.'
                : 'Request a device to get started.'
              : 'There are no requests to display.'
          }
          action={
            permission.create && <PrimaryButton onClick={openCreate}>New request</PrimaryButton>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">Request</th>
                  <th className="py-3 pr-4 font-medium">Category</th>
                  <th className="py-3 pr-4 font-medium">Qty</th>
                  <th className="py-3 pr-4 font-medium">Requester</th>
                  <th className="py-3 pr-4 font-medium">Priority</th>
                  <th className="py-3 pr-4 font-medium">Approval</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((request) => (
                  <tr key={request.requestNo} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4 font-medium text-slate-200">{request.requestNo}</td>
                    <td className="py-3 pr-4 text-slate-300">{request.category || '—'}</td>
                    <td className="py-3 pr-4 text-slate-300">{request.qty ?? 1}</td>
                    <td className="py-3 pr-4 text-slate-300">{request.requestedBy || '—'}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={PRIORITY_TONE[request.requestPriority] || 'neutral'}>
                        {request.requestPriority}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4">
                      <Pill tone={approvalTone(request.approvalStatus)}>
                        {request.approvalStatus}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(request.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        {isAdminTech && request.approvalStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => openApprove(request)}
                              disabled={submitting}
                              className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(request)}
                              disabled={submitting}
                              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {permission.update && (
                          <button
                            onClick={() => {
                              setEditing(request);
                              setModalOpen(true);
                            }}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                          >
                            Edit
                          </button>
                        )}
                        {permission.delete && (
                          <button
                            onClick={() => setDeleting(request)}
                            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit request — ${editing.requestNo}` : 'Create a request'}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('request-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </PrimaryButton>
          </>
        }
      >
        <RequestForm
          request={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete request"
        footer={
          <>
            <GhostButton onClick={() => setDeleting(null)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete request'}
            </DangerButton>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete request{' '}
          <span className="font-medium text-slate-100">{deleting?.requestNo}</span> for{' '}
          {deleting?.category}? This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        title={`Approve request — ${approving?.requestNo}`}
        wide
        footer={
          <>
            <GhostButton onClick={() => setApproving(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={confirmApprove} disabled={submitting}>
              {submitting ? 'Approving…' : 'Confirm & Approve'}
            </PrimaryButton>
          </>
        }
      >
        {approveError && <Alert>{approveError}</Alert>}
        <p className="mb-4 text-sm text-slate-400">
          Select one or more available {approving?.category || ''} devices to assign
          to{' '}
          <span className="font-medium text-slate-200">{approving?.requestedBy}</span>.
          Approving without selecting any device leaves the request approved but
          unfulfilled.
        </p>
        {availableLoading ? (
          <Spinner label="Loading available assets…" />
        ) : availableAssets.length === 0 ? (
          <EmptyState
            title="No available assets in this category."
            description="There are no unassigned devices matching this request. You can still confirm the approval — the request will stay approved but unfulfilled until a device is available."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                Choose a device
              </label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      placeholder="Search by device, category, department, lifecycle…"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      ⌄
                    </span>
                  </div>
                  <select
                    value={lifecycleFilter}
                    onChange={(event) => {
                      setLifecycleFilter(event.target.value);
                      setDropdownOpen(true);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    aria-label="Filter by lifecycle"
                  >
                    <option value="all">All lifecycles</option>
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                  </select>
                </div>

                {dropdownOpen && (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-xl">
                    {filteredAvailable.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-slate-500">
                        No devices match your search.
                      </p>
                    ) : (
                      filteredAvailable.slice(0, 10).map((asset) => (
                        <button
                          key={asset.assetId}
                          type="button"
                          onClick={() => selectAsset(asset)}
                          className={`block w-full border-b border-slate-800 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-800/50 ${
                            selectedId === asset.assetId ? 'bg-emerald-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-100">
                              {asset.assetName || asset.assetId}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {asset.assetId}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Pill tone="info">{asset.category || '—'}</Pill>
                            <Pill
                              tone={asset.lifecycleStatus === 'New' ? 'success' : 'neutral'}
                            >
                              {asset.lifecycleStatus || '—'}
                            </Pill>
                            {asset.department && (
                              <span className="text-xs text-slate-500">{asset.department}</span>
                            )}
                            <span className="text-xs text-slate-500">
                              Last service:{' '}
                              {asset.lastServiceDate
                                ? formatDate(asset.lastServiceDate)
                                : 'None'}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedId && !dropdownOpen && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-emerald-200">
                        {availableAssets.find((asset) => asset.assetId === selectedId)
                          ?.assetName || selectedId}
                      </p>
                      <p className="text-xs text-slate-500">
                        {availableAssets.find((asset) => asset.assetId === selectedId)
                          ?.category || '—'}{' '}
                        ·{' '}
                        {availableAssets.find((asset) => asset.assetId === selectedId)
                          ?.lifecycleStatus || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(true)}
                        className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        aria-label="Clear selection"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Selecting a device assigns it to {approving?.requestedBy} on approval.
                Approving without a selection leaves the request approved but
                unfulfilled.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-200">Device details</h4>
              {details ? (
                <>
                  <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Asset ID (UUID)</dt>
                    <dd className="break-all font-mono text-xs text-slate-200">{details.id}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Lifecycle</dt>
                    <dd>
                      <Pill tone={details.lifecycleStatus === 'New' ? 'success' : 'neutral'}>
                        {details.condition || details.lifecycleStatus || '—'}
                      </Pill>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Purchase date</dt>
                    <dd className="text-slate-200">{formatDate(details.deliveryDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Warranty</dt>
                    <dd className="text-slate-200">{details.warranty || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Warranty status</dt>
                    <dd className="text-slate-200">{details.warrantyStatus || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Service history</dt>
                    <dd className="text-right text-slate-200">
                      {details.serviceHistory?.count || 0} record(s)
                      {details.serviceHistory?.lastServiceDate
                        ? ` · last ${formatDate(details.serviceHistory.lastServiceDate)}`
                        : ''}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Notes</dt>
                    <dd className="text-right text-slate-200">{details.notes || '—'}</dd>
                  </div>
                </dl>
                <Link
                  href={`/assets/${selectedId}`}
                  className="mt-3 inline-block text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Open full asset page →
                </Link>
                </>
              ) : (
                <p className="text-sm text-slate-500">Select a device to see its details.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
