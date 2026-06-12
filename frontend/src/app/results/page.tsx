"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";

const LOADING_MESSAGES = [
  "Stiamo cercando le migliori auto per te…",
  "Analisi degli annunci su AutoScout24…",
  "Scansione di Subito.it in corso…",
  "Confronto prezzi e offerte…",
  "Quasi fatto, un attimo di pazienza…",
  "Raccolta delle foto e dei dettagli…",
  "Ordinamento dei risultati migliori…",
];
import SearchForm from "@/components/SearchForm";
import CarCard from "@/components/CarCard";
import CarCardSkeleton from "@/components/CarCardSkeleton";
import Pagination from "@/components/Pagination";
import AlertBanner from "@/components/AlertBanner";
import { appendCurrentUtmParams, getMarketingEventProps } from "@/utils/marketing";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SORT_OPTIONS = [
  { value: "price_asc", label: "Prezzo crescente" },
  { value: "price_desc", label: "Prezzo decrescente" },
  { value: "year_desc", label: "Anno: più recenti" },
  { value: "year_asc", label: "Anno: meno recenti" },
  { value: "km_asc", label: "Km: meno km" },
  { value: "km_desc", label: "Km: più km" },
] as const;

type CarListing = {
  source: "autoscout" | "subito";
  title: string;
  price: number | null;
  mileage?: number | null;
  year?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  originalUrl: string;
  dealScore?: number | null;
  priceRating?: "great" | "good" | "fair" | "high" | "unknown";
  estimatedMarketPrice?: number | null;
  priceDeltaPercent?: number | null;
  scoreConfidence?: "high" | "medium" | "low";
  scoreReasons?: string[];
};

type SearchResponse = {
  results: CarListing[];
  total?: number | null;
  page: number;
  totalPages?: number | null;
  warnings?: string[];
  partial?: boolean;
  hasNextPage?: boolean;
  refreshAfterMs?: number;
  snapshotId?: string;
  snapshotVersion?: number;
  latestSnapshotId?: string;
  latestSnapshotVersion?: number;
  hasUpdate?: boolean;
};

type SearchRequestParams = {
  make: string;
  model: string;
  location: string;
  locationType: string;
  radius: string;
  page: number;
  sort: string;
  yearFrom: string;
  yearTo: string;
  kmMax: string;
  priceFrom: string;
  priceTo: string;
  fuel: string;
  snapshotId: string;
};

function ResultsView({
  make,
  model,
  location,
  locationType,
  radius,
  page,
  sort,
  yearFrom,
  yearTo,
  kmMax,
  priceFrom,
  priceTo,
  fuel,
  snapshotId,
}: SearchRequestParams) {
  const router = useRouter();
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(make && model));
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  // Rotate loading messages every 3s
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!make || !model) return;

    const params = new URLSearchParams({
      make,
      model,
      radius,
      page: String(page),
      sort,
    });
    if (location) params.set("location", location);
    if (locationType) params.set("locationType", locationType);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    if (kmMax) params.set("kmMax", kmMax);
    if (priceFrom) params.set("priceFrom", priceFrom);
    if (priceTo) params.set("priceTo", priceTo);
    if (fuel) params.set("fuel", fuel);
    if (snapshotId) params.set("snapshotId", snapshotId);

    const controller = new AbortController();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    function fetchResults(nextSnapshotId?: string, options: { silent?: boolean } = {}) {
      const requestParams = new URLSearchParams(params);
      if (nextSnapshotId) requestParams.set("snapshotId", nextSnapshotId);

      fetch(`${API_BASE}/api/search?${requestParams.toString()}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Errore ${res.status}`);
          }
          return res.json();
        })
        .then((json: SearchResponse) => {
          if (json.hasUpdate && json.latestSnapshotId && json.latestSnapshotId !== json.snapshotId) {
            fetchResults(json.latestSnapshotId, { silent: true });
            return;
          }

          if (json.partial && json.results.length === 0) {
            setLoading(true);
            refreshTimer = setTimeout(() => {
              fetchResults(json.snapshotId, { silent: true });
            }, json.refreshAfterMs ?? 2500);
            return;
          }

          setData(json);
          setLoading(false);

          if (json.partial) {
            refreshTimer = setTimeout(() => {
              fetchResults(json.snapshotId, { silent: true });
            }, json.refreshAfterMs ?? 2500);
          }

          if (!options.silent && typeof window !== "undefined" && window.umami) {
            const eventProps: Record<string, string | number | boolean> = {
              make,
              model,
              location: location || "Tutta Italia",
              ...getMarketingEventProps(),
            };
            if (json.total != null) eventProps.total = json.total;
            window.umami.track("search-completed", eventProps);
          }
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setError(err.message || "Errore durante la ricerca");
          setLoading(false);
        });
    }

    fetchResults();

    return () => {
      controller.abort();
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [make, model, location, locationType, radius, page, sort, yearFrom, yearTo, kmMax, priceFrom, priceTo, fuel, snapshotId]);

  function updateParams(overrides: Record<string, string>, options: { preserveSnapshot?: boolean } = {}) {
    const preserveSnapshot = options.preserveSnapshot ?? true;
    const params = new URLSearchParams({ make, model, radius, page: "1", sort });
    if (location) params.set("location", location);
    if (locationType) params.set("locationType", locationType);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    if (kmMax) params.set("kmMax", kmMax);
    if (priceFrom) params.set("priceFrom", priceFrom);
    if (priceTo) params.set("priceTo", priceTo);
    if (fuel) params.set("fuel", fuel);
    const currentSnapshotId = data?.snapshotId ?? snapshotId;
    if (preserveSnapshot && currentSnapshotId) params.set("snapshotId", currentSnapshotId);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    appendCurrentUtmParams(params);
    router.push(`/results?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    updateParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSortChange(newSort: string) {
    updateParams({ sort: newSort, page: "1", snapshotId: "" }, { preserveSnapshot: false });
  }

  return (
    <main className="flex-1 bg-slate-50 min-h-screen pt-14">
      <Navbar
        actions={
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Modifica ricerca
          </button>
        }
      />

      {/* Collapsible search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden bg-white border-b border-slate-200/60"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 overflow-x-clip">
              <SearchForm initialValues={{ make, model, location, radius, yearFrom, yearTo, kmMax, priceFrom, priceTo, fuel }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto w-full min-w-0 overflow-x-clip px-3 sm:px-6 py-4 sm:py-6">
        {/* Warnings */}
        {data?.warnings && data.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl"
          >
            {data.warnings.map((w, i) => (
              <p key={i} className="text-sm text-amber-700 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {w}
              </p>
            ))}
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">
              Errore nella ricerca
            </h2>
            <p className="text-slate-500">{error}</p>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div>
            <div className="flex flex-col items-center justify-center gap-4 mb-8 py-6">
              {/* Radar animation */}
              <div className="relative w-16 h-16">
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-200 radar-pulse-1" />
                <div className="absolute inset-2 rounded-full border-2 border-blue-300 radar-pulse-2" />
                <div className="absolute inset-4 rounded-full border-2 border-blue-400 radar-pulse-3" />
                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                </div>
                {/* Sweep line */}
                <div className="absolute inset-0 radar-sweep">
                  <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-gradient-to-t from-blue-600 to-transparent origin-bottom -translate-x-1/2" />
                </div>
              </div>

              {/* Rotating messages */}
              <div className="h-6 relative overflow-hidden w-full max-w-sm">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={msgIndex}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="text-sm text-slate-500 text-center absolute inset-x-0"
                  >
                    {LOADING_MESSAGES[msgIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5">
                {LOADING_MESSAGES.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      i === msgIndex
                        ? "bg-blue-500 scale-125"
                        : i < msgIndex
                          ? "bg-blue-300"
                          : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ animationDelay: `${i * 75}ms` }} className="animate-pulse min-w-0">
                  <CarCardSkeleton />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && !error && data && data.results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">
              Nessun risultato
            </h2>
            <p className="text-slate-500">
              Nessun annuncio trovato per {make} {model}
              {location ? ` vicino a ${location}` : ""}.
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Prova a cambiare marca, modello o ad ampliare il raggio di ricerca.
            </p>
          </motion.div>
        )}

        {/* Results */}
        {!loading && !error && data && data.results.length > 0 && (
          <>
            <AlertBanner
              make={make}
              model={model}
              location={location || undefined}
              radius={radius ? Number(radius) : undefined}
              yearFrom={yearFrom ? Number(yearFrom) : undefined}
              yearTo={yearTo ? Number(yearTo) : undefined}
              kmMax={kmMax ? Number(kmMax) : undefined}
              fuel={fuel || undefined}
            />

            {/* Results header + sort */}
            <div className="flex min-w-0 flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-slate-900">
                  {data.total != null ? (
                    <>
                      <span className="text-blue-600">{data.total}</span>{" "}
                      risultati per{" "}
                      <span>{make} {model}</span>
                    </>
                  ) : (
                    <>
                      Risultati per <span>{make} {model}</span>
                    </>
                  )}
                </h1>
                {location && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {locationType === "region"
                      ? `in ${location}`
                      : `vicino a ${location} · raggio ${radius} km`}
                  </p>
                )}
                {/* Active filters chips */}
                {(yearFrom || yearTo || kmMax || priceFrom || priceTo || fuel) && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {yearFrom && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs text-blue-700 font-medium">
                        Da {yearFrom}
                      </span>
                    )}
                    {yearTo && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs text-blue-700 font-medium">
                        A {yearTo}
                      </span>
                    )}
                    {kmMax && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs text-blue-700 font-medium">
                        Max {Number(kmMax).toLocaleString("it-IT")} km
                      </span>
                    )}
                    {priceFrom && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs text-blue-700 font-medium">
                        Da € {Number(priceFrom).toLocaleString("it-IT")}
                      </span>
                    )}
                    {priceTo && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs text-blue-700 font-medium">
                        Fino a € {Number(priceTo).toLocaleString("it-IT")}
                      </span>
                    )}
                    {fuel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs text-blue-700 font-medium capitalize">
                        {fuel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto">
                {data.totalPages != null && data.totalPages > 0 && (
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Pagina {data.page} di {data.totalPages}
                  </span>
                )}
                <div className="relative w-full sm:w-auto">
                  <select
                    value={sort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Card grid with staggered animation */}
            <motion.div
              className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04 } },
              }}
            >
              {data.results.map((listing, i) => (
                <motion.div
                  key={`${listing.source}-${listing.originalUrl}-${i}`}
                  className="min-w-0 w-full"
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <CarCard listing={listing} />
                </motion.div>
              ))}
            </motion.div>

            {(data.totalPages != null || data.hasNextPage || data.page > 1) && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                hasNextPage={data.hasNextPage}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();

  const params: SearchRequestParams = {
    make: searchParams.get("make") ?? "",
    model: searchParams.get("model") ?? "",
    location: searchParams.get("location") ?? "",
    locationType: searchParams.get("locationType") ?? "",
    radius: searchParams.get("radius") ?? "100",
    page: parseInt(searchParams.get("page") ?? "1", 10),
    sort: searchParams.get("sort") ?? "price_asc",
    yearFrom: searchParams.get("yearFrom") ?? "",
    yearTo: searchParams.get("yearTo") ?? "",
    kmMax: searchParams.get("kmMax") ?? "",
    priceFrom: searchParams.get("priceFrom") ?? "",
    priceTo: searchParams.get("priceTo") ?? "",
    fuel: searchParams.get("fuel") ?? "",
    snapshotId: searchParams.get("snapshotId") ?? "",
  };

  const requestKey = [
    params.make,
    params.model,
    params.location,
    params.locationType,
    params.radius,
    params.page,
    params.sort,
    params.yearFrom,
    params.yearTo,
    params.kmMax,
    params.priceFrom,
    params.priceTo,
    params.fuel,
    params.snapshotId,
  ].join("|");

  return <ResultsView key={requestKey} {...params} />;
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center min-h-screen">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          </div>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
