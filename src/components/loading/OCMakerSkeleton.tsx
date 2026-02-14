"use client";

import { motion } from "framer-motion";

/**
 * OCMakerSkeleton - A visually appealing loading skeleton for OC Maker feature card
 * Matches the exact layout of the 4 cards in OCMakerBentoLayout for instant visual feedback
 */
export function OCMakerSkeleton() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />

      {/* Center Character Silhouette */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-[60%] h-[80%] bg-gradient-to-b from-primary/20 to-transparent rounded-[3rem] blur-3xl"
        />
      </div>

      {/* Card Container with consistent positioning */}
      <div className="absolute inset-0">
        {/* Top-Left: Bio Fragment Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-8 left-6 z-20 w-64 hidden md:block"
        >
          <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-[1.8rem] p-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded-full bg-primary/40 animate-pulse" />
              <div className="h-2 w-20 bg-white/10 rounded-full animate-pulse" />
            </div>
            {/* Quote Lines */}
            <div className="space-y-2">
              <div className="h-2 w-full bg-white/5 rounded-full animate-pulse" />
              <div className="h-2 w-4/5 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
              <div className="h-2 w-3/5 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
            </div>
          </div>
        </motion.div>

        {/* Top-Right: Skill Arsenal Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute top-8 right-6 z-20 w-56 hidden lg:block"
        >
          <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-[1.8rem] p-5 shadow-2xl">
            {/* Header */}
            <div className="h-2 w-28 bg-white/10 rounded-full animate-pulse mb-4" />
            {/* Skill Items */}
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-20 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <div
                          key={s}
                          className="w-2 h-2 rounded-sm bg-primary/30 animate-pulse"
                          style={{ animationDelay: `${i * 0.1 + s * 0.05}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom-Left: Identity Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-36 left-6 z-20 w-64 hidden lg:block"
        >
          <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-[1.8rem] p-5 shadow-2xl">
            {/* Avatar + Name Row */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white/10 animate-pulse" />
                  <div className="w-4 h-4 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-12 bg-amber-500/20 rounded-md animate-pulse" />
                </div>
              </div>
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 w-14 bg-white/5 rounded-lg animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom-Right: Power Matrix Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-32 right-6 z-20 w-48 h-48 hidden md:block"
        >
          <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-[1.8rem] p-5 shadow-2xl h-full flex flex-col">
            {/* Header */}
            <div className="h-2 w-24 bg-white/10 rounded-full animate-pulse mb-4 mx-auto" />
            {/* Radar Chart Placeholder */}
            <div className="flex-1 flex items-center justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative w-32 h-32"
              >
                {/* Concentric circles simulating radar */}
                <div className="absolute inset-0 border border-white/10 rounded-full" />
                <div className="absolute inset-[20%] border border-white/10 rounded-full" />
                <div className="absolute inset-[40%] border border-white/10 rounded-full bg-primary/10" />
                {/* Spinning element */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-1 h-4 bg-primary/50 rounded-full" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
      </div>
    </div>
  );
}
