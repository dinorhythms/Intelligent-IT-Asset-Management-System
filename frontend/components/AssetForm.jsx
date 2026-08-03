import { useState } from 'react';
import { Field, NumberInput, SelectInput, TextInput } from './Fields';

const STATUS_OPTIONS = ['active', 'pending', 'in-repair', 'retired'];
const LIFECYCLE_OPTIONS = ['procurement', 'deployment', 'operation', 'maintenance', 'retirement'];

function toForm(asset) {
  return {
    assetId: asset?.assetId || '',
    assetName: asset?.assetName || '',
    assetIdentifier: asset?.assetIdentifier || '',
    assetType: asset?.assetType || '',
    assetStatus: asset?.assetStatus || 'active',
    assetLifecycle: asset?.assetLifecycle || 'operation',
    manufacturer: asset?.manufacturer || '',
    assetLocation: asset?.assetLocation || '',
    usage_hours: asset?.usageHours ?? '',
    temperature: asset?.temperature ?? '',
    cpu_usage: asset?.cpuUsage ?? '',
    vibration: asset?.vibration ?? '',
    load_factor: asset?.loadFactor ?? '',
    years_operation: asset?.yearsOperation ?? '',
  };
}

function toPayload(form) {
  return {
    assetId: form.assetId || undefined,
    assetName: form.assetName,
    assetIdentifier: form.assetIdentifier,
    assetType: form.assetType,
    assetStatus: form.assetStatus,
    assetLifecycle: form.assetLifecycle,
    manufacturer: form.manufacturer,
    assetLocation: form.assetLocation,
    usage_hours: form.usage_hours === '' ? undefined : Number(form.usage_hours),
    temperature: form.temperature === '' ? undefined : Number(form.temperature),
    cpu_usage: form.cpu_usage === '' ? undefined : Number(form.cpu_usage),
    vibration: form.vibration === '' ? undefined : Number(form.vibration),
    load_factor: form.load_factor === '' ? undefined : Number(form.load_factor),
    years_operation:
      form.years_operation === '' ? undefined : Number(form.years_operation),
  };
}

export default function AssetForm({ asset, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(() => toForm(asset));
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(toPayload(form));
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Asset ID" hint="Leave blank to auto-generate" required>
        <TextInput value={form.assetId} onChange={update('assetId')} placeholder="AST-1002" />
      </Field>
      <Field label="Asset Name" required>
        <TextInput value={form.assetName} onChange={update('assetName')} placeholder="Dell Precision 7780" required />
      </Field>
      <Field label="Asset Identifier">
        <TextInput value={form.assetIdentifier} onChange={update('assetIdentifier')} placeholder="IT-001" />
      </Field>
      <Field label="Asset Type">
        <TextInput value={form.assetType} onChange={update('assetType')} placeholder="Laptop / Server / Printer" />
      </Field>
      <Field label="Status">
        <SelectInput value={form.assetStatus} onChange={update('assetStatus')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Lifecycle Stage">
        <SelectInput value={form.assetLifecycle} onChange={update('assetLifecycle')}>
          {LIFECYCLE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Manufacturer">
        <TextInput value={form.manufacturer} onChange={update('manufacturer')} placeholder="Dell" />
      </Field>
      <Field label="Location">
        <TextInput value={form.assetLocation} onChange={update('assetLocation')} placeholder="Lagos data centre" />
      </Field>

      <div className="col-span-1 sm:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Telemetry (used by the AI for predictive maintenance)
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
          id="asset-form-submit"
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : asset ? 'Save changes' : 'Create asset'}
        </button>
      </div>
    </form>
  );
}
