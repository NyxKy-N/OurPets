"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.986 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, amount: 0.18, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: delay / 1000 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
