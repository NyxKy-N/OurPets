"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { useReducedEffects } from "@/app/providers";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { reducedEffects } = useReducedEffects();
  const [supportsViewTransition, setSupportsViewTransition] = React.useState(false);

  React.useEffect(() => {
    try {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = () => setSupportsViewTransition("startViewTransition" in document && !m.matches);
      handler();
      m.addEventListener("change", handler);
      return () => m.removeEventListener("change", handler);
    } catch {
      setSupportsViewTransition("startViewTransition" in document);
    }
  }, []);

  if (reducedEffects || supportsViewTransition) return <div className="route-transition">{children}</div>;

  return (
    <motion.div
      key={pathname}
      className="route-transition"
      initial={{ opacity: 0, scale: 0.992, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", mass: 0.72, damping: 24, stiffness: 280 }}
    >
      {children}
    </motion.div>
  );
}
