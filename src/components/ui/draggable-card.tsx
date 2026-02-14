"use client";
import { cn } from "@/lib/utils";
import React, { useRef } from "react";

export const DraggableCardBody = ({
  className,
  children,
  onClick,
}: {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={cn(
        "relative w-[256px] h-[384px] sm:w-[280px] sm:h-[420px] lg:w-[300px] lg:h-[450px] shrink-0 overflow-hidden rounded-md shadow-2xl cursor-pointer",
        "bg-card dark:bg-card border border-transparent",
        "transition-transform duration-200 hover:scale-[1.02]",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const DraggableCardContainer = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className={cn("[perspective:3000px]", className)}>{children}</div>
  );
};
