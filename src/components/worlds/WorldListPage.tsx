"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { WorldCard } from "./WorldCard";
import type { OCworldWithCount } from "@/models/oc-world";
import { cn } from "@/lib/utils";

interface WorldListPageProps {
  initialWorlds: OCworldWithCount[];
  locale?: string;
  pageData?: any;
}

export function WorldListPage({ initialWorlds, pageData }: WorldListPageProps) {
  const listCopy = pageData?.list || {};

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-foreground/80">
                {listCopy.title || ""}
              </h2>
              {listCopy.subtitle ? (
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/70">
                  {listCopy.subtitle}
                </p>
              ) : null}
            </div>
            <Badge variant="outline" className="rounded-full border-border/50">
              {initialWorlds.length}
            </Badge>
          </div>
          <Button
            asChild
            className="rounded-2xl h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground transition-all font-bold"
          >
            <Link href="/worlds/create">
              <Plus className="w-4 h-4 mr-2" /> {listCopy.create || ""}
            </Link>
          </Button>
        </div>

        {initialWorlds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {initialWorlds.map((world) => (
              <WorldCard
                key={world.uuid}
                world={world}
                translations={pageData}
              />
            ))}
          </div>
        ) : (
          <div className="py-32 text-center">
            <h3 className="text-2xl font-black text-muted-foreground/60 uppercase tracking-widest">
              {listCopy.empty_title || ""}
            </h3>
            <p className="text-base text-muted-foreground/40 max-w-xs mx-auto mt-4 font-medium">
              {listCopy.empty_description || ""}
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-10 rounded-2xl px-10 h-12 border-border/50 font-bold"
            >
              <Link href="/worlds/create">{listCopy.empty_cta || ""}</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
        variant === "outline"
          ? "border border-border/50 text-muted-foreground"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
