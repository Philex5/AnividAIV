"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface GenerationStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "failed";
}

interface GenerationProgressProps {
  steps: GenerationStep[];
  onComplete?: () => void;
  title?: string;
  subtitle?: string;
}

export function GenerationProgress({
  steps,
  onComplete,
  title,
  subtitle,
}: GenerationProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const processingIndex = steps.findIndex((s) => s.status === "processing");
    const lastCompletedIndex = [...steps].reverse().findIndex((s) => s.status === "completed");
    
    if (processingIndex >= 0) {
      setCurrentStepIndex(processingIndex);
    } else if (lastCompletedIndex >= 0) {
      setCurrentStepIndex(steps.length - 1 - lastCompletedIndex);
    }
  }, [steps]);

  useEffect(() => {
    const allCompleted = steps.every((s) => s.status === "completed");
    if (allCompleted && onComplete) {
      setTimeout(onComplete, 800);
    }
  }, [steps, onComplete]);

  const currentStep = steps[currentStepIndex] || steps[0];

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg mx-4"
      >
        <Card
          variant="glass"
          radius="xl"
          className="p-6 sm:p-8 border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] bg-background/80 relative overflow-hidden"
        >
          {/* Decorative background gradient */}
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />

          <div className="relative space-y-8">
            {/* Horizontal Step Indicators */}
            <div className="relative flex items-center justify-between px-2">
              {/* Connecting Line Background */}
              <div className="absolute top-5 left-8 right-8 h-0.5 bg-muted/20 -translate-y-1/2" />
              
              {/* Active Progress Line */}
              <motion.div 
                className="absolute top-5 left-8 h-0.5 bg-primary -translate-y-1/2 origin-left"
                initial={{ scaleX: 0 }}
                animate={{ 
                  scaleX: Math.max(0, currentStepIndex / (steps.length - 1)) 
                }}
                transition={{ duration: 0.5 }}
                style={{ width: "calc(100% - 64px)" }}
              />

              {steps.map((step, index) => {
                const isCompleted = step.status === "completed";
                const isProcessing = step.status === "processing";
                const isFailed = step.status === "failed";

                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center">
                    <motion.div
                      animate={{
                        scale: isProcessing ? 1.1 : 1,
                        backgroundColor: isCompleted || isProcessing ? "var(--color-primary)" : "rgba(var(--color-muted), 0.1)",
                      }}
                      className={cn(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-300",
                        isCompleted || isProcessing 
                          ? "border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" 
                          : "border-muted-foreground/30 text-muted-foreground bg-background/50",
                        isFailed && "border-destructive text-destructive bg-destructive/10 shadow-none"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : isFailed ? (
                        <span className="text-lg">✕</span>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </motion.div>
                    
                    {isProcessing && (
                      <motion.div
                        className="absolute inset-0 -m-1 rounded-full border-2 border-primary"
                        animate={{ scale: [1, 1.2], opacity: [1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current Step Info */}
            <div className="text-center space-y-3 px-4">
              <div className="space-y-1">
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={currentStep.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xl font-anime font-bold text-foreground"
                  >
                    {title}
                  </motion.h3>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep.id + "-label"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1"
                  >
                    <p className="text-sm text-foreground font-semibold">
                      {currentStep.label}
                    </p>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground">
                        {subtitle}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Loader for processing */}
              {currentStep.status === "processing" && (
                <div className="flex justify-center pt-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-5 h-5 text-primary" />
                  </motion.div>
                </div>
              )}
            </div>

            {/* Progress Percentage */}
            <div className="pt-2">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Progress
                </span>
                <span className="text-sm font-mono font-bold text-primary">
                  {Math.round(
                    (steps.filter((s) => s.status === "completed").length /
                      steps.length) *
                      100
                  )}%
                </span>
              </div>
              <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${
                      (steps.filter((s) => s.status === "completed").length /
                        steps.length) *
                      100
                    }%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

