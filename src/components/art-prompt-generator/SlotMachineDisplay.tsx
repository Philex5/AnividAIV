"use client";

import { useEffect, useRef, useState } from "react";
import { PromptItem } from "./types";
import { cn } from "@/lib/utils";

interface SlotMachineDisplayProps {
  value: PromptItem | null;
  isAnimating: boolean;
  animationToken: number;
  items: PromptItem[];
  placeholder?: string;
  className?: string;
}

const getRandomItem = (items: PromptItem[]): PromptItem | null => {
  if (!items.length) {
    return null;
  }

  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  const random = Math.random() * totalWeight;
  let accumulated = 0;

  for (const item of items) {
    accumulated += item.weight ?? 1;
    if (random <= accumulated) {
      return item;
    }
  }

  return items[items.length - 1];
};

export function SlotMachineDisplay({
  value,
  isAnimating,
  animationToken,
  items,
  placeholder = "—",
  className,
}: SlotMachineDisplayProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    value?.text || placeholder
  );
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    setDisplayValue(value?.text || placeholder);
  }, [value, placeholder]);

  useEffect(() => {
    if (!isAnimating) {
      clearTimers();
      setDisplayValue(value?.text || placeholder);
      return;
    }

    clearTimers();
    const phases = [
      { duration: 500, interval: 60 },
      { duration: 300, interval: 110 },
    ];

    let elapsed = 0;
    phases.forEach((phase) => {
      const steps = Math.max(1, Math.floor(phase.duration / phase.interval));
      for (let step = 0; step < steps; step++) {
        elapsed += phase.interval;
        const timeout = setTimeout(() => {
          const randomItem = getRandomItem(items);
          setDisplayValue(randomItem?.text || placeholder);
        }, elapsed);
        timeoutsRef.current.push(timeout);
      }
    });

    const finalizeTimeout = setTimeout(() => {
      setDisplayValue(value?.text || placeholder);
    }, elapsed + 20);
    timeoutsRef.current.push(finalizeTimeout);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, animationToken, items, placeholder]);

  return (
    <span
      className={cn(
        "text-lg font-semibold text-foreground transition-colors",
        isAnimating && "text-primary",
        className
      )}
    >
      {displayValue}
    </span>
  );
}
