import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DateInput, Field, NumberInput, SelectInput, TextInput } from './Fields';

const FALLBACK_CATEGORIES = ['Laptop', 'Printer', 'Server', 'Other'];

const STATUS_OPTIONS = ['Available', 'Assigned', 'Returned'];

const CONDITION_OPTIONS = ['New', 'Good', 'Fair', 'Poor'];

function toForm(asset) {
  return {
    category: asset?.category || '',
    make: asset?.make || '',
    model: asset?.model || '',
    assetName: asset?.assetName || '',
    serialNumber: asset?.serialNumber || '',
    macAddress: asset?.macAddress || '',
    vendorId: asset?.vendorId || '',
    deliveryDate: asset?.deliveryDate || '',
    receivedById: asset?.receivedById || '',
    receivedBy: asset?.receivedBy || '',
    warranty: asset?.warranty || '',
    assetStatus: asset?.assetStatus || 'Available',
    condition: asset?.condition || '',
    assetLocation: asset?.assetLocation || '',
    cost: asset?.cost ?? '',
    usage_hours: asset?.usageHours ?? '',
    temperature: asset?.temperature ?? '',
    cpu_usage: asset?.cpuUsage ?? '',
    vibration: asset?.vibration ?? '',
    load_factor: asset?.loadFactor ?? '',
    years_operation: asset?.yearsOperation ?? '',
  };
}

function toPayload(form, vendors) {
  const vendor = vendors.find((item) => item.vendorId === form.vendorId);
  return {
    category: form.category,
    make: form.make,
    model: form.model,
    assetName: form.assetName || undefined,
    serialNumber: form.serialNumber || undefined,
    macAddress: form.macAddress || undefined,
    vendorId: form.vendorId || undefined,
    vendor: vendor?.vendorName || undefined,
    deliveryDate: form.deliveryDate || undefined,
    receivedById: form.receivedById || undefined,
    warranty: form.warranty || undefined,
    assetStatus: form.assetStatus,
    condition: form.condition || undefined,
    assetLocation: form.assetLocation || undefined,
    cost: form.cost === '' ? undefined : Number(form.cost),
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
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [vendors, setVendors] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  useEffect(() => {
    let active = true;
    api
      .get('/users/receivers')
      .then((data) => active && setReceivers(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get('/categories?status=active')
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          const names = list.map((item) => item.categoryName);
          setCategories(names);
          setForm((prev) => {
            if (prev.category && !names.includes(prev.category)) return prev;
            return prev;
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
    onSubmit(toPayload(form, vendors));
  };

  return (
    <form
      id="asset-form"
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Category" hint="Determines the identifier prefix" required>
        <SelectInput value={form.category} onChange={update('category')} required>
          <option value="">Select a category…</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Make">
        <TextInput value={form.make} onChange={update('make')} placeholder="Dell" />
      </Field>
      <Field label="Model">
        <TextInput value={form.model} onChange={update('model')} placeholder="Latitude 7420" />
      </Field>
      <Field label="Asset Name" hint="Defaults to make + model">
        <TextInput value={form.assetName} onChange={update('assetName')} placeholder="Dell Latitude 7420" />
      </Field>
      <Field label="Serial Number">
        <TextInput value={form.serialNumber} onChange={update('serialNumber')} placeholder="SN-1234-5678" />
      </Field>
      <Field label="MAC Address">
        <TextInput value={form.macAddress} onChange={update('macAddress')} placeholder="AA:BB:CC:DD:EE:FF" />
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
      <Field label="Purchase Cost (₦ or USD)">
        <NumberInput value={form.cost} onChange={update('cost')} placeholder="1250000" min={0} />
      </Field>
      <Field label="Delivery Date">
        <DateInput value={form.deliveryDate} onChange={update('deliveryDate')} />
      </Field>
      <Field
        label="Received By"
        hint="Admins and ICT/IT staff who received the asset"
        required
      >
        <SelectInput
          value={form.receivedById}
          onChange={update('receivedById')}
          required
        >
          <option value="">Select a receiver…</option>
          {receivers.map((receiver) => {
            const name =
              [receiver.firstName, receiver.lastName].filter(Boolean).join(' ') ||
              receiver.username;
            return (
              <option key={receiver.id} value={receiver.id}>
                {name}
                {receiver.department ? ` — ${receiver.department}` : ''}
              </option>
            );
          })}
        </SelectInput>
      </Field>
      <Field label="Warranty">
        <TextInput value={form.warranty} onChange={update('warranty')} placeholder="3 years" />
      </Field>
      <Field label="Status">
        <SelectInput value={form.assetStatus} onChange={update('assetStatus')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>
      <Field
        label="Condition"
        hint="Lifecycle override (New/Good/Fair/Poor). Leave blank to auto-calculate."
      >
        <SelectInput value={form.condition} onChange={update('condition')}>
          <option value="">Auto (New/Used)</option>
          {CONDITION_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
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
    </form>
  );
}
