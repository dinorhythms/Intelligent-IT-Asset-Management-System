import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AccessDenied, Alert, PageHeader, PrimaryButton, Spinner } from '../../components/Ui';
import { Field, TextInput } from '../../components/Fields';

const DEFAULT_BASE_URL = 'http://localhost:3000';

export default function SettingsPage() {
  const { can } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrBaseUrl, setQrBaseUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/settings/baseurl').catch(() => api.get('/settings'));
      setQrBaseUrl(data?.qrBaseUrl || DEFAULT_BASE_URL);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!can.settings) return;
    load();
  }, [can.settings, load]);

  if (!can.settings) {
    return <AccessDenied description="Only administrators can change system settings." />;
  }

  if (loading) return <Spinner label="Loading settings…" />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.put('/settings', { qrBaseUrl: qrBaseUrl.trim() });
      setNotice(
        typeof result?.qrCodesRegenerated === 'number' && result.qrCodesRegenerated > 0
          ? `QR base URL updated and ${result.qrCodesRegenerated} QR codes regenerated.`
          : 'Settings saved.',
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading settings…" />;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="System-wide configuration. Only admins can change these."
      />

      <Alert>{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-1 text-sm font-medium text-slate-200">QR code base URL</div>
        <p className="mb-4 text-xs text-slate-500">
          QR codes embed <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">{"{baseUrl}/view/{uniqueId}"}</code>.
          When the base URL changes, every asset's QR code is regenerated automatically.
          Set this to the public address where the frontend is hosted.
        </p>
        <Field label="Base URL" required>
          <TextInput
            type="url"
            value={qrBaseUrl}
            onChange={(event) => setQrBaseUrl(event.target.value)}
            placeholder={DEFAULT_BASE_URL}
            required
          />
        </Field>
        <div className="mt-5">
          <PrimaryButton type="submit" disabled={saving || !qrBaseUrl.trim()}>
            {saving ? 'Saving…' : 'Save settings'}
          </PrimaryButton>
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-1 text-sm font-medium text-slate-200">About QR codes</div>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-400">
          <li>Scanning a QR code opens the public asset view at <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">/view/&lt;uniqueId&gt;</code>.</li>
          <li>The public view requires no login and shows the device and its assigned user.</li>
          <li>Generating a QR code for an individual asset is available to admins and technicians from the asset detail page.</li>
        </ul>
      </div>
    </div>
  );
}
