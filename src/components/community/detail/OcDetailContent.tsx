"use client";

import { useCallback, useMemo } from "react";
import {
  getCreamyCharacterUrl,
  getMemberBadgeUrl,
  getModelIconUrl,
  getPublicAssetUrl,
} from "@/lib/asset-loader";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  ArtworkDetail,
  ArtworkPreview,
  CommunityPage,
} from "@/types/pages/community";

function formatDisplayDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => input.toString().padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface OcDetailContentProps {
  detail: ArtworkDetail | null;
  listItem?: ArtworkPreview;
  onRemix?: () => void;
  onClose: () => void;
  pageData: CommunityPage;
}

export function OcDetailContent({
  detail,
  listItem,
  onRemix,
  onClose,
  pageData,
}: OcDetailContentProps) {
  const tSpecies = useTranslations("species");
  const tPersonality = useTranslations("personality");
  const router = useRouter();

  const t =
    ((pageData as any)?.detail?.oc as
      | {
          gender?: string;
          gender_male?: string;
          gender_female?: string;
          gender_other?: string;
          age?: string;
          species?: string;
          personality?: string;
          introduction?: string;
          remixButton?: string;
          chatButton?: string;
          detailButton?: string;
          noIntroduction?: string;
        }
      | undefined) ?? {
      gender: "Gender",
      gender_male: "Male",
      gender_female: "Female",
      gender_other: "Other",
      age: "Age",
      species: "Species",
      personality: "Personality",
      introduction: "Introduction",
      remixButton: "Remix It",
      chatButton: "Chat",
      detailButton: "Detail",
      noIntroduction: "No introduction available",
    };

  const character = useMemo(() => {
    const data = detail || listItem;
    if (!data) return null;

    return {
      uuid: data.id,
      name: data.title || "Unknown OC",
      avatar_url: data.cover_url || data.media_urls?.[0] || "",
    };
  }, [detail, listItem]);

  const characterMeta = useMemo(() => {
    const data = detail || listItem;
    if (!data) {
      return {
        gender: undefined,
        age: undefined,
        species: undefined,
        personality_tags: [],
        brief_introduction: undefined,
        allow_remix: false,
      };
    }

    const meta = data.meta as any;

    // Determine remix permission: default to true unless explicitly set to false
    const allowRemix = meta?.allow_remix === false ? false : true;

    return {
      gender: meta?.gender,
      age: meta?.age,
      species: meta?.race_code || meta?.species,
      personality_tags: data.tags || [],
      brief_introduction: data.description,
      allow_remix: allowRemix,
    };
  }, [detail, listItem]);

  const safeTranslate = useCallback((translator: any, key: string): string => {
    // Check if translator has the 'has' method to avoid MISSING_MESSAGE errors
    if (typeof translator.has === "function" && !translator.has(key)) {
      return key;
    }
    try {
      const result = translator(key);
      return result;
    } catch {
      return key;
    }
  }, []);

  const getGenderTranslation = useCallback(
    (gender: string): string => {
      const normalized = gender.toLowerCase();
      if (normalized === "male") return t.gender_male || "Male";
      if (normalized === "female") return t.gender_female || "Female";
      if (normalized === "other") return t.gender_other || "Other";
      return gender;
    },
    [t]
  );

  const handleDetail = () => {
    const data = detail || listItem;
    const characterUuid = data?.id;
    if (!characterUuid) return;
    onClose();
    router.push(`/characters/${characterUuid}`);
  };

  const handleRemix = () => {
    const data = detail || listItem;
    const characterUuid = data?.id;
    if (!characterUuid) return;
    onClose();
    router.push(`/oc-maker?character_uuid=${characterUuid}`);
  };

  const handleChat = () => {
    const data = detail || listItem;
    const characterUuid = data?.id;
    if (!characterUuid) return;
    onClose();
    router.push(`/chat/${characterUuid}`);
  };

  if (!character) {
    return (
      <div className="space-y-3 text-sm text-muted-foreground text-center py-8">
        No character information available
      </div>
    );
  }

  const createdAt = useMemo(() => {
    const data = detail || listItem;
    return data?.created_at || null;
  }, [detail, listItem]);

  return (
    <div className="space-y-4">
      {/* Created Time */}
      {createdAt && (
        <div className="text-xs text-muted-foreground">
          {formatDisplayDate(createdAt)}
        </div>
      )}

      {/* Basic Info Card */}
      <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
        <div className="space-y-2">
          {/* Character Name */}
          <h3
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-anime, inherit)" }}
          >
            {character.name}
          </h3>

          {/* Gender and Age */}
          {(characterMeta.gender || characterMeta.age) && (
            <div className="text-xs text-foreground/80">
              {characterMeta.gender && (
                <span>
                  {t.gender || "Gender"}: {getGenderTranslation(characterMeta.gender)}
                </span>
              )}
              {characterMeta.gender && characterMeta.age && (
                <span className="mx-2">|</span>
              )}
              {characterMeta.age && (
                <span>
                  {t.age || "Age"}: {characterMeta.age}
                </span>
              )}
            </div>
          )}

          {/* Species */}
          {characterMeta.species && (
            <div className="text-xs text-foreground/80">
              {t.species || "Species"}: {safeTranslate(tSpecies, characterMeta.species)}
            </div>
          )}

          {/* Personality Tags */}
          {characterMeta.personality_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {characterMeta.personality_tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-medium"
                >
                  {safeTranslate(tPersonality, tag)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Introduction */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground/90">
          {t.introduction || "Introduction"}
        </h4>
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border-l-2 border-primary/30 min-h-[4rem] max-h-[8rem] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {characterMeta.brief_introduction ? (
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {characterMeta.brief_introduction}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {t.noIntroduction || "No introduction available"}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {characterMeta.allow_remix && onRemix && (
            <Button
              variant="default"
              onClick={handleRemix}
              className="flex-1 flex items-center justify-center gap-1.5 px-2"
            >
              <Image
                src={getPublicAssetUrl(
                  "imgs/icons/anime-benefits/benefit_2.webp"
                )}
                alt="Magic wand"
                width={42}
                height={42}
                className="-m-2 shrink-0"
              />
              <span className="truncate text-xs sm:text-sm">
                {t.remixButton || "Remix It"}
              </span>
            </Button>
          )}
          <Button variant="outline" onClick={handleChat} className="flex-1">
            <Image
              src={getCreamyCharacterUrl("chat")}
              alt="Chat"
              width={16}
              height={16}
              className="mr-2"
            />
            {t.chatButton || "Chat"}
          </Button>
          <Button variant="outline" onClick={handleDetail} className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            {t.detailButton || "Detail"}
          </Button>
        </div>
      </div>
    </div>
  );
}
