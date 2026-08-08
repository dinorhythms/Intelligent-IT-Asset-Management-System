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

  const handleApprove = async (request) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.put(`/requests/${request.requestNo}/approve`, {});
      setNotice(
        `Request ${request.requestNo} approved. The requester has been notified — assign an available asset from the Assignments page.`,
      );
      await load();
    } catch (err) {
      setError(err.message);
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
            ? 'Review asset requests, approve or reject them, then assign available assets from the Assignments page.'
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
                              onClick={() => handleApprove(request)}
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
    </div>
  );
}
