import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import ServiceForm from '../../components/ServiceForm';
import { Field } from '../../components/Fields';
import { formatCurrency, formatDate, formatNumber } from '../../lib/utils';

export default function ServicesPage() {
  const { user, can } = useAuth();
  const permission = can.resource('services');
  const isAdminTech = ['admin', 'technician'].includes(user?.role);

  const [services, setServices] = useState([]);
  const [assets, setAssets] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [statusAction, setStatusAction] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('');

  const isServiceEligible = useCallback((asset) => {
    const status = String(asset?.assetStatus || '')
      .toLowerCase()
      .replace(/[\s_]+/g, '');
    return status === 'available' || status === 'returned';
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get(isAdminTech ? '/services' : '/services/mine');
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdminTech]);

  useEffect(() => {
    load();
  }, [load]);

  const loadOverdue = useCallback(async () => {
    if (!isAdminTech) return;
    try {
      const data = await api.get('/services/overdue');
      setOverdue(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, [isAdminTech]);

  useEffect(() => {
    loadOverdue();
  }, [loadOverdue]);

  const loadAssets = useCallback(async () => {
    if (!permission.create) return;
    try {
      const data = await api.get('/assets');
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, [permission.create]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const selectableAssets = useMemo(() => {
    const eligible = assets.filter(isServiceEligible);
    if (editing?.assetId && !eligible.some((asset) => asset.assetId === editing.assetId)) {
      const current = assets.find((asset) => asset.assetId === editing.assetId);
      if (current) return [...eligible, current];
    }
    return eligible;
  }, [assets, editing, isServiceEligible]);

  const filtered = useMemo(() => {
    if (!filter) return services;
    return services.filter((service) =>
      [
        service.serviceId,
        service.serviceDesc,
        service.assetId,
        service.assetName,
        service.vendorId,
        service.vendorName,
        service.technician,
        service.servicePortfolio,
        service.expectedReturnDate,
      ]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [services, filter]);

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
        await api.put(`/services/${editing.serviceId}`, payload);
        setNotice(`Service ${editing.serviceId} updated. Next maintenance date recalculated.`);
      } else {
        await api.post('/services', payload);
        setNotice('Service logged. Next maintenance date is being computed.');
      }
      setModalOpen(false);
      await load();
      await loadAssets();
      await loadOverdue();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusConfirm = (service, status) => {
    setStatusAction(status);
    setStatusNote(service.notes || '');
    setStatusConfirm(service);
  };

  const closeStatusConfirm = () => {
    setStatusConfirm(null);
    setStatusAction('');
    setStatusNote('');
  };

  const confirmStatusChange = async () => {
    if (!statusConfirm) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        serviceStatus: statusAction,
        ...(statusNote.trim() ? { notes: statusNote.trim() } : {}),
      };
      await api.put(`/services/${statusConfirm.serviceId}`, payload);
      setNotice(
        `Service ${statusConfirm.serviceId} marked ${statusAction}. Associated asset is now available again.`,
      );
      closeStatusConfirm();
      await load();
      await loadAssets();
      await loadOverdue();
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
      await api.delete(`/services/${deleting.serviceId}`);
      setNotice(`Service ${deleting.serviceId} deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading service records…" />;

  return (
    <div>
      <PageHeader
        title="Service Records"
        description="Log maintenance activity and let the AI compute the next maintenance schedule."
        actions={
          permission.create && (
            <PrimaryButton onClick={openCreate}>
              <span className="text-lg leading-none">+</span> Log service
            </PrimaryButton>
          )
        }
      />

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      {overdue.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-semibold">
            {overdue.length} vendor service {overdue.length === 1 ? 'record is' : 'records are'} past the expected
            return date
          </p>
          <ul className="mt-2 space-y-1.5">
            {overdue.map((service) => (
              <li key={service.serviceId} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{service.assetName || service.assetId}</span>
                <span className="text-amber-300/70">·</span>
                <span className="text-amber-300/70">
                  Sent to {service.vendorName || service.vendorId} on{' '}
                  {formatDate(service.serviceDate)}
                </span>
                <span className="text-amber-300/70">·</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-200">
                  Expected return {formatDate(service.expectedReturnDate)} — overdue
                </span>
                {permission.update && (
                  <button
                    onClick={() => {
                      setEditing(service);
                      setModalOpen(true);
                    }}
                    className="rounded border border-amber-500/40 px-2 py-0.5 text-xs font-medium text-amber-200 hover:bg-amber-500/10"
                  >
                    Update
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search service records…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={isAdminTech ? 'No service records found' : 'No service record available'}
          description={
            permission.create
              ? 'Log the first maintenance or service activity.'
              : 'No maintenance or service activity has been recorded for your assigned devices yet.'
          }
          action={
            permission.create && <PrimaryButton onClick={openCreate}>Log service</PrimaryButton>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">Service</th>
                  <th className="py-3 pr-4 font-medium">Asset</th>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Technician</th>
                  <th className="py-3 pr-4 font-medium">Vendor</th>
                  <th className="py-3 pr-4 font-medium">Return due</th>
                  <th className="py-3 pr-4 font-medium">Cost</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4">
                      <p className="font-medium text-slate-200">{service.serviceDesc}</p>
                      <p className="text-xs text-slate-500">
                        {service.serviceId} · {service.servicePortfolio || '—'}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      {service.assetId ? (
                        <Link href={`/assets/${service.assetId}`} className="text-emerald-300 hover:text-emerald-200">
                          {service.assetName || service.assetId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(service.serviceDate)}</td>
                    <td className="py-3 pr-4 text-slate-300">{service.technician || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400">{service.vendorName || service.vendorId || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400">
                      {service.expectedReturnDate ? (
                        <span
                          className={
                            service.overdue || (service.expectedReturnDate < new Date().toISOString().slice(0, 10) && service.serviceStatus !== 'completed')
                              ? 'font-medium text-amber-300'
                              : ''
                          }
                        >
                          {formatDate(service.expectedReturnDate)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{formatCurrency(service.cost)}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={service.serviceStatus === 'completed' ? 'success' : 'info'}>
                        {service.serviceStatus}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        {permission.update &&
                          !['completed', 'cancelled'].includes(service.serviceStatus) && (
                            <>
                              <button
                                onClick={() => openStatusConfirm(service, 'completed')}
                                disabled={submitting}
                                className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => openStatusConfirm(service, 'cancelled')}
                                disabled={submitting}
                                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        {permission.update && (
                          <button
                            onClick={() => {
                              setEditing(service);
                              setModalOpen(true);
                            }}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                          >
                            Edit
                          </button>
                        )}
                        {permission.delete && (
                          <button
                            onClick={() => setDeleting(service)}
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
        title={editing ? `Edit service — ${editing.serviceId}` : 'Log a service'}
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('service-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </PrimaryButton>
          </>
        }
      >
        <ServiceForm
          service={editing}
          assets={selectableAssets}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete service record"
        footer={
          <>
            <GhostButton onClick={() => setDeleting(null)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete record'}
            </DangerButton>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete service{' '}
          <span className="font-medium text-slate-100">{deleting?.serviceId}</span> ({deleting?.serviceDesc})? This
          cannot be undone.
        </p>
      </Modal>

      <Modal
        open={Boolean(statusConfirm)}
        onClose={closeStatusConfirm}
        title={
          statusAction === 'cancelled'
            ? `Cancel service — ${statusConfirm?.serviceId}`
            : `Complete service — ${statusConfirm?.serviceId}`
        }
        footer={
          <>
            <GhostButton onClick={closeStatusConfirm}>Go back</GhostButton>
            <PrimaryButton onClick={confirmStatusChange} disabled={submitting}>
              {submitting
                ? 'Updating…'
                : statusAction === 'cancelled'
                  ? 'Confirm cancellation'
                  : 'Confirm completion'}
            </PrimaryButton>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-300">
          {statusAction === 'cancelled' ? (
            <>
              Are you sure you want to cancel service{' '}
              <span className="font-medium text-slate-100">{statusConfirm?.serviceId}</span> (
              {statusConfirm?.serviceDesc})? The associated asset will be set back to{' '}
              <span className="font-medium text-emerald-300">Available</span>.
            </>
          ) : (
            <>
              Confirm that service{' '}
              <span className="font-medium text-slate-100">{statusConfirm?.serviceId}</span> (
              {statusConfirm?.serviceDesc}) is complete. The associated asset will be set back to{' '}
              <span className="font-medium text-emerald-300">Available</span>.
            </>
          )}
        </p>
        <Field label={statusAction === 'cancelled' ? 'Reason for cancellation' : 'What was done during the service'}>
          <textarea
            value={statusNote}
            onChange={(event) => setStatusNote(event.target.value)}
            rows={3}
            placeholder={
              statusAction === 'cancelled'
                ? 'Provide a reason for cancelling this service…'
                : 'Describe the work performed, parts replaced, etc.'
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </Field>
      </Modal>
    </div>
  );
}
