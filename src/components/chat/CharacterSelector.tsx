"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toImageUrl } from "@/lib/r2-utils";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Character {
  uuid: string;
  name: string;
  avatar_url?: string;
  description?: string;
  visibility_level: string;
  // Extended fields for rich card display
  gender?: string;
  age?: number;
  species?: string;
  personality_tags?: string[];
  brief_introduction?: string;
}

interface CharacterSelectorProps {
  onSelect?: (characterUuid: string) => void;
  emptyMessage?: string;
  selectPrompt?: string;
}

export default function CharacterSelector({
  onSelect,
  emptyMessage,
  selectPrompt,
}: CharacterSelectorProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination settings
  const ITEMS_PER_PAGE = 9; // 3x3 grid for most screens
  const totalPages = Math.ceil(characters.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedCharacters = characters.slice(startIndex, endIndex);

  // Internationalization hooks - using global messages for shared components
  const t = useTranslations("character_selector");
  const tSpecies = useTranslations("species");
  const tPersonality = useTranslations("personality");

  // Safe translation helper - returns {key_name} if key not found
  const safeTranslate = useCallback((translator: any, key: string): string => {
    // Check if translator has the 'has' method to avoid MISSING_MESSAGE errors
    if (typeof translator.has === "function" && !translator.has(key)) {
      return `${key}`;
    }
    try {
      const result = translator(key);
      return result;
    } catch {
      return `${key}`;
    }
  }, []);

  useEffect(() => {
    async function loadCharacters() {
      try {
        // Fetch user's characters (both public and private)
        const res = await fetch("/api/oc-maker/characters");
        const data = await res.json();
        if (data.code === 0 && data.data) {
          setCharacters(data.data.characters || []);
        }
      } catch (error) {
        console.error("Failed to load characters:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCharacters();
  }, []);

  // Reset to page 1 when characters list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [characters.length]);

  const handleSelect = (uuid: string) => {
    if (onSelect) {
      onSelect(uuid);
    } else {
      // Default: navigate to chat page
      window.location.href = `/chat/${uuid}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center text-muted-foreground max-w-md">
          {emptyMessage || t("empty_message")}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/oc-maker"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            {t("create_first_character")}
          </Link>
          <span className="text-muted-foreground text-sm">{t("or_divider")}</span>
          <Link
            href="/community?type=oc"
            className="px-6 py-3 border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors font-medium"
          >
            {t("browse_community_ocs")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-full">
      <div className="p-6 border-b flex-shrink-0">
        <h2 className="text-2xl font-bold">{selectPrompt || t("select_prompt")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("character_count", { count: characters.length })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedCharacters.map((char) => {
            // Use brief_introduction if available, fallback to description
            const introduction = char.brief_introduction || char.description;

            return (
              <button
                key={char.uuid}
                onClick={() => handleSelect(char.uuid)}
                className="flex gap-3 p-3 border border-border/40 rounded-lg bg-muted/20 hover:bg-accent hover:border-primary transition-all cursor-pointer text-left h-full"
              >
                {/* Left: Avatar */}
                <div className="flex-shrink-0">
                  {char.avatar_url ? (
                    <img
                      src={toImageUrl(char.avatar_url)}
                      alt={char.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-muted flex items-center justify-center text-2xl font-bold border border-border">
                      {char.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Right: Information */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Name */}
                  <h3
                    className="text-base sm:text-lg font-bold truncate"
                    style={{ fontFamily: "var(--font-anime, inherit)" }}
                  >
                    {char.name}
                  </h3>

                  {/* Basic Info: Gender, Age, Species */}
                  {(char.gender || char.age || char.species) && (
                    <div className="text-xs text-foreground/80 flex flex-wrap items-center gap-1">
                      {char.gender && <span>{char.gender}</span>}
                      {char.gender && (char.age || char.species) && (
                        <span className="text-muted-foreground">|</span>
                      )}
                      {char.age && (
                        <span>{t("age_label", { age: char.age })}</span>
                      )}
                      {char.age && char.species && (
                        <span className="text-muted-foreground">|</span>
                      )}
                      {char.species && (
                        <span>{safeTranslate(tSpecies, char.species)}</span>
                      )}
                    </div>
                  )}

                  {/* Personality Tags */}
                  {char.personality_tags &&
                    char.personality_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {char.personality_tags.slice(0, 4).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-medium"
                          >
                            {safeTranslate(tPersonality, tag)}
                          </span>
                        ))}
                        {char.personality_tags.length > 4 && (
                          <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-medium">
                            +{char.personality_tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                  {/* Brief Introduction */}
                  {introduction && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {introduction}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and adjacent pages
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) {
                  // Show ellipsis for skipped pages
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="text-muted-foreground px-2">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(page)}
                    className="h-9 w-9"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground mt-2">
            {t("page_summary", {
              current: currentPage,
              total: totalPages,
              count: characters.length,
            })}
          </div>
        </div>
      )}
    </div>
  );
}
