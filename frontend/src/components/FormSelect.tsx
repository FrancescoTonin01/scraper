import type { ReactNode } from "react";

type FormSelectOption = {
  value: string | number;
  label: string | number;
};

type FormSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  icon: ReactNode;
  includeInsetFocusRing?: boolean;
};

export default function FormSelect({
  id,
  label,
  value,
  onChange,
  options,
  icon,
  includeInsetFocusRing = false,
}: FormSelectProps) {
  const focusRingClass = includeInsetFocusRing ? "focus:ring-inset" : "";

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {icon}
        </div>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 ${focusRingClass} focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
