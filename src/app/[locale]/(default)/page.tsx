import { getLandingPage, getRoadmapPage } from "@/services/page";
import { getR2ImageUrl } from "@/lib/asset-loader";
import { setRequestLocale } from "next-intl/server";
import Branding from "@/components/blocks/branding";
import CTA from "@/components/blocks/cta";
import FAQ from "@/components/blocks/faq";
import HeroVideo from "@/components/blocks/hero-video";
import Feature from "@/components/blocks/features";
import UserShowcaseFlatSection from "@/components/blocks/user-showcase-flat";
import BenefitsSection from "@/components/blocks/benefits-section";
import RoadmapSection from "@/components/roadmap/RoadmapSection";
import timelineConfig from "@/configs/roadmap/timeline.json";
import { getTranslations } from "next-intl/server";
import Blog from "@/components/blocks/blog";
import { getPostsByLocale } from "@/models/post";
import { BlogItem, Blog as BlogType } from "@/types/blocks/blog";


// 启用 ISR 缓存，每小时重新验证一次
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}`;
  const t = await getTranslations();

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}`;
  }
  const title = t("metadata.title");
  const description = t("metadata.description");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/`,
      },
    },
    openGraph: {
      url: canonicalUrl,
      siteName: "AnividAI",
      logo: "https://artworks.anividai.com/assets/logo.webp",
      images: [
        {
          url: "https://artworks.anividai.com/social/og/anividai-og.webp",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://artworks.anividai.com/social/og/anividai-og.webp"],
      site: process.env.NEXT_PUBLIC_TWITTER_SITE,
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = (locale === "ja" ? "ja" : "en") as "en" | "ja";
  const postsPromise = getPostsByLocale(locale, 1, 3).catch((error) => {
    console.error("[LandingPage] Failed to load posts:", error);
    return [];
  });

  const [page, roadmapData, posts] = await Promise.all([
    getLandingPage(locale),
    getRoadmapPage(locale),
    postsPromise
  ]);

  // 构建结构化数据
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AnividAI",
    url: process.env.NEXT_PUBLIC_WEB_URL,
    description:
      page.introduce?.description ||
      "The All-in-One AI Anime Creation Studio",
    potentialAction: {
      "@type": "SearchAction",
      target: `${process.env.NEXT_PUBLIC_WEB_URL}/community?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AnividAI",
    url: process.env.NEXT_PUBLIC_WEB_URL,
    logo: "https://artworks.anividai.com/assets/logo.webp",
    sameAs: [
      "https://x.com/AnividAI",
      "https://github.com/yinkong05/Anivid-AI",
    ],
    description:
      "AnividAI is an all-in-One AI anime creation studio, providing a complete workflow from character design to high-quality images and cinematic videos.",
  };

  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AnividAI",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to start with a flexible credit system",
    },
    featureList: [
      "Character Core: OC Maker with consistent identity",
      "Visualization: Professional AI Anime Art Studio",
      "Motion: Cinematic AI Anime Video Production",
      "Connection: Character Chat with Personality Core",
      "Production: Studio Tools for Action Figures & Stickers",
    ],
  };

  const faqItems = page.faq?.items || [];
  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.slice(0, 8).map((item) => ({
      "@type": "Question",
      name: item.title || "",
      acceptedAnswer: {
        "@type": "Answer",
        text: item.description || "",
      },
    })),
  };

  // 处理 Roadmap 数据
  const roadmapTimeline = timelineConfig.timeline.map((section) => ({
    ...section,
    periodDisplay: section.period,
    statusDisplay: roadmapData.periods[section.status.replace("-", "_")] || section.status,
    phaseName: section.phase_name?.[lang],
    items: section.items.map((item) => ({
      ...item,
      title: roadmapData.items?.[item.id]?.title || item.title?.[lang] || item.id,
      desc:
        roadmapData.items?.[item.id]?.content ||
        roadmapData.items?.[item.id]?.desc ||
        item.desc?.[lang] ||
        "",
    })),
  }));

  return (
    <>
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
      />

      {/* New Video Hero */}
      <HeroVideo
        title={page.draggable_hero?.title}
        description={page.draggable_hero?.description}
        highlight_text={page.draggable_hero?.highlight_text}
      />

      {page.branding && <Branding section={page.branding} />}

      {/* Unified Rich Features Section */}
      <Feature
        title={page.feature?.title}
        description={page.feature?.description}
        features={[
          // 1. OC Maker (2x2 Top-Left)
          ...(page.feature?.items
            ?.filter(
              (i) =>
                i.id === "oc_maker" ||
                i.title?.toLowerCase().includes("oc maker"),
            )
            .map((item, index) => ({
              id: `feature-oc-${index}`,
              title: item.title || "OC Maker",
              description: item.description || "",
              icon: "assets/imgs/icons/landingpage/feature-oc-maker.webp",
              link: (item as any).cta?.url,
              ctaText: (item as any).cta?.title,
              isComingSoon: false,
              media: item.media
                ? {
                    type: item.media.type as any,
                    src: getR2ImageUrl(item.media.src),
                    poster: getR2ImageUrl(item.media.poster),
                    alt: item.media.alt,
                  }
                : undefined,
            })) || []),
          // 2. Anime Generator (1x1 Top-Right Row 1)
          ...(page.feature?.items
            ?.filter(
              (i) =>
                i.id === "ai_anime_generator" ||
                i.title?.toLowerCase().includes("anime art"),
            )
            .map((item, index) => ({
              id: `feature-gen-${index}`,
              title: "Anime Generator",
              description: item.description || "",
              icon: "assets/imgs/icons/landingpage/feature-anime-generator.webp",
              link: (item as any).cta?.url,
              ctaText: (item as any).cta?.title,
              isComingSoon: false,
              media: {
                type: "stacked-images" as any,
                images: [
                  "showcases/landingpage-features/anime_generator_showcase1.webp",
                  "showcases/landingpage-features/anime_generator_showcase2.webp",
                  "showcases/landingpage-features/anime_generator_showcase3.webp",
                ],
                aspect: "landscape" as const,
                alt: "AI Anime Generation Showcase",
              },
            })) || []),
          // 3. Anime Video (1x1 Top-Right Row 2)
          ...(page.feature?.items
            ?.filter(
              (i) =>
                i.id === "ai_video_generator" ||
                i.title?.toLowerCase().includes("video generator"),
            )
            .map((item, index) => ({
              id: `feature-video-${index}`,
              title: "Anime Video",
              description: item.description || "",
              icon: "assets/imgs/icons/landingpage/feature-anime-video.webp",
              link: (item as any).cta?.url,
              ctaText: (item as any).cta?.title,
              isComingSoon: false,
              media: item.media
                ? {
                    type: item.media.type as any,
                    src: getR2ImageUrl(item.media.src),
                    poster: getR2ImageUrl(item.media.poster),
                    alt: item.media.alt,
                  }
                : undefined,
            })) || []),
          // 4. Worlds & Lore (1x1 Bottom-Left Row 3)
          {
            id: "feature-worlds",
            title: "Worlds & Lore",
            description:
              "Define unified settings and rules to ensure narrative consistency across all your OCs, images, and videos.",
            icon: "assets/imgs/icons/landingpage/feature-worlds.webp",
            link: "/worlds",
            isComingSoon: false,
            media: {
              type: "image",
              src: getR2ImageUrl(
                "showcases/landingpage-features/world-building.webp",
              ),
            },
          },
          // 5. Studio Tools (2x2 Bottom-Right)
          ...(page.feature?.items
            ?.filter(
              (i) =>
                i.id === "oc_apps" ||
                i.title?.toLowerCase().includes("studio tools") ||
                i.title?.toLowerCase().includes("artifacts"),
            )
            .map((item, index) => ({
              id: `feature-apps-${index}`,
              title: "Studio Tools",
              description: item.description || "",
              icon: "assets/imgs/icons/landingpage/feature-oc-apps.webp",
              link: (item as any).cta?.url,
              ctaText: (item as any).cta?.title,
              isComingSoon: false,
              media: item.media
                ? {
                    type: item.media.type as any,
                    src: getR2ImageUrl(item.media.src),
                    poster: getR2ImageUrl(item.media.poster),
                    alt: item.media.alt,
                  }
                : undefined,
            })) || []),
          // 6. AI Chat (1x1 Bottom-Left Row 4)
          ...(page.feature?.items
            ?.filter(
              (i) =>
                i.id === "chat_with_oc" ||
                i.title?.toLowerCase().includes("chat"),
            )
            .map((item, index) => ({
              id: `feature-chat-${index}`,
              title: "AI Chat",
              description: item.description || "",
              icon: "assets/imgs/icons/landingpage/feature-chat.webp",
              link: (item as any).cta?.url,
              ctaText: (item as any).cta?.title,
              isComingSoon: false,
              media: item.media
                ? {
                    type: item.media.type as any,
                    src: getR2ImageUrl(item.media.src),
                    poster: getR2ImageUrl(item.media.poster),
                    alt: item.media.alt,
                  }
                : undefined,
            })) || []),
          // 7. Coming Soon 模块
          {
            id: "feature-coming-soon-voice",
            title: "Voice",
            description: "AI voice cloning and lip-sync.",
            icon: "assets/imgs/icons/landingpage/feature-voice.webp",
            isComingSoon: true,
            media: {
              type: "image",
              src: getR2ImageUrl(
                "showcases/landingpage-features/voice-spectrum.webp",
              ),
            },
          },
          {
            id: "feature-coming-soon-story",
            title: "Story",
            description: "AI-driven visual novel chronicles.",
            icon: "assets/imgs/icons/landingpage/feature-story.webp",
            isComingSoon: true,
            media: {
              type: "image",
              src: getR2ImageUrl(
                "showcases/landingpage-features/story-scroll.webp",
              ),
            },
          },
        ]}
      />

      {/* User Showcase Section - between Feature and Benefits */}
      {page.user_showcase &&
        page.user_showcase.featured_artworks.length > 0 && (
          <UserShowcaseFlatSection
            config={page.user_showcase}
            locale={locale}
          />
        )}

      {/* Benefits Section */}
      {page.benefit && <BenefitsSection section={page.benefit} />}

      {/* Roadmap Section */}
      <RoadmapSection 
        title={roadmapData.hero?.title}
        subtitle={roadmapData.hero?.subtitle}
        timeline={roadmapTimeline}
      />

      {/* Blog Section */}
      {posts && posts.length > 0 && (
        <Blog
          blog={{
            title: page.blog?.title || "Latest from our studio",
            description: page.blog?.description || "",
            items: posts as unknown as BlogItem[],
            read_more_text: page.blog?.read_more_text,
          }}
        />
      )}

      {page.faq && <FAQ section={page.faq} />}
      {page.cta && <CTA section={page.cta} />}
    </>
  );
}
