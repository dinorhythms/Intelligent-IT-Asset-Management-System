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

export default function CategoriesPage() {
  const { can } = useAuth();
  const [categories, setCategories] = useState([]);
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
      const data = await api.get('/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!can.categories) return;
    load();
  }, [can.categories, load]);

  const filtered = useMemo(() => {
    if (!filter) return categories;
    return categories.filter((category) =>
      [category.categoryId, category.categoryName, category.description]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [categories, filter]);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.post('/categories', payload);
      setNotice(`Category "${payload.categoryName}" created.`);
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
      await api.put(`/categories/${editing.categoryId}`, payload);
      setNotice(`Category ${editing.categoryId} updated.`);
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
      await api.delete(`/categories/${deleting.categoryId}`);
      setNotice(`Category ${deleting.categoryName} deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!can.categories) {
    return <AccessDenied description="Only administrators can manage categories." />;
  }

  if (loading) return <Spinner label="Loading categories…" />;

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Asset categories used to auto-generate Asset IDs (e.g. LAPTOP-001). Only admins can manage categories."
        actions={
          <PrimaryButton onClick={() => setCreating(true)}>+ Add category</PrimaryButton>
        }
      />

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <div className="mb-4">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search by ID, name or description…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Add categories so new assets can be grouped and tagged automatically."
          action={<PrimaryButton onClick={() => setCreating(true)}>Add category</PrimaryButton>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">Category ID</th>
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Description</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((category) => (
                  <tr key={category.categoryId} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4">
                      <Pill tone="info">{category.categoryId}</Pill>
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-200">{category.categoryName}</td>
                    <td className="py-3 pr-4 text-slate-400">{category.description || '—'}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={category.status === 'active' ? 'success' : 'neutral'}>
                        {category.status}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(category.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing(category)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(category)}
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
        title="Add category"
        footer={
          <>
            <GhostButton onClick={() => setCreating(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('category-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Create category'}
            </PrimaryButton>
          </>
        }
      >
        <CategoryForm
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          submitting={submitting}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit category — ${editing.categoryId}` : 'Edit category'}
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('category-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </PrimaryButton>
          </>
        }
      >
        {editing && (
          <CategoryForm
            category={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitting={submitting}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete category"
        footer={
          <>
            <GhostButton onClick={() => setDeleting(null)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete category'}
            </DangerButton>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete{' '}
          <span className="font-medium text-slate-100">{deleting?.categoryName}</span> (
          {deleting?.categoryId})? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function CategoryForm({ category, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    categoryName: category?.categoryName || '',
    description: category?.description || '',
    status: category?.status || 'active',
  });
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form id="category-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Category ID" hint={category ? 'Auto-generated and immutable.' : 'Leave blank to auto-generate'}>
        <TextInput
          value={category?.categoryId || ''}
          placeholder="CAT-005"
          readOnly={Boolean(category)}
          disabled={Boolean(category)}
          className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none opacity-70 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </Field>
      <Field label="Status">
        <SelectInput value={form.status} onChange={update('status')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Category name" required>
        <TextInput value={form.categoryName} onChange={update('categoryName')} placeholder="Desktop" required />
      </Field>
      <div className="col-span-1 sm:col-span-2">
        <Field label="Description">
          <TextArea value={form.description} onChange={update('description')} rows={2} placeholder="Used for daily office work." />
        </Field>
      </div>
    </form>
  );
}
