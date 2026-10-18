"use client";

import { motion, useReducedMotion } from "motion/react";

// The one signature motion moment for the whole product (per the
// design brief: spend boldness in one place). A slow, deliberate scan
// sweep across a line-art face, with a few markers appearing where it
// passes — a literal, restrained depiction of what the product does,
// not decoration for its own sake.
export function FaceScanIllustration() {
  const reduceMotion = useReducedMotion();

  const markers = [
    { cx: 178, cy: 168, delay: 0.9 },
    { cx: 246, cy: 190, delay: 1.3 },
    { cx: 200, cy: 268, delay: 1.9 },
    { cx: 158, cy: 300, delay: 2.3 },
  ];

  return (
    <svg
      viewBox="0 0 400 480"
      className="h-auto w-full max-w-sm"
      role="img"
      aria-label="Illustration of a face outline being scanned for visible skin concerns"
    >
      <defs>
        <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f6e63" stopOpacity="0" />
          <stop offset="50%" stopColor="#3f6e63" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3f6e63" stopOpacity="0" />
        </linearGradient>
        <clipPath id="faceClip">
          <path d="M200 56c58 0 96 46 96 112 0 78-46 148-96 148S104 246 104 168c0-66 38-112 96-112z" />
        </clipPath>
      </defs>

      {/* Face outline */}
      <path
        d="M200 56c58 0 96 46 96 112 0 78-46 148-96 148S104 246 104 168c0-66 38-112 96-112z"
        fill="none"
        stroke="#171B18"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      {/* Ears */}
      <path d="M104 176c-10-4-16 2-16 12s8 20 18 18" fill="none" stroke="#171B18" strokeOpacity="0.25" strokeWidth="1.5" />
      <path d="M296 176c10-4 16 2 16 12s-8 20-18 18" fill="none" stroke="#171B18" strokeOpacity="0.25" strokeWidth="1.5" />
      {/* Eyes */}
      <path d="M150 172c8-8 24-8 32 0" fill="none" stroke="#171B18" strokeOpacity="0.3" strokeWidth="1.5" />
      <path d="M218 172c8-8 24-8 32 0" fill="none" stroke="#171B18" strokeOpacity="0.3" strokeWidth="1.5" />
      {/* Nose */}
      <path d="M198 190c-4 18-8 30-10 40 4 6 12 8 12 8" fill="none" stroke="#171B18" strokeOpacity="0.25" strokeWidth="1.5" />
      {/* Mouth */}
      <path d="M172 268c14 10 42 10 56 0" fill="none" stroke="#171B18" strokeOpacity="0.3" strokeWidth="1.5" />

      {/* Scan sweep, clipped to the face silhouette */}
      <g clipPath="url(#faceClip)">
        <motion.rect
          x="90"
          width="220"
          height="90"
          fill="url(#scanGradient)"
          initial={{ y: 40 }}
          animate={reduceMotion ? { y: 40 } : { y: [40, 300, 40] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 5, times: [0, 0.6, 1], repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }
          }
        />
      </g>

      {/* Detected-region markers */}
      {markers.map((m, i) => (
        <motion.circle
          key={i}
          cx={m.cx}
          cy={m.cy}
          r={5}
          fill="none"
          stroke="#b85c42"
          strokeWidth="1.5"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={
            reduceMotion
              ? { opacity: 0.9, scale: 1 }
              : { opacity: [0, 0.9, 0.9, 0], scale: [0.6, 1, 1, 0.6] }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 6.2,
                  times: [0, 0.15, 0.75, 1],
                  delay: m.delay,
                  repeat: Infinity,
                  repeatDelay: 0,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </svg>
  );
}
