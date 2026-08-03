import { useState } from 'react';
import { Field, NumberInput, SelectInput, TextInput } from './Fields';

const PRIORITY_OPTIONS = ['normal', 'urgent', 'low', 'high'];
const APPROVAL_OPTIONS = ['pending', 'approved', 'rejected'];
const STATUS_OPTIONS = ['open', 'in-progress', 'closed'];

function toForm(request) {
  return {
    requestNo: request?.requestNo || '',
    assetName: request?.assetName || '',
    assetType: request?.assetType || '',
    assetIdentifier: request?.assetIdentifier || '',
    qty: request?.qty ?? 1,
    requestPriority: request?.requestPriority || 'normal',
    approvalStatus: request?.approvalStatus || 'pending',
    requestStatus: request?.requestStatus || 'open',
    usage_hours: '',
    temperature: '',
    cpu_usage: '',
    vibration: '',
    load_factor: '',
    years_operation: '',
  };
}

function toPayload(form) {
  return {
    requestNo: form.requestNo || undefined,
    assetName: form.assetName,
    assetType: form.assetType,
    assetIdentifier: form.assetIdentifier,
    qty: Number(form.qty) || 1,
    requestPriority: form.requestPriority,
    approvalStatus: form.approvalStatus,
    requestStatus: form.requestStatus,
    usage_hours: form.usage_hours === '' ? undefined : Number(form.usage_hours),
    temperature: form.temperature === '' ? undefined : Number(form.temperature),
    cpu_usage: form.cpu_usage === '' ? undefined : Number(form.cpu_usage),
    vibration: form.vibration === '' ? undefined : Number(form.vibration),
    load_factor: form.load_factor === '' ? undefined : Number(form.load_factor),
    years_operation:
      form.years_operation === '' ? undefined : Number(form.years_operation),
  };
}

export default function RequestForm({ request, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(() => toForm(request));
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(toPayload(form));
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Request No." hint="Leave blank to auto-generate">
        <TextInput value={form.requestNo} onChange={update('requestNo')} placeholder="REQ-1002" />
      </Field>
      <Field label="Asset Name" required>
        <TextInput value={form.assetName} onChange={update('assetName')} placeholder="Printer" required />
      </Field>
      <Field label="Asset Type" required>
        <TextInput value={form.assetType} onChange={update('assetType')} placeholder="Hardware / Software" required />
      </Field>
      <Field label="Asset Identifier" required>
        <TextInput value={form.assetIdentifier} onChange={update('assetIdentifier')} placeholder="AST-1002" required />
      </Field>
      <Field label="Quantity">
        <NumberInput value={form.qty} onChange={update('qty')} min={1} />
      </Field>
      <Field label="Priority">
        <SelectInput value={form.requestPriority} onChange={update('requestPriority')}>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Approval Status">
        <SelectInput value={form.approvalStatus} onChange={update('approvalStatus')}>
          {APPROVAL_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Request Status">
        <SelectInput value={form.requestStatus} onChange={update('requestStatus')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>

      <div className="col-span-1 sm:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Telemetry (optional — used for AI anomaly detection)
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Usage hours">
            <NumberInput value={form.usage_hours} onChange={update('usage_hours')} placeholder="540" />
          </Field>
          <Field label="Temperature (°C)">
            <NumberInput value={form.temperature} onChange={update('temperature')} placeholder="88" />
          </Field>
          <Field label="CPU usage (%)">
            <NumberInput value={form.cpu_usage} onChange={update('cpu_usage')} placeholder="94" />
          </Field>
          <Field label="Vibration">
            <NumberInput value={form.vibration} onChange={update('vibration')} placeholder="4.6" />
          </Field>
          <Field label="Load factor">
            <NumberInput value={form.load_factor} onChange={update('load_factor')} placeholder="0.9" step="0.01" />
          </Field>
          <Field label="Years in operation">
            <NumberInput value={form.years_operation} onChange={update('years_operation')} placeholder="4" />
          </Field>
        </div>
      </div>

      <div className="col-span-1 flex justify-end gap-3 sm:col-span-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          id="request-form-submit"
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : request ? 'Save changes' : 'Create request'}
        </button>
      </div>
    </form>
  );
}
