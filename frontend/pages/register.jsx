import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Ui';
import { Field, SelectInput, TextInput } from '../components/Fields';

const ROLES = [
  { value: 'technician', label: 'Technician (create maintenance requests)' },
  { value: 'manager', label: 'Manager (full CRUD, no deletes)' },
  { value: 'admin', label: 'Administrator (full access)' },
  { value: 'viewer', label: 'Viewer (read-only)' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'technician',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await register(form);
      setSuccess(
        `Account created for "${form.username}" with the ${form.role} role. You can now sign in.`,
      );
      setForm({ username: '', email: '', password: '', role: 'technician' });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">Create an account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a role that matches your access level.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <Alert>{error}</Alert>
          <Alert tone="success">{success}</Alert>
          <Field label="Username" required>
            <TextInput
              value={form.username}
              onChange={update('username')}
              placeholder="jane.doe"
              required
            />
          </Field>
          <Field label="Email" required>
            <TextInput
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="jane@example.com"
              required
            />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </Field>
          <Field label="Role" required>
            <SelectInput value={form.role} onChange={update('role')}>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Register'}
          </button>
          <p className="text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
