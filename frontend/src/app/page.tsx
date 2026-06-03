"use client";

import { motion } from "framer-motion";
import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          AutoScout24 + Subito.it
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-4">
          Trova la tua{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            auto ideale
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-500 max-w-lg mx-auto leading-relaxed">
          Confronta annunci da più piattaforme in un solo posto.
          Risparmia tempo, trova l&apos;offerta migliore.
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

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-8 text-sm text-slate-400 text-center max-w-md"
      >
        I risultati vengono recuperati in tempo reale dai siti di annunci.
        La ricerca potrebbe richiedere alcuni secondi.
      </motion.p>
    </main>
  );
}
