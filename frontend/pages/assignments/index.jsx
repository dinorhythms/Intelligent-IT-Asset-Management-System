import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Alert,
  EmptyState,
  GhostButton,
  PageHeader,
  PrimaryButton,
  Spinner,
} from '../../components/Ui';
import Pill from '../../components/Pill';
import Modal from '../../components/Modal';
import { Field, SelectInput, TextArea, TextInput } from '../../components/Fields';
import DeviceAutocomplete from '../../components/DeviceAutocomplete';
import { formatDate } from '../../lib/utils';

function statusTone(status) {
  if (status === 'assigned') return 'success';
  if (status === 'returned') return 'neutral';
  return 'info';
}

export default function AssignmentsPage() {
  const { user, can } = useAuth();
  const permission = can.resource('assignments');
  const isAdminTech = ['admin', 'technician'].includes(user?.role);

  const [assignments, setAssignments] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get(isAdminTech ? '/assignments' : '/assignments/mine');
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdminTech]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdminTech) return;
    let active = true;
    Promise.all([
      api.get('/assets?status=Available'),
      api.get('/users').catch(() => []),
    ])
      .then(([assets, userList]) => {
        if (!active) return;
        setAvailableAssets(Array.isArray(assets) ? assets : []);
        setUsers(Array.isArray(userList) ? userList : []);
      })
      .catch(() => {
        /* role-gated data is optional for the form */
      });
    return () => {
      active = false;
    };
  }, [isAdminTech]);

  const filtered = useMemo(() => {
    if (!filter) return assignments;
    return assignments.filter((assignment) =>
      [
        assignment.assetId,
        assignment.assetName,
        assignment.userName,
        assignment.userDisplayName,
        assignment.department,
        assignment.assignedBy,
        assignment.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
  }, [assignments, filter]);

  const openAssign = () => setModalOpen(true);

  const handleAssign = async (payload) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.post('/assignments', payload);
      setNotice(`Asset ${payload.assetId} assigned.`);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (assignment) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.put(`/assignments/${assignment.id}/return`);
      setNotice(`${assignment.assetId} marked as returned and is now Available.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (assignment) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.delete(`/assignments/${assignment.id}`);
      setNotice(`${assignment.assetId} assignment removed; asset returned to Available.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading assignments…" />;

  return (
    <div>
      <PageHeader
        title="Asset Assignments"
        description="Assign available devices to users and process returns. Returning sets the device back to Available."
        actions={
          isAdminTech && (
            <PrimaryButton onClick={openAssign}>
              <span className="text-lg leading-none">+</span> Assign device
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
          placeholder="Search by asset, user, department or status…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description={
            isAdminTech
              ? 'Assign an available device to a user to start tracking it.'
              : 'Devices assigned to you will appear here.'
          }
          action={
            isAdminTech && <PrimaryButton onClick={openAssign}>Assign device</PrimaryButton>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">Device</th>
                  <th className="py-3 pr-4 font-medium">Assigned To</th>
                  <th className="py-3 pr-4 font-medium">Department</th>
                  <th className="py-3 pr-4 font-medium">Assigned By</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Assigned</th>
                  <th className="py-3 pr-4 font-medium">Returned</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4">
                      <Link
                        href={`/assets/${assignment.assetId}`}
                        className="font-medium text-slate-200 hover:text-emerald-300"
                      >
                        {assignment.assetName || assignment.assetId}
                      </Link>
                      <p className="text-xs text-slate-500">{assignment.assetId}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {assignment.userDisplayName || assignment.userName}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{assignment.department || '—'}</td>
                    <td className="py-3 pr-4 text-slate-400">{assignment.assignedBy || '—'}</td>
                    <td className="py-3 pr-4">
                      <Pill tone={statusTone(assignment.status)}>{assignment.status}</Pill>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(assignment.assignedAt || assignment.createdAt)}</td>
                    <td className="py-3 pr-4 text-slate-400">{formatDate(assignment.returnedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        {permission.return && assignment.status === 'assigned' && (
                          <button
                            onClick={() => handleReturn(assignment)}
                            disabled={submitting}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                          >
                            Mark returned
                          </button>
                        )}
                        {permission.delete && (
                          <button
                            onClick={() => handleDelete(assignment)}
                            disabled={submitting}
                            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
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
        title="Assign a device"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => document.getElementById('assignment-form')?.requestSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Assigning…' : 'Assign'}
            </PrimaryButton>
          </>
        }
      >
        <AssignmentForm
          availableAssets={availableAssets}
          users={users}
          isAdmin={user?.role === 'admin'}
          onSubmit={handleAssign}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
        />
      </Modal>
    </div>
  );
}

function AssignmentForm({ availableAssets, users, isAdmin, onSubmit, onCancel, submitting }) {
  const [assetId, setAssetId] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [notes, setNotes] = useState('');
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('');

  const usersByDepartment = useMemo(() => {
    if (!department) return users;
    return users.filter((user) => user.department === department);
  }, [users, department]);

  useEffect(() => {
    let active = true;
    api
      .get('/departments?status=active')
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setDepartments(list.map((item) => item.departmentName));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const canSubmit = assetId && (isAdmin ? userId : username.trim());

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      assetId,
      ...(isAdmin ? { userId } : { username: username.trim() }),
      notes: notes || undefined,
    });
  };

  return (
    <form id="assignment-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
      <Field label="Device" hint="Only unassigned (Available) devices are shown" required>
        <DeviceAutocomplete assets={availableAssets} value={assetId} onChange={setAssetId} />
      </Field>

      {isAdmin ? (
        <>
          <Field label="Department (filter)" hint="Narrow the user list by department">
            <SelectInput value={department} onChange={(event) => {
              setDepartment(event.target.value);
              setUserId('');
            }}>
              <option value="">All departments</option>
              {departments.map((departmentName) => (
                <option key={departmentName} value={departmentName}>
                  {departmentName}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Assign to (user)" required>
            <SelectInput value={userId} onChange={(event) => setUserId(event.target.value)} required>
              <option value="">Select a user…</option>
              {usersByDepartment.map((user) => (
                <option key={user.id} value={user.id}>
                  {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username} — {user.username} ({user.department || '—'})
                </option>
              ))}
            </SelectInput>
          </Field>
        </>
      ) : (
        <Field
          label="Assign to (username)"
          hint="Enter the staff member's username"
          required
        >
          <TextInput
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="jane.doe"
            required
          />
        </Field>
      )}

      <Field label="Notes">
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes…" />
      </Field>
    </form>
  );
}
