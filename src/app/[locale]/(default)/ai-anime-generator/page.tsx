import { AnimeGenerator } from "@/components/anime-generator/AnimeGenerator";
import { MarketingIntroduction } from "@/components/marketing/MarketingIntroduction";
import { MarketingBenefits } from "@/components/marketing/MarketingBenefits";
import { CharacterAnimeGallery } from "@/components/anime-page/CharacterAnimeGallery";
import { MarketingHowToUse } from "@/components/marketing/MarketingHowToUse";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ";
import { FeatureRecommend } from "@/components/feature-recommend/FeatureRecommend";
import AppFooter from "@/components/blocks/footer/AppFooter";
import { getAnimeGeneratorPage } from "@/services/page";
import { getUserInfo } from "@/services/user";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getAnimeGeneratorPage(locale);

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/ai-anime-generator`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/ai-anime-generator`;
  }

  const title = page.metadata?.title || "";
  const description = page.metadata?.description || "";
  const keywords = page.metadata?.keywords || "";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/ai-anime-generator`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/ai-anime-generator`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "AnividAI",
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

export default async function AIAnimeGeneratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);

  const getSingleParam = (
    value: string | string[] | undefined
  ): string | undefined => {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value) && value.length > 0) {
      return typeof value[0] === "string" ? value[0] : undefined;
    }
    return undefined;
  };

  // 提取 gen_image_id 参数
  const genImageId = getSingleParam(resolvedSearchParams.gen_image_id);

  // 提取 ref_image_url 参数（兼容 image_url）
  const refImageUrl =
    getSingleParam(resolvedSearchParams.ref_image_url) ||
    getSingleParam(resolvedSearchParams.image_url);

  // 提取 character_uuid 参数
  const characterUuid = getSingleParam(resolvedSearchParams.character_uuid);

  const promptFromParams = getSingleParam(resolvedSearchParams.prompt);

  const presetFromParams = getSingleParam(resolvedSearchParams.preset);

  // 验证 UUID 格式
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // 并行获取页面数据和用户信息，提升响应速度
  const [page, user] = await Promise.all([
    getAnimeGeneratorPage(locale),
    getUserInfo().catch((error) => {
      console.log("User not authenticated");
      return null;
    }),
  ]);

  const isAuthenticated = Boolean(user?.uuid);
  const initialCanUsePrivate = Boolean(
    user?.is_sub &&
      user?.sub_expired_at &&
      new Date(user.sub_expired_at) > new Date()
  );

  // 如果用户已登录，显示简化的全屏布局
  if (isAuthenticated) {
    return (
      <div className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] overflow-hidden">
        <AnimeGenerator
          pageData={page}
          className="h-full"
          genImageId={genImageId}
          refImageUrl={refImageUrl}
          characterUuid={characterUuid && isValidUUID(characterUuid) ? characterUuid : undefined}
          isLoggedIn={true}
          initialCanUsePrivate={initialCanUsePrivate}
          initialPrompt={promptFromParams}
          initialPreset={presetFromParams}
        />
      </div>
    );
  }

  // 如果用户未登录，显示完整的营销页面布局
  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI Anime Generator",
    "alternateName": page.metadata?.title || "AI Anime Generator - Create Anime Art Free!",
    "description": page.metadata?.description || "Create anime-style images with AI anime generator. Turn text prompts into art.",
    "url": `${process.env.NEXT_PUBLIC_WEB_URL}/ai-anime-generator`,
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to use with credit system"
    },
    "featureList": [
      "AI-Powered Prompt Enhancement",
      "Wide Range of Anime Art Styles",
      "Consistent Character Generation",
      "No Drawing Skills Required",
      "Efficient Batch Processing",
      "Professional Quality Output"
    ],
    "provider": {
      "@type": "Organization",
      "name": "AnividAI",
      "url": process.env.NEXT_PUBLIC_WEB_URL
    },
    "screenshot": "https://artworks.anividai.com/social/og/anividai-og.webp"
  };

  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is an AI anime generator and how does it work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An AI anime generator is a tool that uses advanced artificial intelligence to create anime-style images from text prompts."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use both platform OCs and my own descriptions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Our AI anime generator allows you to either choose from OCs created and saved on our platform, or describe your own OC in natural language."
        }
      },
      {
        "@type": "Question",
        "name": "Is your AI anime generator free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, our AI anime generator offers free trial credits so you can create anime images and AI generated anime art at no cost."
        }
      },
      {
        "@type": "Question",
        "name": "What anime art styles are available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI anime generator supports a wide range of anime art styles, including Studio Ghibli, manga, watercolor, classic anime, and digital art."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use AI generated anime images for commercial projects?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can use artwork created with our AI anime generator for commercial purposes, social media, merchandise, and personal projects."
        }
      }
    ]
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageJsonLd),
        }}
      />

      {/* 第一页：全屏工具体验 */}
      <section className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] lg:overflow-hidden">
        <AnimeGenerator
          pageData={page}
          className="h-full"
          genImageId={genImageId}
          refImageUrl={refImageUrl}
          characterUuid={characterUuid && isValidUUID(characterUuid) ? characterUuid : undefined}
          isLoggedIn={false}
          initialCanUsePrivate={false}
          initialPrompt={promptFromParams}
          initialPreset={presetFromParams}
        />
      </section>

      {/* 第二页开始：营销组件 */}
      {/* 第2幕：AI动漫生成器介绍区域 */}
      <MarketingIntroduction
        title={page?.introduce?.title || "AI Anime Generator"}
        description={page?.introduce?.description || ""}
        tagline={page?.introduce?.tagline || ""}
      />

      {/* 第3幕：CharacterAnimeGallery - 使用character生成anime的示例 */}
      <CharacterAnimeGallery pageData={page} />

      {/* 快捷链接：Create Your Own OC */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Link
              href="/oc-maker"
              className="inline-flex items-center gap-2 text-lg font-medium text-primary hover:gap-3 transition-all duration-300 group"
            >
              {page?.create_oc_quick_link?.button || "Create Your Own OC"}
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>


      {/* 第4幕：Benefits - why use ai anime generator */}
      <MarketingBenefits
        title={page?.benefits?.section_title || "Why Choose Our AI Anime Generator?"}
        subtitle={page?.benefits?.section_subtitle || "Experience the future of anime art creation with powerful AI capabilities designed for creators"}
        benefits={[
          {
            icon: "/imgs/icons/anime-benefits/benefit_1.webp",
            title: page.benefits.character_consistency.title,
            description: page.benefits.character_consistency.description,
          },
          {
            icon: "/imgs/icons/anime-benefits/benefit_2.webp",
            title: page.benefits.ai_powered.title,
            description: page.benefits.ai_powered.description,
          },
          {
            icon: "/imgs/icons/anime-benefits/benefit_3.webp",
            title: page.benefits.no_drawing.title,
            description: page.benefits.no_drawing.description,
          },
          {
            icon: "/imgs/icons/anime-benefits/benefit_4.webp",
            title: page.benefits.diverse_styles.title,
            description: page.benefits.diverse_styles.description,
          },
          {
            icon: "/imgs/icons/anime-benefits/benefit_5.webp",
            title: page.benefits.batch_processing.title,
            description: page.benefits.batch_processing.description,
          },
          {
            icon: "/imgs/icons/anime-benefits/benefit_6.webp",
            title: page.benefits.professional_quality.title,
            description: page.benefits.professional_quality.description,
          },
        ]}
      />

      {/* 第5幕：HowToUseSection - 使用步骤 */}
      <MarketingHowToUse
        title={page?.how_to_use?.title || "Create Your Anime Character in 4 Steps"}
        subtitle={page?.how_to_use?.subtitle || "Transform your imagination into stunning anime artwork"}
        steps={[
          {
            number: '01',
            title: page.how_to_use?.step_1_title || 'Describe Your Idea',
            description: page.how_to_use?.step_1_description || 'Enter your character description and creative vision. Use AI optimizer for better prompts'
          },
          {
            number: '02', 
            title: page.how_to_use?.step_2_title || 'Choose Model & Style',
            description: page.how_to_use?.step_2_description || 'Select from different AI models and diverse anime styles, each with unique advantages'
          },
          {
            number: '03',
            title: page.how_to_use?.step_3_title || 'Set Parameters',
            description: page.how_to_use?.step_3_description || 'Upload reference images, set resolution, visibility, and number of images to generate'
          },
          {
            number: '04',
            title: page.how_to_use?.step_4_title || 'Share & Download',
            description: page.how_to_use?.step_4_description || 'Download your beautiful artwork and share your creations with the community'
          }
        ]}
      />
      {/* 特性推荐组件 */}
      <FeatureRecommend currentSlug="ai-anime-generator" />


      {/* 第6幕：FAQ - 常见问题 */}
      <MarketingFAQ
        title={page.faq?.title || "Frequently Asked Questions"}
        subtitle={page.faq?.subtitle || "Everything you need to know about our AI anime generator"}
        items={page.faq?.items || []}
      />

      {/* 第7幕：CTA Section */}
      <MarketingCTA
        title={page?.call_to_action?.title || "Ready to Create Your Anime Art Work"}
        description={page?.call_to_action?.description || "Join millions of creators and realize your character creation dreams with AI technology"}
        buttonText={page?.call_to_action?.start_creating || "Start Creating Now"}
      />

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
