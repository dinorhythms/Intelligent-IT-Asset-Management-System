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

export default function RequestsPage() {
  const { can } = useAuth();
  const permission = can.resource('requests');

  const [requests, setRequests] = useState([]);
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
      const data = await api.get('/requests');
      setRequests(Array.isArray(data) ? data : []);
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
    if (!filter) return requests;
    return requests.filter((request) =>
      [request.requestNo, request.assetName, request.assetType, request.assetIdentifier, request.requestPriority]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [requests, filter]);

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
        setNotice('Request created. AI anomaly detection is running.');
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
        description="Maintenance and repair requests with automatic AI anomaly detection."
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
              ? 'Create a maintenance or repair request to start tracking it.'
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
                  <th className="py-3 pr-4 font-medium">Asset</th>
                  <th className="py-3 pr-4 font-medium">Priority</th>
                  <th className="py-3 pr-4 font-medium">Approval</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4 font-medium text-slate-200">{request.requestNo}</td>
                    <td className="py-3 pr-4">
                      <p className="text-slate-200">{request.assetName}</p>
                      <p className="text-xs text-slate-500">
                        {request.assetType} · {request.assetIdentifier}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <Pill tone={PRIORITY_TONE[request.requestPriority] || 'neutral'}>
                        {request.requestPriority}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4">
                      <Pill tone={request.approvalStatus === 'approved' ? 'success' : request.approvalStatus === 'rejected' ? 'danger' : 'warning'}>
                        {request.approvalStatus}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{request.requestStatus}</td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(request.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
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
              onClick={() => document.querySelector('#request-form-submit')?.click()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save'}
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
          {deleting?.assetName}? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
