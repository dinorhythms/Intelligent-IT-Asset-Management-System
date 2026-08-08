import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { AccessDenied, Alert } from '../components/Ui';
import { Field, SelectInput, TextInput } from '../components/Fields';

const ROLES = [
  { value: 'admin', label: 'Admin (full access)' },
  { value: 'technician', label: 'Technician (manage assets, requests, assignments)' },
  { value: 'staff', label: 'Staff (request and receive assets)' },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  otherNames: '',
  department: '',
  location: '',
  phoneNumber: '',
  email: '',
  password: '',
  role: 'staff',
};

export default function RegisterPage() {
  const { register, can } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
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
        `Account created for "${form.firstName || form.email}" with the ${form.role} role. They can now sign in.`,
      );
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || 'User creation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!can.users) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <AccessDenied description="Only administrators can create user accounts." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">Create a user</h1>
          <p className="mt-1 text-sm text-slate-500">
            Admins create accounts and assign roles (Admin, Technician, Staff).
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <Alert>{error}</Alert>
          <Alert tone="success">{success}</Alert>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <TextInput value={form.firstName} onChange={update('firstName')} placeholder="Jane" required />
            </Field>
            <Field label="Last name" required>
              <TextInput value={form.lastName} onChange={update('lastName')} placeholder="Doe" required />
            </Field>
            <Field label="Other names">
              <TextInput value={form.otherNames} onChange={update('otherNames')} placeholder="Oluwaseun" />
            </Field>
            <Field label="Department" required>
              <TextInput value={form.department} onChange={update('department')} placeholder="Finance" required />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={update('location')} placeholder="Lagos" />
            </Field>
            <Field label="Phone number">
              <TextInput value={form.phoneNumber} onChange={update('phoneNumber')} placeholder="+2348012345678" />
            </Field>
          </div>

          <Field label="Email" required>
            <TextInput type="email" value={form.email} onChange={update('email')} placeholder="jane@example.com" required />
          </Field>
          <Field label="Password" required hint="Used to sign in. Stored hashed.">
            <TextInput type="password" value={form.password} onChange={update('password')} placeholder="••••••••" required minLength={6} />
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

          <div className="flex items-center justify-between pt-1">
            <Link href="/users" className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
              ← Back to users
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Creating account…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
