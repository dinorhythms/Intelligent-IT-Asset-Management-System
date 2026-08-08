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
import { formatCurrency, formatDate, formatNumber } from '../../lib/utils';

export default function ServicesPage() {
  const { can } = useAuth();
  const permission = can.resource('services');

  const [services, setServices] = useState([]);
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
      const data = await api.get('/services');
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    api
      .get('/assets')
      .then((data) => active && setAssets(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return services;
    return services.filter((service) =>
      [service.serviceId, service.serviceDesc, service.assetId, service.technician, service.servicePortfolio]
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
          title="No service records found"
          description={
            permission.create
              ? 'Log the first maintenance or service activity.'
              : 'There are no service records to display.'
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
                          {service.assetId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(service.serviceDate)}</td>
                    <td className="py-3 pr-4 text-slate-300">{service.technician || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400">{service.vendorId || '—'}</td>
                    <td className="py-3 pr-4 text-slate-300">{formatCurrency(service.cost)}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={service.serviceStatus === 'completed' ? 'success' : 'info'}>
                        {service.serviceStatus}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
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
          assets={assets}
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
    </div>
  );
}
