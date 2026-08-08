import { useState } from 'react';
import { Field, NumberInput, SelectInput, TextInput } from './Fields';

const PRIORITY_OPTIONS = ['normal', 'urgent', 'high', 'low'];

function toForm(request) {
  return {
    category: request?.category || '',
    qty: request?.qty ?? 1,
    requestPriority: request?.requestPriority || 'normal',
    reason: request?.reason || '',
  };
}

function toPayload(form) {
  return {
    category: form.category,
    qty: Number(form.qty) || 1,
    requestPriority: form.requestPriority,
    reason: form.reason || undefined,
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
    <form
      id="request-form"
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div className="col-span-1 sm:col-span-2">
        <Field
          label="Device category"
          hint="What type of device do you need? (Laptop, Printer, Server, etc.)"
          required
        >
          <TextInput
            value={form.category}
            onChange={update('category')}
            placeholder="Laptop / Printer / Server"
            required
          />
        </Field>
      </div>
      <Field label="Quantity" required>
        <NumberInput value={form.qty} onChange={update('qty')} min={1} />
      </Field>
      <Field label="Priority">
        <SelectInput value={form.requestPriority} onChange={update('requestPriority')}>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </Field>
      <div className="col-span-1 sm:col-span-2">
        <Field label="Reason">
          <textarea
            value={form.reason}
            onChange={update('reason')}
            rows={2}
            placeholder="Why do you need this device?"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </Field>
      </div>
      <div className="col-span-1 sm:col-span-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : request ? 'Save Changes' : 'Submit request'}
        </button>
      </div>
    </form>
  );
}
