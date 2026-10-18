"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FaceScanIllustration } from "@/components/landing/face-scan-illustration";

const messages = [
  "Checking image quality…",
  "Looking for visible features…",
  "Preparing your results…",
];

export function ScanningState() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <FaceScanIllustration />
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="text-sm font-medium text-ink-muted"
        >
          {messages[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
