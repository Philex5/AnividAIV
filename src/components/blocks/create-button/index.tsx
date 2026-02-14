"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface CreateButtonProps {
  href?: string;
  onClick?: () => void;
}

export default function CreateButton({ href = "/oc-maker", onClick }: CreateButtonProps) {
  if (onClick) {
    return (
      <Button
        variant="default"
        size="sm"
        className="flex items-center gap-1"
        onClick={onClick}
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Create</span>
      </Button>
    );
  }

  return (
    <Button variant="default" size="sm" className="flex items-center gap-1" asChild>
      <Link href={href as any}>
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Create</span>
      </Link>
    </Button>
  );
}