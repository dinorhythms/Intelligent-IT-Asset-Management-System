import { useState } from 'react';
import { Field, DateInput, NumberInput, SelectInput, TextArea, TextInput } from './Fields';

const PORTFOLIO_OPTIONS = ['Infrastructure', 'End-user computing', 'Network', 'Security', 'Data centre'];
const STATUS_OPTIONS = ['active', 'completed', 'scheduled', 'cancelled'];

function toForm(service) {
  return {
    serviceId: service?.serviceId || '',
    serviceDesc: service?.serviceDesc || '',
    assetId: service?.assetId || '',
    serviceDate: service?.serviceDate || '',
    technician: service?.technician || '',
    cost: service?.cost ?? '',
    notes: service?.notes || '',
    servicePortfolio: service?.servicePortfolio || 'Infrastructure',
    serviceStatus: service?.serviceStatus || 'active',
    usage_hours: service?.usageHours ?? '',
    maintenance_interval_days: service?.maintenanceIntervalDays ?? '',
  };
}

function toPayload(form) {
  return {
    serviceId: form.serviceId || undefined,
    serviceDesc: form.serviceDesc,
    assetId: form.assetId,
    serviceDate: form.serviceDate || undefined,
    technician: form.technician,
    cost: form.cost === '' ? undefined : Number(form.cost),
    notes: form.notes,
    servicePortfolio: form.servicePortfolio,
    serviceStatus: form.serviceStatus,
    usage_hours: form.usage_hours === '' ? undefined : Number(form.usage_hours),
    maintenance_interval_days:
      form.maintenance_interval_days === ''
        ? undefined
        : Number(form.maintenance_interval_days),
  };
}

export default function ServiceForm({ service, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(() => toForm(service));
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(toPayload(form));
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Service ID" hint="Leave blank to auto-generate">
        <TextInput value={form.serviceId} onChange={update('serviceId')} placeholder="SRV-2002" />
      </Field>
      <Field label="Asset ID" hint="e.g. AST-1002" required>
        <TextInput value={form.assetId} onChange={update('assetId')} placeholder="AST-1002" required />
      </Field>
      <Field label="Service Description" required>
        <TextInput value={form.serviceDesc} onChange={update('serviceDesc')} placeholder="Preventive maintenance" required />
      </Field>
      <Field label="Technician">
        <TextInput value={form.technician} onChange={update('technician')} placeholder="Ada Okafor" />
      </Field>
      <Field label="Service Date">
        <DateInput value={form.serviceDate} onChange={update('serviceDate')} />
      </Field>
      <Field label="Cost">
        <NumberInput value={form.cost} onChange={update('cost')} placeholder="125000" />
      </Field>
      <Field label="Portfolio">
        <SelectInput value={form.servicePortfolio} onChange={update('servicePortfolio')}>
          {PORTFOLIO_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Service Status">
        <SelectInput value={form.serviceStatus} onChange={update('serviceStatus')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Notes">
        <TextArea value={form.notes} onChange={update('notes')} placeholder="Replaced fan and cleaned vents." />
      </Field>
      <Field label="Maintenance interval (days)">
        <NumberInput value={form.maintenance_interval_days} onChange={update('maintenance_interval_days')} placeholder="90" />
      </Field>
      <Field label="Usage hours" hint="Used to compute the next maintenance date">
        <NumberInput value={form.usage_hours} onChange={update('usage_hours')} placeholder="540" />
      </Field>

      <div className="col-span-1 flex justify-end gap-3 sm:col-span-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          id="service-form-submit"
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : service ? 'Save changes' : 'Log service'}
        </button>
      </div>
    </form>
  );
}
