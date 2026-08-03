import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Ui';
import { Field, TextInput } from '../components/Fields';
import { ApiError } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const next = router.query.next || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to log in. Please check your credentials.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-slate-950">
            IT
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Intelligent IT Asset Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            QR tracking · Agentic AI · Predictive maintenance
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <Alert>{error}</Alert>
          <Field label="Username" required>
            <TextInput
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-slate-500">
            No account?{' '}
            <Link href="/register" className="font-medium text-emerald-400 hover:text-emerald-300">
              Register
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Seeded account — username: <span className="font-mono">admin</span>, password:{' '}
          <span className="font-mono">admin123</span>
        </p>
      </div>
    </div>
  );
}
