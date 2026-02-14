"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe, Search, Plus, ArrowUpRight } from "lucide-react";
import type { CharacterDetailPage } from "@/types/pages/landing";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

interface worldItem {
  id: number;
  uuid: string;
  name: string;
  slug?: string;
  description?: string;
  cover_url?: string | null;
  is_preset?: boolean;
  theme_colors?: Record<string, string> | null;
  creator_uuid?: string | null;
  allow_join?: boolean | null;
}

interface worldselectorProps {
  value?: string | null;
  onChange?: (worldUuid: string | null, world?: worldItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
  pageData?: CharacterDetailPage;
  className?: string;
  ownerUuid?: string | null;
}

export function WorldSelector({
  value,
  onChange,
  disabled,
  placeholder,
  pageData,
  className,
  ownerUuid,
}: worldselectorProps) {
  const [worlds, setworlds] = useState<worldItem[]>([]);
  const [myWorlds, setMyWorlds] = useState<worldItem[]>([]);
  const [recommendedWorlds, setRecommendedWorlds] = useState<worldItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        const fetchOptions: RequestInit = { credentials: "include" };
        let nextUserUuid = ownerUuid || null;
        if (!nextUserUuid) {
          const userRes = await fetch("/api/get-user-info", fetchOptions);
          const userJson = await readJson(userRes);
          nextUserUuid = userRes.ok ? userJson?.user?.uuid || null : null;
        }

        const [recommendedRes, myRes] = await Promise.all([
          fetch("/api/worlds?limit=100&joinable_only=1", fetchOptions),
          nextUserUuid
            ? fetch(
                `/api/worlds?limit=100&creator_uuid=${encodeURIComponent(
                  nextUserUuid,
                )}`,
                fetchOptions,
              )
            : Promise.resolve(null),
        ]);

        const recommendedJson = recommendedRes
          ? await readJson(recommendedRes)
          : null;
        const myJson = myRes ? await readJson(myRes) : null;
        
        if (!mounted) return;

        const nextMyWorlds: worldItem[] =
          myRes?.ok && Array.isArray(myJson?.data?.worlds)
            ? myJson.data.worlds
            : [];
        const nextRecommended: worldItem[] =
          recommendedRes.ok && Array.isArray(recommendedJson?.data?.worlds)
            ? recommendedJson.data.worlds
            : [];
        const myWorldIds = new Set(nextMyWorlds.map((item) => item.uuid));
        const dedupedRecommended = nextRecommended.filter(
          (item) => !myWorldIds.has(item.uuid),
        );
        const mergedWorlds = [...nextMyWorlds, ...dedupedRecommended];

        setMyWorlds(nextMyWorlds);
        setRecommendedWorlds(dedupedRecommended);
        setworlds(mergedWorlds);
      } catch (error) {
        console.error("Failed to fetch selector data", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, [ownerUuid]);

  const filteredMyWorlds = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return myWorlds;
    return myWorlds.filter((world) =>
      world.name.toLowerCase().includes(keyword),
    );
  }, [search, myWorlds]);

  const filteredRecommendedWorlds = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const base = keyword
      ? recommendedWorlds.filter((world) =>
          world.name.toLowerCase().includes(keyword),
        )
      : recommendedWorlds;
    return [...base].sort((a, b) => {
      if (!!a.is_preset === !!b.is_preset) {
        return a.name.localeCompare(b.name);
      }
      return a.is_preset ? -1 : 1;
    });
  }, [search, recommendedWorlds]);

  const handleValueChange = (nextValue: string) => {
    if (nextValue === "__none__") {
      onChange?.(null, null);
      return;
    }
    const selected = worlds.find((item) => item.uuid === nextValue) || null;
    onChange?.(selected ? selected.uuid : null, selected);
  };

  const selectorCopy = pageData?.world_selector;
  const selectedWorld = useMemo(
    () => worlds.find((item) => item.uuid === value) || null,
    [value, worlds]
  );
  const noneLabel = selectorCopy?.none || "";
  const placeholderLabel = placeholder || selectorCopy?.placeholder || noneLabel;

  return (
    <div className="space-y-2">
      <Select
        value={value || "__none__"}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={cn(
          "h-10 rounded-xl border-border/40 bg-background/40 backdrop-blur-md transition-all hover:bg-background/60 focus:ring-1 focus:ring-primary/20 flex justify-start px-4 text-xs font-bold overflow-hidden",
          className
        )}>
          <SelectValue placeholder={placeholderLabel}>
            {selectedWorld ? (
              <span className="text-xs font-semibold text-foreground tracking-tight truncate">
                {selectedWorld.name}
              </span>
            ) : value ? null : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 truncate">
                {noneLabel}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[320px] sm:w-[480px] rounded-2xl p-3 border-2 border-border/50 bg-background/90 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 mb-2 px-2 pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary shrink-0"
                    asChild
                  >
                    <Link href="/worlds/create">
                      <Plus className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{selectorCopy?.create || ""}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={selectorCopy?.search || ""}
                className="h-9 pl-8 bg-muted/30 border-none rounded-xl text-xs placeholder:text-muted-foreground/30 focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto overflow-x-hidden no-scrollbar">
            <SelectItem value="__none__" className="rounded-xl focus:bg-primary/10 transition-colors">
              <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                {selectorCopy?.none || ""}
              </span>
            </SelectItem>
            <SelectSeparator className="bg-white/5 my-2" />

            {isLoading && (
              <div className="p-4 space-y-2">
                <Skeleton className="h-12 rounded-xl bg-white/5" />
                <Skeleton className="h-12 rounded-xl bg-white/5" />
                <Skeleton className="h-12 rounded-xl bg-white/5" />
              </div>
            )}

            {!isLoading && (
              <>
                {filteredMyWorlds.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                      {selectorCopy?.my_worlds || ""}
                    </SelectLabel>
                    {filteredMyWorlds.map((item) => (
                      <SelectItem
                        key={item.uuid}
                        value={item.uuid}
                        textValue={item.name}
                        className="rounded-xl focus:bg-primary/10 transition-colors py-2.5"
                      >
                        <WorldOption
                          item={item}
                          emptyDescriptionLabel={
                            selectorCopy?.description_empty || ""
                          }
                        />
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {filteredRecommendedWorlds.length > 0 && (
                  <>
                    <SelectSeparator className="bg-white/5 my-2" />
                    <SelectGroup>
                      <SelectLabel className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-secondary/60">
                        {selectorCopy?.recommended || ""}
                      </SelectLabel>
                      {filteredRecommendedWorlds.map((item) => (
                        <SelectItem
                          key={item.uuid}
                          value={item.uuid}
                          textValue={item.name}
                          className="rounded-xl focus:bg-secondary/10 transition-colors py-2.5"
                        >
                          <WorldOption
                            item={item}
                            emptyDescriptionLabel={
                              selectorCopy?.description_empty || ""
                            }
                          />
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                )}

                {filteredMyWorlds.length === 0 &&
                  filteredRecommendedWorlds.length === 0 && (
                  <div className="p-8 text-center">
                    <Globe className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground/50">
                      {selectorCopy?.empty || ""}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}

async function readJson(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

function WorldOption({
  item,
  emptyDescriptionLabel,
}: {
  item: worldItem;
  emptyDescriptionLabel: string;
}) {
  const { displayUrl: coverDisplayUrl } = useResolvedImageUrl(item.cover_url);

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative group/opt shrink-0">
        {coverDisplayUrl ? (
          <img
            src={coverDisplayUrl}
            alt={item.name}
            className="h-16 w-24 rounded-lg object-cover shadow-md transition-transform group-hover/opt:scale-105"
          />
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-muted/40 border border-white/5">
            <div className="w-6 h-6 rounded-full bg-primary/20" />
          </div>
        )}
        {item.theme_colors?.primary && (
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background shadow-sm"
            style={{ backgroundColor: item.theme_colors.primary }}
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-sm font-bold text-foreground tracking-tight truncate">
          {item.name}
        </span>
        {item.description ? (
          <span className="text-[10px] text-muted-foreground/60 line-clamp-2">
            {item.description}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/30 italic">
            {emptyDescriptionLabel}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          window.open(`/worlds/${item.uuid}`, '_blank');
        }}
      >
        <ArrowUpRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
