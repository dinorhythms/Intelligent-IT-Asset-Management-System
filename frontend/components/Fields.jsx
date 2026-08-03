export function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputClasses =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';

export function TextInput(props) {
  return <input {...props} className={inputClasses} />;
}

export function NumberInput(props) {
  return (
    <input
      {...props}
      type="number"
      step="any"
      className={inputClasses}
    />
  );
}

export function DateInput(props) {
  return <input {...props} type="date" className={inputClasses} />;
}

export function SelectInput({ children, ...props }) {
  return (
    <select {...props} className={inputClasses}>
      {children}
    </select>
  );
}

export function TextArea(props) {
  return <textarea {...props} rows={3} className={inputClasses} />;
}
