import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  AccessDenied,
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
import { Field, SelectInput, TextInput } from '../../components/Fields';
import { formatDate } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function VendorsPage() {
  const { can } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/vendors');
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!can.vendors) return;
    load();
  }, [can.vendors, load]);

  const filtered = useMemo(() => {
    if (!filter) return vendors;
    return vendors.filter((vendor) =>
      [
        vendor.vendorId,
        vendor.vendorName,
        vendor.contactPerson,
        vendor.email,
        vendor.phoneNumber,
        vendor.address,
      ]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [vendors, filter]);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.post('/vendors', payload);
      setNotice(`Vendor "${payload.vendorName}" created.`);
      setCreating(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (payload) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.put(`/vendors/${editing.vendorId}`, payload);
      setNotice(`Vendor ${editing.vendorId} updated.`);
      setEditing(null);
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
      await api.delete(`/vendors/${deleting.vendorId}`);
      setNotice(`Vendor ${deleting.vendorName} deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!can.vendors) {
    return <AccessDenied description="Only administrators and technicians can manage vendors." />;
  }

  if (loading) return <Spinner label="Loading vendors…" />;

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Hardware and service vendors used on asset and service records. Admins and technicians can manage vendors."
        actions={
          can.vendors?.create ? (
            <PrimaryButton onClick={() => setCreating(true)}>+ Add vendor</PrimaryButton>
          ) : undefined
        }
      />

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <div className="mb-4">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search by ID, name, contact or email…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No vendors found"
          description="Add vendors to track suppliers and service providers."
          action={
            can.vendors?.create ? (
              <PrimaryButton onClick={() => setCreating(true)}>Add vendor</PrimaryButton>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">Vendor ID</th>
                  <th className="py-3 pr-4 font-medium">Vendor</th>
                  <th className="py-3 pr-4 font-medium">Contact</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Address</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((vendor) => (
                  <tr key={vendor.vendorId} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4">
                      <Pill tone="info">{vendor.vendorId}</Pill>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-200">{vendor.vendorName}</p>
                      {vendor.contactPerson && (
                        <p className="text-xs text-slate-500">{vendor.contactPerson}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{vendor.phoneNumber || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400">{vendor.email || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400">{vendor.address || '—'}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={vendor.status === 'active' ? 'success' : 'neutral'}>
                        {vendor.status}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(vendor.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing(vendor)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        {can.vendors?.delete && (
                          <button
                            onClick={() => setDeleting(vendor)}
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
        open={creating}
        onClose={() => setCreating(false)}
        title="Add vendor"
        footer={
          <>
            <GhostButton onClick={() => setCreating(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('vendor-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Create vendor'}
            </PrimaryButton>
          </>
        }
      >
        <VendorForm
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit vendor — ${editing.vendorId}` : 'Edit vendor'}
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('vendor-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </PrimaryButton>
          </>
        }
      >
        {editing && (
          <VendorForm
            vendor={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitting={submitting}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete vendor"
        footer={
          <>
            <GhostButton onClick={() => setDeleting(null)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete vendor'}
            </DangerButton>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete{' '}
          <span className="font-medium text-slate-100">{deleting?.vendorName}</span> (
          {deleting?.vendorId})? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function VendorForm({ vendor, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    vendorName: vendor?.vendorName || '',
    contactPerson: vendor?.contactPerson || '',
    phoneNumber: vendor?.phoneNumber || '',
    email: vendor?.email || '',
    address: vendor?.address || '',
    status: vendor?.status || 'active',
  });
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form id="vendor-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Status">
        <SelectInput value={form.status} onChange={update('status')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Vendor name" required>
        <TextInput value={form.vendorName} onChange={update('vendorName')} placeholder="Dell EMEA" required />
      </Field>
      <Field label="Contact person">
        <TextInput value={form.contactPerson} onChange={update('contactPerson')} placeholder="Ada Nwosu" />
      </Field>
      <Field label="Phone number">
        <TextInput value={form.phoneNumber} onChange={update('phoneNumber')} placeholder="+234 812 345 6789" />
      </Field>
      <Field label="Email">
        <TextInput type="email" value={form.email} onChange={update('email')} placeholder="sales@vendor.com" />
      </Field>
      <div className="col-span-1 sm:col-span-2">
        <Field label="Address">
          <TextInput value={form.address} onChange={update('address')} placeholder="Victoria Island, Lagos" />
        </Field>
      </div>
    </form>
  );
}
