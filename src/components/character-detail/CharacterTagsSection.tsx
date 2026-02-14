"use client";

import { useEffect, useMemo, useState } from "react";
import { TagEditor } from "./TagEditor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { CharacterDetailPage } from "@/types/pages/landing";
import { MAX_TAGS_PER_CHARACTER } from "@/lib/tag-normalizer";

interface CharacterTagsSectionProps {
  characterUuid: string;
  initialTags: string[];
  isOwner: boolean;
  isEditMode: boolean;
  locale: string;
  pageData: CharacterDetailPage;
}

export function CharacterTagsSection({
  characterUuid,
  initialTags,
  isOwner,
  isEditMode,
  locale,
  pageData,
}: CharacterTagsSectionProps) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isSaving, setIsSaving] = useState(false);

  const copy = pageData.tags || {};

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const handleNavigate = (tag: string) => {
    const base = locale && locale !== "en" ? `/${locale}` : "";
    router.push(`${base}/community?tags=${encodeURIComponent(tag)}`);
  };

  const handleTagsChange = async (nextTags: string[]) => {
    setTags(nextTags);
    if (!isOwner) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/oc-maker/characters/${characterUuid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: nextTags }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || json?.code !== 0) {
        throw new Error(
          json?.message || copy.error || ""
        );
      }

      if (copy.updated) {
        toast.success(copy.updated);
      }
    } catch (error) {
      console.error("Failed to update tags", error);
      toast.error(
        error instanceof Error ? error.message : copy.error || ""
      );
    } finally {
      setIsSaving(false);
    }
  };

  const helperText = useMemo(() => {
    if (isOwner) {
      return copy.helper_owner || copy.helper;
    }
    return copy.helper_viewer || copy.helper;
  }, [copy, isOwner]);

  const emptyCopy = isOwner ? copy.empty_owner : copy.empty_viewer;

  return (
    <div className="relative rounded-2xl border-2 border-border/50 bg-card/90 backdrop-blur-xl p-5 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.05)] overflow-hidden">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      {/* Corner Decorative Elements */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary/20 rounded-tl-lg pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary/20 rounded-tr-lg pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary/20 rounded-bl-lg pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary/20 rounded-br-lg pointer-events-none"></div>

      <div className="relative flex flex-row items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{copy.title || ""}</p>
          {helperText && (
            <p className="text-xs text-muted-foreground/80 mt-1 italic">{helperText}</p>
          )}
        </div>
        {!isOwner && tags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
            onClick={() => {
              const base = locale && locale !== "en" ? `/${locale}` : "";
              router.push(`${base}/community?tags=${tags.join(",")}`);
            }}
          >
            {copy.view_more || ""}
          </Button>
        )}
      </div>
      <div className="relative">
        <TagEditor
          value={tags}
          onChange={handleTagsChange}
          readOnly={!isOwner || !isEditMode}
          helperText={helperText || emptyCopy}
          isBusy={isSaving}
          copy={{
            placeholder: copy.placeholder,
            helper: emptyCopy,
            emptyState: emptyCopy,
            suggestionsLabel: copy.suggestions,
            recommendedLabel: copy.recommended,
            maxReached: copy.max
              ? copy.max.replace(
                  "{max}",
                  String(MAX_TAGS_PER_CHARACTER),
                )
              : "",
            duplicateLabel: copy.duplicate,
            savingLabel: copy.saving,
            removeAriaLabel: copy.remove,
            loadError: copy.error,
            addError: copy.error,
            inputAriaLabel: copy.input_aria,
          }}
          onTagClick={handleNavigate}
        />
      </div>
    </div>
  );
}
