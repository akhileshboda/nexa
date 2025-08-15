import React from 'react';

export const btnBase = "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98]";
export const cardBase = "rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm";
export const chipBase = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium";

export const cx = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" ");

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TextInput({ label, value, onChange, placeholder, autoFocus }: TextInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700 mb-1">{label}</label>
      <input
        autoFocus={autoFocus}
        className="w-full rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface ChipsInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChipsInput({ label, value, onChange, placeholder, autoFocus }: ChipsInputProps) {
  const [input, setInput] = React.useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };

  const remove = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700 mb-1">{label}</label>
      <div className="rounded-2xl border border-neutral-200 p-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-800"
            >
              {v}
              <button className="text-indigo-600 hover:text-indigo-800" onClick={() => remove(v)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          autoFocus={autoFocus}
          className="w-full border-0 bg-transparent text-sm outline-none"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-700">{label}</span>
      <button
        className={cx(
          "relative inline-flex h-6 w-11 items-center rounded-full transition",
          value ? "bg-indigo-600" : "bg-neutral-300"
        )}
        onClick={() => onChange(!value)}
      >
        <span
          className={cx(
            "inline-block h-4 w-4 transform rounded-full bg-white transition",
            value ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}