"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

type OptionGroup = {
  label: string;
  options: string[];
};

type ComboboxProps = {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  groups?: OptionGroup[];
  required?: boolean;
  icon?: ReactNode;
  error?: string;
};

export default function Combobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  groups,
  required,
  icon,
  error,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const highlightSource = useRef<"keyboard" | "mouse">("keyboard");
  const mouseInList = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = (() => {
    if (!value) return options;
    const v = value.toLowerCase();
    // Bucket by match quality: exact > startsWith > word-boundary > includes
    const exact: string[] = [];
    const startsWith: string[] = [];
    const wordBoundary: string[] = [];
    const includes: string[] = [];
    const wordRe = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    for (const o of options) {
      const oLower = o.toLowerCase();
      if (oLower === v) exact.push(o);
      else if (oLower.startsWith(v)) startsWith.push(o);
      else if (wordRe.test(o)) wordBoundary.push(o);
      else if (oLower.includes(v)) includes.push(o);
    }
    return [...exact, ...startsWith, ...wordBoundary, ...includes];
  })();

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
    if (highlightIndex >= 0 && highlightSource.current === "keyboard" && !mouseInList.current && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      const item = items[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const selectOption = useCallback(
    (opt: string) => {
      onChange(opt);
      setOpen(false);
      setHighlightIndex(-1);
    },
    [onChange]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      highlightSource.current = "keyboard";
      setHighlightIndex(0);
      e.preventDefault();
      return;
    }

    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        highlightSource.current = "keyboard";
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        highlightSource.current = "keyboard";
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
    <div ref={wrapperRef} className="relative min-w-0 max-w-full">
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
          className={`w-full min-w-0 rounded-xl border ${error ? "border-red-300 bg-red-50/50" : "border-slate-200 bg-slate-50"} ${icon ? "pl-9" : "pl-4"} pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${error ? "focus:ring-red-400" : "focus:ring-blue-500"} focus:border-transparent focus:bg-white transition-all`}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>

      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 z-20 mt-1.5 w-auto max-w-full max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 py-1"
            onMouseEnter={() => { mouseInList.current = true; }}
            onMouseLeave={() => { mouseInList.current = false; }}
          >
            {/* When groups are provided and user is not filtering, show grouped layout */}
            {groups && !value ? (
              (() => {
                let flatIndex = 0;
                return groups.map((group, gi) => (
                  <li key={group.label || gi} role="presentation">
                    <ul role="group">
                      {group.options.map((opt, oi) => {
                        const idx = flatIndex++;
                        const isFirst = oi === 0 && group.label;
                        return (
                          <li
                            key={opt}
                            id={`${id}-option-${idx}`}
                            role="option"
                            aria-selected={idx === highlightIndex}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectOption(opt);
                            }}
                            onMouseEnter={() => { highlightSource.current = "mouse"; setHighlightIndex(idx); }}
                            className={`px-3 py-2 text-sm truncate cursor-pointer transition-colors ${
                              idx === highlightIndex
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-slate-700 hover:bg-slate-50"
                            } ${isFirst && gi > 0 ? "border-t border-slate-100 mt-1 pt-2.5" : ""} ${isFirst ? "font-semibold" : "pl-5"}`}
                          >
                            {opt}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ));
              })()
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={i === highlightIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(opt);
                  }}
                  onMouseEnter={() => { highlightSource.current = "mouse"; setHighlightIndex(i); }}
                  className={`px-3 py-2 text-sm truncate cursor-pointer transition-colors ${
                    i === highlightIndex
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
