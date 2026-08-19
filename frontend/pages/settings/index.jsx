import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AccessDenied, Alert, GhostButton, PageHeader, PrimaryButton, Spinner } from '../../components/Ui';
import { Field, NumberInput, SelectInput, TextInput } from '../../components/Fields';

const DEFAULT_BASE_URL = 'http://localhost:3000';

const CURRENCY_OPTIONS = [
  { code: 'NGN', label: '₦ — Nigerian Naira' },
  { code: 'USD', label: '$ — US Dollar' },
  { code: 'GBP', label: '£ — British Pound' },
  { code: 'EUR', label: '€ — Euro' },
  { code: 'GHS', label: '₵ — Ghanaian Cedi' },
  { code: 'KES', label: 'KSh — Kenyan Shilling' },
  { code: 'ZAR', label: 'R — South African Rand' },
];

const EMPTY_SMTP = {
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: '',
};

export default function SettingsPage() {
  const { can } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [qrBaseUrl, setQrBaseUrl] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [smtp, setSmtp] = useState(EMPTY_SMTP);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [baseUrlData, smtpData, settingsData] = await Promise.all([
        api.get('/settings/baseurl').catch(() => api.get('/settings')),
        api.get('/settings/smtp').catch(() => null),
        api.get('/settings').catch(() => null),
      ]);
      setQrBaseUrl(baseUrlData?.qrBaseUrl || DEFAULT_BASE_URL);
      if (settingsData?.currency) setCurrency(settingsData.currency.toUpperCase());
      if (smtpData) {
        setSmtp((prev) => ({
          ...prev,
          smtpHost: smtpData.smtpHost || '',
          smtpPort: smtpData.smtpPort || 587,
          smtpUser: smtpData.smtpUser || '',
          fromEmail: smtpData.fromEmail || '',
        }));
        setSmtpConfigured(Boolean(smtpData.smtpConfigured));
      }
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

  const updateSmtp = (key) => (event) =>
    setSmtp((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.put('/settings', {
        qrBaseUrl: qrBaseUrl.trim(),
        currency,
      });
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

  const handleSaveSmtp = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        smtpHost: smtp.smtpHost.trim(),
        smtpPort: Number(smtp.smtpPort) || 587,
        smtpUser: smtp.smtpUser.trim(),
        fromEmail: smtp.fromEmail.trim(),
      };
      if (smtp.smtpPassword.trim()) payload.smtpPassword = smtp.smtpPassword;
      await api.put('/settings/smtp', payload);
      setSmtp((prev) => ({ ...prev, smtpPassword: '' }));
      setSmtpConfigured(Boolean(payload.smtpHost && payload.fromEmail));
      setNotice('SMTP settings saved. The password is stored encrypted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setError('');
    setNotice('');
    try {
      const result = await api.post('/settings/smtp/test', {
        recipient: testRecipient.trim() || undefined,
      });
      if (result?.success) {
        setNotice(result.message || 'Test email sent successfully.');
      } else {
        setError(result?.message || 'Could not send the test email.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTestingSmtp(false);
    }
  };

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
        <div className="mt-4">
          <Field
            label="Currency"
            hint="Used to format costs and valuations across the dashboard. Defaults to Nigerian Naira (₦)."
          >
            <SelectInput
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="mt-5">
          <PrimaryButton type="submit" disabled={saving || !qrBaseUrl.trim()}>
            {saving ? 'Saving…' : 'Save settings'}
          </PrimaryButton>
        </div>
      </form>

      <form onSubmit={handleSaveSmtp} className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-1 text-sm font-medium text-slate-200">Email / SMTP</div>
        <p className="mb-4 text-xs text-slate-500">
          Used to notify admins, technicians and users about assignments, requests and service activity.
          {smtpConfigured
            ? ' SMTP is currently configured.'
            : ' SMTP is not configured yet — notifications will be skipped until a host and from-address are provided.'}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="SMTP host" hint="e.g. smtp.gmail.com">
            <TextInput value={smtp.smtpHost} onChange={updateSmtp('smtpHost')} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Port">
            <NumberInput value={smtp.smtpPort} onChange={updateSmtp('smtpPort')} placeholder="587" min={1} max={65535} />
          </Field>
          <Field label="Username">
            <TextInput value={smtp.smtpUser} onChange={updateSmtp('smtpUser')} placeholder="ops@example.com" />
          </Field>
          <Field label="Password" hint="Stored encrypted. Leave blank to keep the current one.">
            <TextInput
              type="password"
              value={smtp.smtpPassword}
              onChange={updateSmtp('smtpPassword')}
              placeholder="••••••••"
            />
          </Field>
          <div className="col-span-1 sm:col-span-2">
            <Field label="From address" required>
              <TextInput
                type="email"
                value={smtp.fromEmail}
                onChange={updateSmtp('fromEmail')}
                placeholder="it-assets@example.com"
                required
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save SMTP settings'}
          </PrimaryButton>
          <GhostButton type="button" onClick={handleTestSmtp} disabled={testingSmtp || !smtpConfigured}>
            {testingSmtp ? 'Sending…' : 'Test SMTP'}
          </GhostButton>
          <div className="flex-1" />
          <div className="w-full max-w-xs">
            <TextInput
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
              placeholder="Optional test recipient email"
            />
          </div>
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
