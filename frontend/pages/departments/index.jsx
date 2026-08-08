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
import { Field, SelectInput, TextArea, TextInput } from '../../components/Fields';
import { formatDate } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function DepartmentsPage() {
  const { can } = useAuth();
  const [departments, setDepartments] = useState([]);
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
      const data = await api.get('/departments');
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!can.departments) return;
    load();
  }, [can.departments, load]);

  const filtered = useMemo(() => {
    if (!filter) return departments;
    return departments.filter((department) =>
      [department.departmentName, department.description, department.status]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [departments, filter]);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.post('/departments', payload);
      setNotice(`Department "${payload.departmentName}" created.`);
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
      await api.put(`/departments/${editing.departmentId}`, payload);
      setNotice(`Department ${editing.departmentName} updated.`);
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
      await api.delete(`/departments/${deleting.departmentId}`);
      setNotice(`Department ${deleting.departmentName} deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!can.departments) {
    return <AccessDenied description="Only administrators can manage departments." />;
  }

  if (loading) return <Spinner label="Loading departments…" />;

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organisational departments used on user accounts, requests and assignments. Only admins can manage departments."
        actions={
          <PrimaryButton onClick={() => setCreating(true)}>+ Add department</PrimaryButton>
        }
      />

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <div className="mb-4">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search by name or description…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No departments found"
          description="Add departments so user accounts and requests can be grouped correctly."
          action={<PrimaryButton onClick={() => setCreating(true)}>Add department</PrimaryButton>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">Department</th>
                  <th className="py-3 pr-4 font-medium">Description</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((department) => (
                  <tr key={department.departmentId} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4">
                      <p className="font-medium text-slate-200">{department.departmentName}</p>
                      <p className="text-xs text-slate-500">{department.departmentId}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{department.description || '—'}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={department.status === 'active' ? 'success' : 'neutral'}>
                        {department.status}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(department.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing(department)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(department)}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
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
        title="Add department"
        footer={
          <>
            <GhostButton onClick={() => setCreating(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('department-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Create department'}
            </PrimaryButton>
          </>
        }
      >
        <DepartmentForm
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit department — ${editing.departmentName}` : 'Edit department'}
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('department-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </PrimaryButton>
          </>
        }
      >
        {editing && (
          <DepartmentForm
            department={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitting={submitting}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete department"
        footer={
          <>
            <GhostButton onClick={() => setDeleting(null)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete department'}
            </DangerButton>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete{' '}
          <span className="font-medium text-slate-100">{deleting?.departmentName}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function DepartmentForm({ department, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    departmentName: department?.departmentName || '',
    description: department?.description || '',
    status: department?.status || 'active',
  });
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form id="department-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Status">
        <SelectInput value={form.status} onChange={update('status')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Department name" required>
        <TextInput value={form.departmentName} onChange={update('departmentName')} placeholder="Finance" required />
      </Field>
      <div className="col-span-1 sm:col-span-2">
        <Field label="Description">
          <TextArea value={form.description} onChange={update('description')} rows={2} placeholder="What does this department do?" />
        </Field>
      </div>
    </form>
  );
}
