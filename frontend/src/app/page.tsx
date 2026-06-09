"use client";

import { motion } from "framer-motion";
import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 hero-gradient">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 text-sm font-medium px-4 py-1.5 rounded-full mb-6 shadow-sm border border-slate-200/60 max-w-full text-center">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          AutoScout24 + Subito.it in tempo reale
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-4" style={{ fontFamily: "var(--font-display), var(--font-inter), sans-serif" }}>
          <span className="inline-flex items-center gap-3">
            {/* Radar icon */}
            <motion.svg
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth={1.5} className="text-blue-200" />
              <circle cx="12" cy="12" r="6" strokeWidth={1.5} className="text-blue-300" />
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
              <path strokeLinecap="round" strokeWidth={2} d="M12 12L18 6" className="text-blue-600" />
            </motion.svg>
            Auto
          </span>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Radar
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 max-w-lg mx-auto leading-relaxed">
          Confronta annunci da più piattaforme in un solo posto.
          <br className="hidden sm:block" />
          <span className="text-slate-400">Risparmia tempo, trova l&apos;offerta migliore.</span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        className="w-full"
      >
        <SearchForm />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-8 flex flex-col items-center gap-3"
      >
        <p className="text-sm text-slate-400 text-center max-w-md">
          I risultati vengono recuperati in tempo reale dai siti di annunci.
          La ricerca potrebbe richiedere alcuni secondi.
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
            AutoScout24
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
            Subito.it
          </span>
        </div>
      </motion.div>
    </main>
  );
}
