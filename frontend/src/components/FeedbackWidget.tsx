"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [responseMsg, setResponseMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0 || state === "submitting") return;

    setState("submitting");

    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          ...(message.trim() && { message: message.trim() }),
          page: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore");

      setState("success");
      setResponseMsg(data.message);

      if (typeof window !== "undefined" && typeof window.umami !== "undefined") {
        window.umami.track("feedback-submitted", { rating });
      }

      setTimeout(() => {
        setOpen(false);
        setState("idle");
        setRating(0);
        setMessage("");
      }, 2000);
    } catch (err) {
      setState("error");
      setResponseMsg(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center cursor-pointer"
        aria-label="Invia feedback"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-20 right-5 z-50 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-5"
            >
              <AnimatePresence mode="wait">
                {state === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4"
                  >
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-800">{responseMsg}</p>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleSubmit} exit={{ opacity: 0 }}>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">
                      Come trovi AutoRadar?
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Il tuo feedback ci aiuta a migliorare.
                    </p>

                    {/* Star rating */}
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHovered(star)}
                          onMouseLeave={() => setHovered(0)}
                          className="cursor-pointer transition-transform hover:scale-110"
                          aria-label={`${star} stelle`}
                        >
                          <svg
                            className={`w-7 h-7 transition-colors ${
                              star <= (hovered || rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-slate-200 fill-slate-200"
                            }`}
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </button>
                      ))}
                    </div>

                    {/* Optional message */}
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Suggerimenti, problemi, idee… (opzionale)"
                      rows={3}
                      maxLength={2000}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-400"
                    />

                    {state === "error" && (
                      <p className="text-xs text-red-600 mt-1">{responseMsg}</p>
                    )}

                    <button
                      type="submit"
                      disabled={rating === 0 || state === "submitting"}
                      className="mt-3 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      {state === "submitting" ? "Invio..." : "Invia feedback"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
