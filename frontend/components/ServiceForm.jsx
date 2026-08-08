import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Field, DateInput, NumberInput, SelectInput, TextArea, TextInput } from './Fields';
import DeviceAutocomplete from './DeviceAutocomplete';

const PORTFOLIO_OPTIONS = ['Infrastructure', 'End-user computing', 'Network', 'Security', 'Data centre'];
const STATUS_OPTIONS = ['active', 'completed', 'scheduled', 'cancelled'];

function toForm(service) {
  return {
    serviceDesc: service?.serviceDesc || '',
    assetId: service?.assetId || '',
    vendorId: service?.vendorId || '',
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

function toPayload(form, service) {
  return {
    serviceDesc: form.serviceDesc,
    assetId: form.assetId,
    vendorId: form.vendorId || undefined,
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

export default function ServiceForm({ service, assets = [], onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(() => toForm(service));
  const [vendors, setVendors] = useState([]);
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setAssetId = (assetId) => setForm((prev) => ({ ...prev, assetId }));

  useEffect(() => {
    let active = true;
    api
      .get('/vendors?status=active')
      .then((data) => active && setVendors(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(toPayload(form, service));
  };

  return (
    <form
      id="service-form"
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Service ID" hint={service ? 'Auto-generated and immutable.' : 'Leave blank to auto-generate'}>
        <TextInput
          value={service?.serviceId || ''}
          placeholder="SRV-2002"
          readOnly={Boolean(service)}
          disabled={Boolean(service)}
          className="w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none opacity-70 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </Field>
      <Field label="Asset" hint="Select the device this service was performed on" required>
        <DeviceAutocomplete assets={assets} value={form.assetId} onChange={setAssetId} />
      </Field>
      <Field label="Service Description" required>
        <TextInput value={form.serviceDesc} onChange={update('serviceDesc')} placeholder="Preventive maintenance" required />
      </Field>
      <Field label="Technician" hint="Username of the technician performing the service" required>
        <TextInput value={form.technician} onChange={update('technician')} placeholder="ada.okafor" required />
      </Field>
      <Field label="Vendor">
        <SelectInput value={form.vendorId} onChange={update('vendorId')}>
          <option value="">No vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.vendorId} value={vendor.vendorId}>
              {vendor.vendorName}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Service Date">
        <DateInput value={form.serviceDate} onChange={update('serviceDate')} />
      </Field>
      <Field label="Cost">
        <NumberInput value={form.cost} onChange={update('cost')} placeholder="125000" min={0} />
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
        <NumberInput value={form.maintenance_interval_days} onChange={update('maintenance_interval_days')} placeholder="90" min={1} />
      </Field>
      <Field label="Usage hours" hint="Used to compute the next maintenance date">
        <NumberInput value={form.usage_hours} onChange={update('usage_hours')} placeholder="540" min={0} />
      </Field>
    </form>
  );
}
