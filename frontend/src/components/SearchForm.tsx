"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Combobox from "./Combobox";
import { getMakeNames, getModelsForMake } from "@/data/carMakesModels";

const RADIUS_OPTIONS = [25, 50, 100, 200, 500];

export default function SearchForm({
  initialValues,
}: {
  initialValues?: {
    make?: string;
    model?: string;
    location?: string;
    radius?: string;
  };
}) {
  const router = useRouter();
  const [make, setMake] = useState(initialValues?.make ?? "");
  const [model, setModel] = useState(initialValues?.model ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [radius, setRadius] = useState(initialValues?.radius ?? "100");

  const makeOptions = useMemo(() => getMakeNames(), []);
  const modelOptions = useMemo(() => getModelsForMake(make), [make]);

  function handleMakeChange(value: string) {
    setMake(value);
    const exactMatch = makeOptions.find(
      (m) => m.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch && exactMatch !== make) {
      setModel("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!make.trim() || !model.trim()) return;

    const params = new URLSearchParams({
      make: make.trim(),
      model: model.trim(),
    });
    if (location.trim()) params.set("location", location.trim());
    params.set("radius", radius);

    router.push(`/results?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-5 sm:p-7 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Combobox
            id="make"
            label="Marca"
            placeholder="es. BMW"
            value={make}
            onChange={handleMakeChange}
            options={makeOptions}
            required
            icon={
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h.01M12 17h.01M16 17h.01M3 9l2.5-4h13L21 9M3 9v8a2 2 0 002 2h14a2 2 0 002-2V9M3 9h18" />
              </svg>
            }
          />

          <Combobox
            id="model"
            label="Modello"
            placeholder="es. Serie 3"
            value={model}
            onChange={setModel}
            options={modelOptions}
            required
            icon={
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="location"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
            >
              Località
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                id="location"
                type="text"
                placeholder="Tutta Italia"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Lascia vuoto per cercare in tutta Italia
            </p>
          </div>

          <div>
            <label
              htmlFor="radius"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
            >
              Raggio
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <select
                id="radius"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r} km
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
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] shadow-md shadow-blue-500/25"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Cerca annunci
          </span>
        </button>
      </div>
    </form>
  );
}
