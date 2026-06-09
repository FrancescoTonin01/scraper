"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type AlertBannerProps = {
  make: string;
  model: string;
  location?: string;
  radius?: number;
  yearFrom?: number;
  yearTo?: number;
  kmMax?: number;
  fuel?: string;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function AlertBanner({
  make,
  model,
  location,
  radius,
  yearFrom,
  yearTo,
  kmMax,
  fuel,
}: AlertBannerProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "submitting") return;

    setState("submitting");

    try {
      const res = await fetch(`${API_BASE}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          make,
          model,
          ...(location && { location }),
          ...(radius && { radius }),
          ...(yearFrom && { yearFrom }),
          ...(yearTo && { yearTo }),
          ...(kmMax && { kmMax }),
          ...(fuel && { fuel }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore imprevisto");

      setState("success");
      setMessage(data.message);

      if (typeof window !== "undefined" && typeof window.umami !== "undefined") {
        window.umami.track("alert-subscribed", { make, model });
      }
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Errore imprevisto");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="relative bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl p-5 mb-6"
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        aria-label="Chiudi"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <AnimatePresence mode="wait">
        {state === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 text-sm text-green-700"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{message}</span>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Ricevi alert per {make} {model}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ti avviseremo quando appariranno nuovi annunci per questa ricerca.
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "error") setState("idle");
                }}
                placeholder="La tua email"
                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={state === "submitting"}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                {state === "submitting" ? "..." : "Attiva"}
              </button>
            </form>
            {state === "error" && (
              <p className="text-xs text-red-600 mt-2">{message}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
