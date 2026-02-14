import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getStickerGeneratorPage } from "@/services/page";
import { getUserInfo } from "@/services/user";
import { StickerTool } from "@/components/oc-apps/StickerTool";
import { MarketingIntroduction } from "@/components/marketing/MarketingIntroduction";
import { MarketingBenefits } from "@/components/marketing/MarketingBenefits";
import { MarketingHowToUse } from "@/components/marketing/MarketingHowToUse";
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { FeatureRecommend } from "@/components/feature-recommend/FeatureRecommend";
import AppFooter from "@/components/blocks/footer/AppFooter";

/**
 * AI Sticker Generator Page
 *
 * 为用户提供专业的 AI 贴纸生成工具
 *
 * 完全复用 ActionFigureGeneratorPage 的布局和结构
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getStickerGeneratorPage(locale);
  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/ai-sticker-generator`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/ai-sticker-generator`;
  }

  const title = pageData.metadata?.title || "";
  const description = pageData.metadata?.description || "";
  const keywords = pageData.metadata?.keywords || "";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/ai-sticker-generator`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/ai-sticker-generator`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "AnividAI",
      images: [
        {
          url: "https://artworks.anividai.com/showcases/landingpage-features/sticker-1.webp",
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
      images: ["https://artworks.anividai.com/showcases/landingpage-features/sticker-1.webp"],
      site: process.env.NEXT_PUBLIC_TWITTER_SITE,
    },
  };
}

export default async function StickerGeneratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pageData = await getStickerGeneratorPage(locale);

  // Extract gen_image_id parameter
  const resolvedSearchParams = await searchParams;
  const genImageId =
    typeof resolvedSearchParams.gen_image_id === "string"
      ? resolvedSearchParams.gen_image_id
      : undefined;

  // 提取 character_uuid 参数
  const characterUuid =
    typeof resolvedSearchParams.character_uuid === "string"
      ? resolvedSearchParams.character_uuid
      : undefined;

  // 提取 is_nine_grid 参数
  const isNineGrid =
    typeof resolvedSearchParams.is_nine_grid === "string" &&
    resolvedSearchParams.is_nine_grid === "true";

  // 验证 UUID 格式
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // 检查用户登录状态
  let user;
  try {
    user = await getUserInfo();
  } catch (error) {
    console.log("User not authenticated");
  }

  const initialCanUsePrivate = Boolean(
    user?.is_sub &&
      user?.sub_expired_at &&
      new Date(user.sub_expired_at) > new Date()
  );

  // 如果用户已登录，显示简化的全屏布局
  if (user) {
    return (
      <div className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] overflow-hidden">
        <StickerTool
          pageData={pageData}
          className="h-full"
          genImageId={genImageId}
          characterUuid={characterUuid && isValidUUID(characterUuid) ? characterUuid : undefined}
          isLoggedIn={true}
          initialCanUsePrivate={initialCanUsePrivate}
          isNineGrid={isNineGrid}
        />
      </div>
    );
  }

  // 如果用户未登录，显示完整的营销页面布局（含结构化数据）
  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI Sticker Generator",
    "alternateName": pageData.metadata?.title || "AnividAI Sticker Maker - Create Custom Anime Stickers",
    "description": pageData.metadata?.description || "Create adorable anime stickers instantly with our professional AI tool. Transform OCs and photos into custom stickers for Discord and WhatsApp.",
    "url": `${process.env.NEXT_PUBLIC_WEB_URL}/ai-sticker-generator`,
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to use sticker maker with credit system"
    },
    "featureList": [
      "Character Consistent Stickers",
      "Multiple Anime Styles",
      "Transparent Background Support",
      "High-Resolution PNG Export",
      "OC to Sticker Transformation",
      "Batch Generation Mode"
    ],
    "provider": {
      "@type": "Organization",
      "name": "AnividAI",
      "url": process.env.NEXT_PUBLIC_WEB_URL
    },
    "screenshot": "https://artworks.anividai.com/social/og/anividai-og.webp"
  };

  const faqItems = pageData.FAQ?.items || [];
  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.slice(0, 5).map((item: { question: string; answer: string }) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  // 面包屑导航结构化数据
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": process.env.NEXT_PUBLIC_WEB_URL
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Sticker Maker",
        "item": `${process.env.NEXT_PUBLIC_WEB_URL}/ai-sticker-generator`
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      {/* 第一页：全屏工具体验 */}
      <section className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] lg:overflow-hidden">
        <StickerTool
          pageData={pageData}
          className="h-full"
          genImageId={genImageId}
          characterUuid={characterUuid && isValidUUID(characterUuid) ? characterUuid : undefined}
          isLoggedIn={false}
          initialCanUsePrivate={false}
          isNineGrid={isNineGrid}
        />
      </section>

      {/* 第二页开始：营销组件 */}
      {/* 第2幕：介绍区域 */}
      <MarketingIntroduction
        title={pageData?.Introduce?.title || "Professional Anime Sticker Maker"}
        description={pageData?.Introduce?.description || "Transform your OCs and photos into high-quality stickers with our advanced AI tool."}
        tagline={pageData?.Introduce?.tagline || "The Ultimate Tool for Custom Anime Stickers"}
      />

      {/* 第3幕：Benefits - why use it */}
      <MarketingBenefits
        title={pageData.benefits?.title || "Why Choose AnividAI?"}
        subtitle={pageData.benefits?.subtitle || "Experience the most advanced sticker generation online"}
        benefits={pageData.benefits?.items?.map((item: any, index: number) => ({
          icon: `/imgs/icons/sticker-benefits/benefits-${index + 1}.webp`,
          title: item.title,
          description: item.description,
        })) || []}
      />

      {/* 第4幕：HowToUseSection - 使用步骤 */}
      <MarketingHowToUse
        title={pageData.howToUse?.title || "Create Stickers in 4 Simple Steps"}
        subtitle={pageData.howToUse?.subtitle || "Transform your imagination into adorable stickers effortlessly"}
        steps={pageData.howToUse?.steps?.map((step: any, idx: number) => ({
          number: `0${idx + 1}`,
          title: step.title,
          description: step.description
        })) || [
          {
            number: '01',
            title: 'Select a Style',
            description: 'Choose from unique templates like Chibi or Kawaii.'
          },
          {
            number: '02',
            title: 'Provide Reference',
            description: 'Upload an image or select an OC to guide the AI.'
          },
          {
            number: '03',
            title: 'Customize',
            description: 'Add expressions or accessories to perfect your design.'
          },
          {
            number: '04',
            title: 'Generate & Download',
            description: 'Watch your creation come to life and download your high-quality PNG.'
          }
        ]}
      />
      
      {/* 特性推荐组件 */}
      <FeatureRecommend currentSlug="ai-sticker-generator" />


      {/* 第6幕：FAQ - 常见问题 */}
      <MarketingFAQ
        title={pageData.FAQ?.title || "Frequently Asked Questions"}
        subtitle={pageData.FAQ?.subtitle || "Everything you need to know about our sticker maker"}
        items={pageData.FAQ?.items || []}
      />

      {/* 第7幕：CTA Section */}
      <MarketingCTA
        title={pageData?.call_to_action?.title || "Ready to Start Creating?"}
        description={pageData?.call_to_action?.subtitle || "Join thousands of creators making custom anime stickers today."}
        buttonText={pageData?.call_to_action?.button_primary || "Get Started Now"}
      />

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
