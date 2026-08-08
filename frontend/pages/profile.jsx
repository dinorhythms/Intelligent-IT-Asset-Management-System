import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Alert, PageHeader, PrimaryButton, Spinner } from '../components/Ui';
import { Field, TextInput } from '../components/Fields';

const ROLE_LABELS = {
  admin: 'Admin',
  technician: 'Technician',
  staff: 'Staff',
};

function readOnlyClass() {
  return 'w-full rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-slate-400 outline-none';
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get(`/users/${user.id}/profile`);
      setProfile(data || user);
    } catch {
      setProfile(user);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/users/${user.id}/password`, {
        currentPassword,
        newPassword,
      });
      setNotice('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading profile…" />;

  const display = profile || user || {};

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="My Profile"
        description="View your account details and manage your password."
      />

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Account details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              readOnly
              value={[display.firstName, display.lastName]
                .filter(Boolean)
                .join(' ') || '—'}
              className={readOnlyClass()}
            />
          </Field>
          <Field label="Role">
            <input
              readOnly
              value={ROLE_LABELS[display.role] || display.role || '—'}
              className={readOnlyClass()}
            />
          </Field>
          <Field label="Username">
            <input readOnly value={display.username || '—'} className={readOnlyClass()} />
          </Field>
          <Field label="Email">
            <input readOnly value={display.email || '—'} className={readOnlyClass()} />
          </Field>
          <Field label="Department">
            <input readOnly value={display.department || '—'} className={readOnlyClass()} />
          </Field>
          <Field label="Location">
            <input readOnly value={display.location || '—'} className={readOnlyClass()} />
          </Field>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-1 text-lg font-semibold">Change password</h2>
        <p className="mb-4 text-sm text-slate-400">
          Your password must be at least 6 characters long.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Current password" required>
            <TextInput
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your current password"
            />
          </Field>
          <Field label="New password" required>
            <TextInput
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Enter a new password"
            />
          </Field>
          <Field label="Confirm new password" required>
            <TextInput
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
            />
          </Field>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </PrimaryButton>
        </form>
      </section>
    </div>
  );
}
