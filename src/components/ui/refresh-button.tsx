"use client";

import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  className?: string;
}

export default function RefreshButton({
  onRefresh,
  variant = "outline",
  size = "default",
  className,
}: RefreshButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    startTransition(async () => {
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isPending || loading}
      className={className}
    >
      <RefreshCw
        className={`h-4 w-4 ${isPending || loading ? "animate-spin" : ""}`}
      />
      {isPending || loading ? "Loading..." : "Refresh"}
    </Button>
  );
}
