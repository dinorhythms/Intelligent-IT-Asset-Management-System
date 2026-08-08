import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';import {
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
import { formatDate, initials } from '../../lib/utils';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'technician', label: 'Technician' },
  { value: 'staff', label: 'Staff' },
];

const ROLE_TONE = {
  admin: 'danger',
  technician: 'info',
  staff: 'neutral',
};

export default function UsersPage() {
  const { can } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!can.users) return;
    load();
  }, [can.users, load]);

  const filtered = useMemo(() => {
    if (!filter) return users;
    return users.filter((user) =>
      [
        user.firstName,
        user.lastName,
        user.otherNames,
        user.username,
        user.email,
        user.department,
        user.location,
        user.phoneNumber,
        user.role,
      ]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [users, filter]);

  const handleUpdate = async (payload) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.put(`/users/${editing.id}`, payload);
      setNotice(`User ${editing.username} updated.`);
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
      await api.delete(`/users/${deleting.id}`);
      setNotice(`User ${deleting.username} deleted.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err.message);
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!can.users) {
    return <AccessDenied description="Only administrators can manage user accounts." />;
  }

  if (loading) return <Spinner label="Loading users…" />;

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Create accounts and manage roles. Only admins can manage users."
        actions={
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            <span className="text-lg leading-none">+</span> Add user
          </Link>
        }
      />

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <div className="mb-4">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search by name, username, email, department or role…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Create accounts for admins, technicians and staff to access the system."
          action={
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">
              Add user
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">User</th>
                  <th className="py-3 pr-4 font-medium">Contact</th>
                  <th className="py-3 pr-4 font-medium">Department</th>
                  <th className="py-3 pr-4 font-medium">Location</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Joined</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold uppercase text-slate-100">
                          {initials(user.username)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">
                            {[user.firstName, user.lastName, user.otherNames].filter(Boolean).join(' ') || user.username}
                          </p>
                          <p className="text-xs text-slate-500">{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-slate-300">{user.email || '—'}</p>
                      <p className="text-xs text-slate-500">{user.phoneNumber || '—'}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{user.department || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400">{user.location || '—'}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={ROLE_TONE[user.role] || 'neutral'}>{user.role}</Pill>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(user.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing(user)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(user)}
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
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit user — ${editing.username}` : 'Edit user'}
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('user-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save'}
            </PrimaryButton>
          </>
        }
      >
        {editing && (
          <UserForm
            user={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitting={submitting}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete user"
        footer={
          <>
            <GhostButton onClick={() => setDeleting(null)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete user'}
            </DangerButton>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete{' '}
          <span className="font-medium text-slate-100">
            {[deleting?.firstName, deleting?.lastName].filter(Boolean).join(' ') || deleting?.username}
          </span>{' '}
          ({deleting?.username})? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function UserForm({ user, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    otherNames: user.otherNames || '',
    department: user.department || '',
    location: user.location || '',
    phoneNumber: user.phoneNumber || '',
    email: user.email || '',
    role: user.role || 'staff',
    password: '',
  });
  const [departments, setDepartments] = useState([]);
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  useEffect(() => {
    let active = true;
    api
      .get('/departments?status=active')
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        const names = list.map((item) => item.departmentName);
        setDepartments(names);
        if (names.length > 0 && !names.includes(form.department)) {
          setForm((prev) => ({ ...prev, department: '' }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    onSubmit(payload);
  };

  return (
    <form id="user-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="First name" required>
        <TextInput value={form.firstName} onChange={update('firstName')} required />
      </Field>
      <Field label="Last name" required>
        <TextInput value={form.lastName} onChange={update('lastName')} required />
      </Field>
      <Field label="Other names">
        <TextInput value={form.otherNames} onChange={update('otherNames')} />
      </Field>
      <Field label="Department">
        <SelectInput value={form.department} onChange={update('department')}>
          <option value="">Select a department…</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Location">
        <TextInput value={form.location} onChange={update('location')} />
      </Field>
      <Field label="Phone number">
        <TextInput value={form.phoneNumber} onChange={update('phoneNumber')} />
      </Field>
      <div className="col-span-1 sm:col-span-2">
        <Field label="Email">
          <TextInput type="email" value={form.email} onChange={update('email')} />
        </Field>
      </div>
      <div className="col-span-1 sm:col-span-2">
        <Field label="New password" hint="Leave blank to keep the current password">
          <TextInput type="password" value={form.password} onChange={update('password')} placeholder="••••••••" minLength={6} />
        </Field>
      </div>
      <div className="col-span-1 sm:col-span-2">
        <Field label="Role">
          <SelectInput value={form.role} onChange={update('role')}>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
    </form>
  );
}
