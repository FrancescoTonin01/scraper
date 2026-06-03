"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";

type ComboboxProps = {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  icon?: ReactNode;
};

export default function Combobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  required,
  icon,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const selectOption = useCallback(
    (opt: string) => {
      onChange(opt);
      setOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.blur();
    },
    [onChange]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      setHighlightIndex(0);
      e.preventDefault();
      return;
    }

    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectOption(filtered[highlightIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightIndex(-1);
        break;
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            highlightIndex >= 0 ? `${id}-option-${highlightIndex}` : undefined
          }
          placeholder={placeholder}
          value={value}
          required={required}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => {
            if (filtered.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50 ${icon ? "pl-9" : "pl-4"} pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all`}
        />
      </div>

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1.5 w-full max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 py-1"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={i === highlightIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === highlightIndex
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
