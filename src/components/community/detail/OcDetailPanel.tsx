"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { GenderIcon } from "@/components/icon/gender-icon";
import type { ArtworkDetail, CommunityPage } from "@/types/pages/community";

interface OcDetailPanelProps {
  detail: ArtworkDetail;
  pageData: CommunityPage;
}

export function OcDetailPanel({ detail, pageData }: OcDetailPanelProps) {
  const traits = useMemo(() => {
    const rawTraits = (detail.meta as any)?.oc_traits;
    if (Array.isArray(rawTraits)) {
      return rawTraits.filter((item) => typeof item === "string") as string[];
    }
    return [];
  }, [detail.meta]);

  const gender = useMemo(() => {
    return (detail.meta as any)?.gender;
  }, [detail.meta]);

  const age = useMemo(() => {
    return (detail.meta as any)?.age;
  }, [detail.meta]);

  const species = useMemo(() => {
    return (detail.meta as any)?.species;
  }, [detail.meta]);

  const role = useMemo(() => {
    return (detail.meta as any)?.role;
  }, [detail.meta]);

  // 翻译功能
  const tSpecies = useTranslations("species");
  const tRole = useTranslations("role");
  const tPersonality = useTranslations("personality");

  // 安全翻译辅助函数
  const safeTranslate = useMemo(() => {
    return (translator: any, key: string): string => {
      if (typeof translator.has === "function" && !translator.has(key)) {
        return key;
      }
      try {
        const result = translator(key);
        return result;
      } catch {
        return key;
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {detail.description && (
        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">
            {pageData.detail.description}
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            {detail.description}
          </p>
        </div>
      )}

      {/* Gender | Age | Species 和 Role 信息 */}
      {(gender || age || species || role) && (
        <div className="space-y-3">
          {/* Row 1: Gender | Age | Species (no labels) */}
          {(gender || age || species) && (
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">
                {(pageData as any).detail.species || "Basic Info"}
              </p>
              <div className="text-sm leading-relaxed text-foreground/80 flex items-center gap-2">
                {gender && <GenderIcon gender={gender} className="inline-block" />}
                {(gender && age) || (gender && species) ? <span>|</span> : null}
                {age && <span>Age {age}</span>}
                {(age && species) || (gender && species && !age) ? <span>|</span> : null}
                {species && <span>{safeTranslate(tSpecies, species)}</span>}
              </div>
            </div>
          )}

          {/* Row 2: Role (with label) */}
          {role && (
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">
                Role
              </p>
              <p className="text-sm leading-relaxed text-foreground/80">
                {safeTranslate(tRole, role)}
              </p>
            </div>
          )}
        </div>
      )}

      {traits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">
            {pageData.detail.ocTraits}
          </p>
          <div className="flex flex-wrap gap-2">
            {traits.map((trait) => (
              <Badge key={trait} variant="secondary">
                {safeTranslate(tPersonality, trait)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
