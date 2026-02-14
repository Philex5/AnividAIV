"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getR2ImageUrl } from "@/lib/asset-loader";

const stickers = [
  "showcases/landingpage-features/sticker-1.webp",
  "showcases/landingpage-features/sticker-2.webp",
  "showcases/landingpage-features/sticker-3.webp",
];

export function OCAppsBentoLayout() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-linear-to-br from-indigo-500/10 via-transparent to-primary/5">
      {/* 1. Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.15)_0%,transparent_70%)] blur-3xl" />

      {/* 2. Main 3D Figure (Center-Left) */}
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute left-[5%] top-[10%] w-[60%] h-[80%] z-20"
      >
        <motion.img
          src={getR2ImageUrl(
            "showcases/landingpage-features/feature-oc-apps.webp",
          )}
          alt="OC 3D Figure"
          animate={{
            y: [0, -15, 0],
            rotate: [-1, 1, -1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        />
        {/* Figure Base Shadow */}
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[60%] h-5 bg-black/40 blur-xl rounded-[100%] scale-x-125" />
      </motion.div>

      {/* 3. Scattered Stickers (Top-Right) */}
      <div className="absolute right-[12%] top-[20%] w-24 h-24 z-30">
        {stickers.map((src, i) => (
          <motion.div
            key={i}
            variants={{
              initial: {
                x: i === 0 ? -60 : i === 1 ? 40 : 20,
                y: i === 0 ? -20 : i === 1 ? -50 : 50,
                rotate: i === 0 ? -15 : i === 1 ? 15 : 10,
                scale: 1,
              },
              hover: {
                x: i === 0 ? -80 : i === 1 ? 60 : 30,
                y: i === 0 ? -40 : i === 1 ? -70 : 70,
                rotate: i === 0 ? -25 : i === 1 ? 25 : 20,
                scale: 1.1,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              },
            }}
            className="absolute inset-0"
          >
            <motion.div
              animate={{
                y: [0, i % 2 === 0 ? -5 : 5, 0],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative rotate-3"
            >
              <img
                src={getR2ImageUrl(src)}
                alt={`Sticker ${i}`}
                className="w-full h-full object-contain drop-shadow-xl"
              />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* 4. Trading Card (Bottom-Right/Center) */}
      <motion.div
        variants={{
          initial: { rotateY: 0, rotateX: 0, x: 20, y: 40, opacity: 0.8 },
          hover: { rotateY: -15, rotateX: 10, x: 0, y: 0, opacity: 1 },
        }}
        className="absolute right-[8%] bottom-[12%] w-40 aspect-[2.5/3.5] z-40 hidden md:block"
      >
        <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 group/card">
          {/* Card Content Placeholder */}
          <div className="absolute inset-0 bg-linear-to-br from-indigo-500/20 to-purple-500/20" />
          <img
            src={getR2ImageUrl(
              "showcases/landingpage-features/feature-oc-apps-figure.webp",
            )}
            className="w-full h-full object-cover opacity-80"
            alt="Card Art"
          />
          {/* Holographic Flash */}
          <motion.div
            animate={{
              background: [
                "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 60%, transparent 100%)",
                "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 10%, rgba(255,255,255,0) 20%, transparent 100%)",
              ],
              backgroundPosition: ["200% 0%", "-200% 0%"],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 pointer-events-none"
          />
          {/* Card Border Shine */}
          <div className="absolute inset-0 border-2 border-amber-400/30 rounded-xl" />
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-[8px] font-black text-white">
            SSR
          </div>
        </div>
      </motion.div>

      {/* 5. Floating Accents */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute left-[15%] bottom-[20%] w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center z-10"
      >
        <span className="text-sm">✨</span>
      </motion.div>
    </div>
  );
}
