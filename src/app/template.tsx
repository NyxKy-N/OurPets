"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    try {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = () =>
        setReduced(m.matches || document.documentElement.classList.contains("reduced-effects"));
      handler();
      m.addEventListener("change", handler);
      return () => m.removeEventListener("change", handler);
    } catch {
      setReduced(document.documentElement.classList.contains("reduced-effects"));
    }
  }, []);

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={pathname}
        className="route-transition"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
