import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Field, NumberInput, SelectInput, TextInput } from './Fields';

const PRIORITY_OPTIONS = ['normal', 'urgent', 'high', 'low'];

function toForm(request) {
  return {
    category: request?.category || '',
    qty: request?.qty ?? 1,
    requestPriority: request?.requestPriority || 'normal',
    reason: request?.reason || '',
    requestedBy: request?.requestedBy || '',
  };
}

function toPayload(form) {
  return {
    category: form.category,
    qty: Number(form.qty) || 1,
    requestPriority: form.requestPriority,
    reason: form.reason || undefined,
    requestedBy: form.requestedBy || undefined,
  };
}

export default function RequestForm({ request, onSubmit, onCancel, submitting }) {
  const { user } = useAuth();
  const isAdminTech = ['admin', 'technician'].includes(user?.role);
  const [form, setForm] = useState(() => toForm(request));
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

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
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdminTech) return;
    let active = true;
    api
      .get('/users/staff')
      .then((data) => active && setStaff(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdminTech]);

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
          hint={
            isAdminTech
              ? 'What type of device is needed?'
              : 'What type of device do you need?'
          }
          required
        >
          <SelectInput value={form.category} onChange={update('category')} required>
            <option value="">Select a category…</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      {isAdminTech && (
        <div className="col-span-1 sm:col-span-2">
          <Field
            label="Requested for (Staff)"
            hint="Submit this request on behalf of a staff member. Leave blank to keep yourself as the requester."
          >
            <SelectInput value={form.requestedBy} onChange={update('requestedBy')}>
              <option value="">Myself</option>
              {staff.map((member) => {
                const name =
                  [member.firstName, member.lastName].filter(Boolean).join(' ') ||
                  member.username;
                return (
                  <option key={member.id} value={member.username}>
                    {name}
                    {member.department ? ` — ${member.department}` : ''}
                  </option>
                );
              })}
            </SelectInput>
          </Field>
        </div>
      )}
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
    </form>
  );
}
