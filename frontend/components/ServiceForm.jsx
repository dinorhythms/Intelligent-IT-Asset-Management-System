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
  const [technicians, setTechnicians] = useState([]);
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

  useEffect(() => {
    let active = true;
    api
      .get('/users/technicians')
      .then((data) => active && setTechnicians(Array.isArray(data) ? data : []))
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
      <Field label="Asset" hint="Select the device this service was performed on" required>
        <DeviceAutocomplete assets={assets} value={form.assetId} onChange={setAssetId} />
      </Field>
      <Field label="Service Description" required>
        <TextInput value={form.serviceDesc} onChange={update('serviceDesc')} placeholder="Preventive maintenance" required />
      </Field>
      <Field
        label="Technician"
        hint="Technicians and ICT/IT staff who performed the service"
        required
      >
        <SelectInput value={form.technician} onChange={update('technician')} required>
          <option value="">Select a technician…</option>
          {technicians.map((technician) => {
            const name =
              [technician.firstName, technician.lastName].filter(Boolean).join(' ') ||
              technician.username;
            return (
              <option key={technician.id} value={technician.username}>
                {name}
                {technician.department ? ` — ${technician.department}` : ''}
              </option>
            );
          })}
        </SelectInput>
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
