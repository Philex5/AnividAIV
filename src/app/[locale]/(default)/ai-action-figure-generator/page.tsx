import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getActionFigureGeneratorPage } from "@/services/page";
import { getUserInfo } from "@/services/user";
import { ActionFigureTool } from "@/components/oc-apps/ActionFigureTool";
import { MarketingIntroduction } from "@/components/marketing/MarketingIntroduction";
import { MarketingBenefits } from "@/components/marketing/MarketingBenefits";
import { MarketingHowToUse } from "@/components/marketing/MarketingHowToUse";
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { FeatureRecommend } from "@/components/feature-recommend/FeatureRecommend";
import AppFooter from "@/components/blocks/footer/AppFooter";

/**
 * AI Action Figure Generator Page
 *
 * 为用户提供专业的 AI 手办图生成工具
 *
 * Related: docs/2-implementation/frontend/page-ai-action-figure-generator.md
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getActionFigureGeneratorPage(locale);
  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/ai-action-figure-generator`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/ai-action-figure-generator`;
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
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/ai-action-figure-generator`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/ai-action-figure-generator`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "AnividAI",
      images: [
        {
          url: "https://artworks.anividai.com/showcases/landingpage-features/feature-oc-apps.webp",
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
      images: ["https://artworks.anividai.com/showcases/landingpage-features/feature-oc-apps.webp"],
      site: process.env.NEXT_PUBLIC_TWITTER_SITE,
    },
  };
}

export default async function ActionFigureGeneratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pageData = await getActionFigureGeneratorPage(locale);

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
        <ActionFigureTool
          pageData={pageData}
          className="h-full"
          genImageId={genImageId}
          characterUuid={characterUuid && isValidUUID(characterUuid) ? characterUuid : undefined}
          isLoggedIn={true}
          initialCanUsePrivate={initialCanUsePrivate}
        />
      </div>
    );
  }

  // 如果用户未登录，显示完整的营销页面布局
  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI Action Figure Generator",
    "alternateName": pageData.metadata?.title || "AnividAI 3D Figure Maker",
    "description": pageData.metadata?.description || "Create detailed action figure designs with our professional AI tool. Transform your characters into high-quality 3D-style artwork instantly.",
    "url": `${process.env.NEXT_PUBLIC_WEB_URL}/ai-action-figure-generator`,
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to use figure generator with credit system"
    },
    "featureList": [
      "Custom Action Figure Design",
      "Studio-Grade 3D Rendering",
      "Character Consistent Models",
      "Multiple Dynamic Poses",
      "High-Resolution Export",
      "Fast AI Generation"
    ],
    "provider": {
      "@type": "Organization",
      "name": "AnividAI",
      "url": process.env.NEXT_PUBLIC_WEB_URL
    },
    "screenshot": "https://artworks.anividai.com/social/og/anividai-action-figure.webp"
  };

  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the AI action figure generator?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It is a professional tool that creates detailed 3D-style action figure artwork from your character designs or text descriptions using advanced AI technology."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use my own characters?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can use existing characters from your library or upload reference images to create custom designs."
        }
      },
      {
        "@type": "Question",
        "name": "What poses are supported?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our tool offers multiple poses, dynamic angles, and action scenes to showcase your characters in professional collectible style."
        }
      },
      {
        "@type": "Question",
        "name": "Is the quality suitable for printing?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, the AI action figure generator produces high-resolution images with professional-grade detail, ideal for digital use and physical reference."
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
        <ActionFigureTool
          pageData={pageData}
          className="h-full"
          genImageId={genImageId}
          characterUuid={characterUuid && isValidUUID(characterUuid) ? characterUuid : undefined}
          isLoggedIn={false}
          initialCanUsePrivate={false}
        />
      </section>

      {/* 第二页开始：营销组件 */}
      {/* 第2幕：介绍区域 */}
      <MarketingIntroduction
        title={pageData?.introduce?.title || "Professional AI Action Figure Generator"}
        description={pageData?.introduce?.description || "Create professional 3D collectibles with the ultimate AI-powered figure maker."}
        tagline={pageData?.introduce?.tagline || "The Best AI Tool for Character Creators"}
      />

      {/* 第3幕：Benefits - why use it */}
      <MarketingBenefits
        title={pageData.benefits?.title || "Why Choose AnividAI?"}
        subtitle={pageData.benefits?.subtitle || "Experience the most advanced 3D figure generation online"}
        benefits={pageData.benefits?.items?.map((item: any, index: number) => ({
          icon: `/imgs/icons/action-figure-benefits/benefits-${index + 1}.webp`,
          title: item.title,
          description: item.description,
        })) || []}
      />

      {/* 第4幕：HowToUseSection - 使用步骤 */}
      <MarketingHowToUse
        title={pageData.how_to_use?.title || "Create Your Figure in 4 Simple Steps"}
        subtitle={pageData.how_to_use?.subtitle || "Transform your imagination into stunning 3D artwork effortlessly"}
        steps={[
          {
            number: '01',
            title: pageData.how_to_use?.step_1_title || 'Pick a Template',
            description: pageData.how_to_use?.step_1_description || 'Choose from professionally designed poses for your character.'
          },
          {
            number: '02', 
            title: pageData.how_to_use?.step_2_title || 'Provide Reference',
            description: pageData.how_to_use?.step_2_description || 'Upload an image or pick from your OC library.'
          },
          {
            number: '03',
            title: pageData.how_to_use?.step_3_title || 'Customize Details',
            description: pageData.how_to_use?.step_3_description || 'Add accessories and effects using the prompt field.'
          },
          {
            number: '04',
            title: pageData.how_to_use?.step_4_title || 'Generate & Download',
            description: pageData.how_to_use?.step_4_description || 'Watch your creation come to life and download the high-quality render.'
          }
        ]}
      />

       {/* 特性推荐组件 */}
      <FeatureRecommend currentSlug="ai-action-figure-generator" />


      {/* 第6幕：FAQ - 常见问题 */}
      <MarketingFAQ
        title={pageData.FAQ?.title || pageData.faq?.title || "Frequently Asked Questions"}
        subtitle={pageData.FAQ?.subtitle || pageData.faq?.subtitle || "Everything you need to know about our figure generator"}
        items={pageData.FAQ?.items || pageData.faq?.items || []}
      />

      {/* 第7幕：CTA Section */}
      <MarketingCTA
        title={pageData?.call_to_action?.title || "Ready to Start Creating?"}
        description={pageData?.call_to_action?.description || "Join thousands of creators using AnividAI to build custom 3D figures."}
        buttonText={pageData?.call_to_action?.start_creating || "Get Started Now"}
      />

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
