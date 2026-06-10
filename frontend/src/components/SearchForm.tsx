"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Combobox from "./Combobox";
import { getMakeNames, getModelsForMake, getGroupedModelsForMake } from "@/data/carMakesModels";
import { getLocationOptions, extractLocationName, isRegion, resolveLocationInput } from "@/data/italianLocations";

const RADIUS_OPTIONS = [25, 50, 100, 200, 500];

const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= 2000; y--) years.push(y);
  return years;
})();

const KM_OPTIONS = [
  { value: "", label: "Qualsiasi" },
  { value: "10000", label: "10.000 km" },
  { value: "25000", label: "25.000 km" },
  { value: "50000", label: "50.000 km" },
  { value: "75000", label: "75.000 km" },
  { value: "100000", label: "100.000 km" },
  { value: "150000", label: "150.000 km" },
  { value: "200000", label: "200.000 km" },
];

const FUEL_OPTIONS = [
  { value: "", label: "Qualsiasi" },
  { value: "benzina", label: "Benzina" },
  { value: "diesel", label: "Diesel" },
  { value: "elettrica", label: "Elettrica" },
  { value: "gpl", label: "GPL" },
  { value: "metano", label: "Metano" },
  { value: "ibrida", label: "Ibrida" },
];

export default function SearchForm({
  initialValues,
}: {
  initialValues?: {
    make?: string;
    model?: string;
    location?: string;
    radius?: string;
    yearFrom?: string;
    yearTo?: string;
    kmMax?: string;
    fuel?: string;
  };
}) {
  const router = useRouter();
  const [make, setMake] = useState(initialValues?.make ?? "");
  const [model, setModel] = useState(initialValues?.model ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [radius, setRadius] = useState(initialValues?.radius ?? "100");
  const [yearFrom, setYearFrom] = useState(initialValues?.yearFrom ?? "");
  const [yearTo, setYearTo] = useState(initialValues?.yearTo ?? "");
  const [kmMax, setKmMax] = useState(initialValues?.kmMax ?? "");
  const [fuel, setFuel] = useState(initialValues?.fuel ?? "");
  const [showAdvanced, setShowAdvanced] = useState(
    !!(initialValues?.yearFrom || initialValues?.yearTo || initialValues?.kmMax || initialValues?.fuel)
  );

  const makeOptions = useMemo(() => getMakeNames(), []);
  const modelOptions = useMemo(() => getModelsForMake(make), [make]);
  const modelGroups = useMemo(() => getGroupedModelsForMake(make), [make]);
  const locationOptions = useMemo(() => getLocationOptions(), []);

  const activeFilterCount = [yearFrom, yearTo, kmMax, fuel].filter(Boolean).length;

  // Validation: check inputs against known data
  const makeError = useMemo(() => {
    if (!make.trim()) return undefined;
    const valid = makeOptions.some((m) => m.toLowerCase() === make.trim().toLowerCase());
    return valid ? undefined : `Marca "${make}" non trovata`;
  }, [make, makeOptions]);

  const modelError = useMemo(() => {
    if (!model.trim() || makeError) return undefined;
    const valid = modelOptions.some((m) => m.toLowerCase() === model.trim().toLowerCase());
    return valid ? undefined : `Modello "${model}" non disponibile per ${make}`;
  }, [model, make, modelOptions, makeError]);

  const locationError = useMemo(() => {
    if (!location.trim()) return undefined;
    // Accept exact option match or a plain city/region name that resolves
    const resolved = resolveLocationInput(location.trim());
    return resolved ? undefined : `Località "${location}" non trovata`;
  }, [location]);

  const hasValidationErrors = !!(makeError || modelError || locationError);

  // Determine if the location is a region (hide radius for regions)
  const isLocationRegion = useMemo(() => {
    if (!location.trim()) return false;
    const resolved = resolveLocationInput(location.trim());
    if (!resolved) return false;
    return isRegion(extractLocationName(resolved));
  }, [location]);

  function handleMakeChange(value: string) {
    setMake(value);
    // Always clear model when make value changes
    if (value.toLowerCase() !== make.toLowerCase()) {
      setModel("");
    }
  }

  function handleLocationChange(value: string) {
    setLocation(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!make.trim() || !model.trim() || hasValidationErrors) return;

    const params = new URLSearchParams({
      make: make.trim(),
      model: model.trim(),
    });

    // Smart-resolve the location input
    const resolved = location.trim() ? resolveLocationInput(location.trim()) : null;
    const locationName = resolved ? extractLocationName(resolved) : "";
    if (locationName) {
      params.set("location", locationName);
      if (isRegion(locationName)) {
        params.set("locationType", "region");
      } else {
        params.set("locationType", "city");
        params.set("radius", radius);
      }
    } else {
      params.set("radius", radius);
    }
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    if (kmMax) params.set("kmMax", kmMax);
    if (fuel) params.set("fuel", fuel);

    router.push(`/results?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto min-w-0">
      <div className="w-full min-w-0 max-w-full overflow-visible bg-white rounded-xl sm:rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 p-4 sm:p-7 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <Combobox
            id="make"
            label="Marca"
            placeholder="es. BMW"
            value={make}
            onChange={handleMakeChange}
            options={makeOptions}
            required
            error={makeError}
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
            groups={modelGroups.length > 1 ? modelGroups : undefined}
            required
            error={modelError}
            icon={
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <Combobox
            id="location"
            label="Località"
            placeholder="Tutta Italia"
            value={location}
            onChange={handleLocationChange}
            options={locationOptions}
            error={locationError}
            icon={
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          {!isLocationRegion && (
          <div className="min-w-0">
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
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
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
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer group"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span>Filtri avanzati</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
          <motion.svg
            animate={{ rotate: showAdvanced ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>

        {/* Advanced filters section */}
        <AnimatePresence initial={false}>
          {showAdvanced && (
            <motion.div
              key="advanced-filters"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="w-full min-w-0 max-w-full overflow-hidden"
            >
              <div className="border-t border-slate-100 pt-4 pb-1 space-y-3">
                {/* Year range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="min-w-0">
                    <label
                      htmlFor="yearFrom"
                      className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
                    >
                      Anno da
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <select
                        id="yearFrom"
                        value={yearFrom}
                        onChange={(e) => setYearFrom(e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      >
                        <option value="">Qualsiasi</option>
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label
                      htmlFor="yearTo"
                      className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
                    >
                      Anno a
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <select
                        id="yearTo"
                        value={yearTo}
                        onChange={(e) => setYearTo(e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      >
                        <option value="">Qualsiasi</option>
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y} value={y}>{y}</option>
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

                {/* Km max + Fuel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="min-w-0">
                    <label
                      htmlFor="kmMax"
                      className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
                    >
                      Km max
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <select
                        id="kmMax"
                        value={kmMax}
                        onChange={(e) => setKmMax(e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      >
                        {KM_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label
                      htmlFor="fuel"
                      className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
                    >
                      Alimentazione
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                        </svg>
                      </div>
                      <select
                        id="fuel"
                        value={fuel}
                        onChange={(e) => setFuel(e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      >
                        {FUEL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={hasValidationErrors}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30"
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
