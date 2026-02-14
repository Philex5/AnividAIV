"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuickCreationHero } from "@/components/oc-maker/QuickCreationHero";
import { MarketingIntroduction } from "@/components/marketing/MarketingIntroduction";
import { MarketingBenefits } from "@/components/marketing/MarketingBenefits";
import { OCMakerUsagePaths } from "@/components/oc-maker/OCMakerUsagePaths";
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { OCSpotlightGallery } from "@/components/oc-maker/OCSpotlightGallery";
import { FeatureRecommend } from "@/components/feature-recommend/FeatureRecommend";
import AppFooter from "@/components/blocks/footer/AppFooter";
import type { OCMakerPage } from "@/types/pages/landing";
import { useAppContext } from "@/contexts/app";
import { OCMakerProvider } from "@/contexts/oc-maker";

interface AnimeCharacterGeneratorPageClientProps {
  pageData: OCMakerPage;
  isLoggedIn: boolean;
  isSub?: boolean;
  locale?: string;
}

export function OCMakerPageClient({
  pageData,
  isLoggedIn,
  isSub = false,
  locale = "en",
}: AnimeCharacterGeneratorPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setShowSignModal, setSignModalMessage } = useAppContext();
  const mergedSuggestionPool = useMemo(() => {
    const heroSuggestions =
      pageData?.hero?.suggestions?.pool ??
      pageData?.hero?.suggestion_pool ??
      [];
    const ideaSparkPrompts =
      pageData?.hero?.idea_sparks?.examples
        ?.map((example) => example.prompt?.trim())
        .filter((prompt): prompt is string => Boolean(prompt)) ?? [];

    return Array.from(
      new Set([...heroSuggestions, ...ideaSparkPrompts].filter(Boolean)),
    );
  }, [pageData?.hero]);

  // Redirect if user has old URL params
  useEffect(() => {
    const mode = searchParams.get("mode");
    const uuid = searchParams.get("uuid");
    const remixFrom = searchParams.get("remix_from");

    // If user is trying to edit/remix, redirect to character detail page
    if (uuid && (mode === "edit" || mode === "remix")) {
      router.replace(`/characters/${uuid}?mode=edit`);
    } else if (remixFrom) {
      router.replace(`/characters/${remixFrom}?mode=remix`);
    }
  }, [searchParams, router]);

  // Handle auth required
  const handleAuthRequired = () => {
    setSignModalMessage(
      pageData?.quick_gen?.toast?.auth_required ||
        "Please log in to generate characters",
    );
    setShowSignModal(true);
  };

  return (
    <div className="min-h-full bg-transparent">
      {/* Hero Section: Search-driven Quick Creation */}
      <section className="min-h-[calc(100svh-56px)] flex items-center justify-center">
        <OCMakerProvider
          locale={locale}
          suggestionPool={
            mergedSuggestionPool.length ? mergedSuggestionPool : undefined
          }
        >
          <QuickCreationHero
            pageData={pageData}
            onAuthRequired={handleAuthRequired}
            locale={locale}
          />
        </OCMakerProvider>
      </section>

      {/* Example Gallery */}
      <section className="py-12 border-t border-white/10">
        <div className="container mx-auto">
          <OCSpotlightGallery pageData={pageData} />
        </div>
      </section>

      {/* Marketing Content */}
      <MarketingIntroduction
        title={pageData.Introduce?.title || "Anime Character Generator"}
        description={pageData.Introduce?.description || ""}
        tagline={pageData.Introduce?.tagline || "AI-Powered Anime Character Creation"}
      />

      <MarketingBenefits
        title={pageData.benefits?.section_title || "Why Choose Our Anime Character Generator?"}
        subtitle={
          pageData.benefits?.section_subtitle ||
          "Experience the future of anime character creation with powerful AI capabilities designed for creators"
        }
        benefits={[
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_1.webp",
            title: pageData.benefits?.professional_quality?.title || "",
            description:
              pageData.benefits?.professional_quality?.description || "",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_2.webp",
            title: pageData.benefits?.diverse_styles?.title || "",
            description: pageData.benefits?.diverse_styles?.description || "",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_3.webp",
            title: pageData.benefits?.fine_details?.title || "",
            description: pageData.benefits?.fine_details?.description || "",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_4.webp",
            title: pageData.benefits?.character_ecosystem?.title || "",
            description:
              pageData.benefits?.character_ecosystem?.description || "",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_5.webp",
            title: pageData.benefits?.efficiency?.title || "",
            description: pageData.benefits?.efficiency?.description || "",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_6.webp",
            title: pageData.benefits?.rich_character_info?.title || "",
            description:
              pageData.benefits?.rich_character_info?.description || "",
          },
        ]}
      />

      <OCMakerUsagePaths
        title={pageData.how_to_use?.title || "Create Your Anime Characters"}
        subtitle={
          pageData.how_to_use?.subtitle ||
          "Two paths to bring your anime characters to life"
        }
        pathA={{
          title: pageData.how_to_use?.path_a?.title || "Path A: Quick Create",
          description: pageData.how_to_use?.path_a?.description || "",
          steps: pageData.how_to_use?.path_a?.steps || [],
        }}
        pathB={{
          title: pageData.how_to_use?.path_b?.title || "Path B: Manual Create",
          description: pageData.how_to_use?.path_b?.description || "",
          steps: pageData.how_to_use?.path_b?.steps || [],
        }}
      />

      <FeatureRecommend currentSlug="anime-character-generator" />

      <MarketingFAQ
        title={pageData.faq?.title || "Frequently Asked Questions"}
        subtitle={pageData.faq?.subtitle}
        items={pageData.faq?.items || []}
      />

      <MarketingCTA
        title={pageData.call_to_action?.title || "Ready to Create Your Anime Character"}
        description={
          pageData.call_to_action?.description ||
          "Join millions of creators and realize your anime character creation dreams"
        }
        buttonText={
          pageData.call_to_action?.start_creating || "Start Creating Now"
        }
      />
      <AppFooter />
    </div>
  );
}
