"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        if (currentY < 10) {
          setVisible(true);
        } else if (currentY < lastScrollY.current) {
          // Scrolling up
          setVisible(true);
        } else if (currentY > lastScrollY.current + 5) {
          // Scrolling down (with 5px threshold to avoid jitter)
          setVisible(false);
        }
        lastScrollY.current = currentY;
        ticking.current = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Don't show navbar on homepage (it has its own hero)
  if (isHome) return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-slate-900 hover:text-blue-600 transition-colors"
            style={{ fontFamily: "var(--font-display), var(--font-inter), sans-serif" }}
          >
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={1.5} className="text-blue-200" />
              <circle cx="12" cy="12" r="6" strokeWidth={1.5} className="text-blue-300" />
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
              <path strokeLinecap="round" strokeWidth={2} d="M12 12L18 6" className="text-blue-600" />
            </svg>
            AutoRadar
          </Link>
        </div>
      </div>
    </header>
  );
}
