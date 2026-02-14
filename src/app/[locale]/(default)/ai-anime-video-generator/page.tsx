import { setRequestLocale } from "next-intl/server";
import { getUserInfo } from "@/services/user";
import { VideoGeneratorWrapper } from "@/components/video/VideoGeneratorWrapper";
import { MarketingIntroduction } from "@/components/marketing/MarketingIntroduction";
import { MarketingBenefits } from "@/components/marketing/MarketingBenefits";
import { MarketingHowToUse } from "@/components/marketing/MarketingHowToUse";
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { FeatureRecommend } from "@/components/feature-recommend/FeatureRecommend";
import AppFooter from "@/components/blocks/footer/AppFooter";
import { getVideoGeneratorPage } from "@/services/page";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getVideoGeneratorPage(locale);

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/ai-anime-video-generator`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/ai-anime-video-generator`;
  }

  const title = page.metadata?.title || "AI Anime Video Generator | AnividAI";
  const description =
    page.metadata?.description || "Create stunning anime videos with AI";
  const keywords = page.metadata?.keywords || "";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/ai-anime-video-generator`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/ai-anime-video-generator`,
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

export default async function AnimeVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);

  // 提取 gen_video_id 参数
  const genVideoId =
    typeof resolvedSearchParams.gen_video_id === "string"
      ? resolvedSearchParams.gen_video_id
      : undefined;

  // 提取 character_uuid 参数
  const characterUuid =
    typeof resolvedSearchParams.character_uuid === "string"
      ? resolvedSearchParams.character_uuid
      : undefined;

  // 提取 ref_image_url 参数（兼容 image_url）
  const refImageUrl =
    typeof resolvedSearchParams.ref_image_url === "string"
      ? resolvedSearchParams.ref_image_url
      : typeof resolvedSearchParams.image_url === "string"
        ? resolvedSearchParams.image_url
      : undefined;

  // 验证 UUID 格式
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  let user: any = null;
  try {
    user = await getUserInfo();
  } catch {}

  const initialCanUsePrivate = Boolean(
    user?.is_sub &&
      user?.sub_expired_at &&
      new Date(user.sub_expired_at) > new Date()
  );

  const pageData = await getVideoGeneratorPage(locale);

  // 如果用户已登录，显示简化的全屏布局
  if (user) {
    return (
      <div className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] overflow-hidden">
        <VideoGeneratorWrapper
          pageData={pageData}
          genVideoId={genVideoId}
          characterUuid={
            characterUuid && isValidUUID(characterUuid)
              ? characterUuid
              : undefined
          }
          refImageUrl={refImageUrl}
          isLoggedIn={true}
          initialCanUsePrivate={initialCanUsePrivate}
          className="h-full"
        />
      </div>
    );
  }

  // 如果用户未登录，显示完整的营销页面布局
  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AI Anime Video Generator",
    alternateName: pageData.metadata?.title || "AI Anime Video Generator",
    description:
      pageData.metadata?.description ||
      "Create stunning anime videos with AI. Transform your ideas into high-quality anime videos.",
    url: `${process.env.NEXT_PUBLIC_WEB_URL}/ai-anime-video-generator`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to use with credit system",
    },
    featureList: [
      "AI-Powered Video Generation",
      "Text-to-Video Animation",
      "Multiple Anime Art Styles",
      "High-Quality Output",
      "Fast Rendering",
      "Commercial Use Allowed",
    ],
    provider: {
      "@type": "Organization",
      name: "AnividAI",
      url: process.env.NEXT_PUBLIC_WEB_URL,
    },
    screenshot: "https://artworks.anividai.com/social/og/anividai-og.webp",
  };

  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (pageData.faq?.items || []).map(
      (item: { question?: string; answer?: string }) => ({
        "@type": "Question",
        name: item.question || "",
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer || "",
        },
      }),
    ),
  };

  // Breadcrumb 结构化数据
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: process.env.NEXT_PUBLIC_WEB_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageData.metadata?.title || "AI Anime Video Generator",
        item:
          locale === "en"
            ? `${process.env.NEXT_PUBLIC_WEB_URL}/ai-anime-video-generator`
            : `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/ai-anime-video-generator`,
      },
    ],
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
      {/* Breadcrumb 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      {/* 第一页：全屏生成器体验 - 使用客户端包装组件优化LCP */}
      <section className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] lg:overflow-hidden">
        <VideoGeneratorWrapper
          pageData={pageData}
          genVideoId={genVideoId}
          characterUuid={
            characterUuid && isValidUUID(characterUuid)
              ? characterUuid
              : undefined
          }
          refImageUrl={refImageUrl}
          isLoggedIn={false}
          initialCanUsePrivate={false}
          className="h-full"
        />
      </section>

      {/* 第二页开始：营销组件 */}
      {/* 产品介绍 */}
      <MarketingIntroduction
        title={pageData?.introduce?.title || "AI Anime Video Generator"}
        description={pageData?.introduce?.description || ""}
        tagline={pageData?.introduce?.tagline || ""}
      />

      <MarketingBenefits
        title={pageData.benefits?.title || "Why Choose Our AI Anime Video Generator?"}
        subtitle={pageData.benefits?.subtitle || "Experience the future of anime video creation with powerful AI capabilities"}
        benefits={pageData.benefits?.items?.map((item: any, index: number) => ({
          icon: `/imgs/icons/video-benefits/benefits-${index + 1}.webp`,
          title: item.title,
          description: item.description,
        })) || []}
      />

      {/* 使用步骤 */}
      <MarketingHowToUse
        title={
          pageData?.how_to_use?.title ||
          "Create Your Anime Video in 4 Simple Steps"
        }
        subtitle={
          pageData?.how_to_use?.subtitle ||
          "Transform your ideas into dynamic anime videos with our intuitive AI anime video generator"
        }
        steps={[
          {
            number: "01",
            title: pageData.how_to_use?.step_1_title || "Describe Your Scene",
            description:
              pageData.how_to_use?.step_1_description ||
              "Enter your video description and creative vision",
          },
          {
            number: "02",
            title: pageData.how_to_use?.step_2_title || "Choose Your Character",
            description:
              pageData.how_to_use?.step_2_description ||
              "Select your OC to feature in the video",
          },
          {
            number: "03",
            title: pageData.how_to_use?.step_3_title || "Set Video Parameters",
            description:
              pageData.how_to_use?.step_3_description ||
              "Choose duration, ratio, resolution, and camera motion",
          },
          {
            number: "04",
            title: pageData.how_to_use?.step_4_title || "Generate & Download",
            description:
              pageData.how_to_use?.step_4_description ||
              "Watch your video come to life and download in HD",
          },
        ]}
      />
      
      {/* 特性推荐组件 */}
      <FeatureRecommend currentSlug="ai-anime-video-generator" />


      {/* 常见问题 */}
      <MarketingFAQ
        title={pageData.faq?.title || "Frequently Asked Questions"}
        subtitle={
          pageData.faq?.subtitle ||
          "Everything you need to know about our AI anime video generator"
        }
        items={pageData.faq?.items || []}
      />

      {/* 行动召唤 */}
      <MarketingCTA
        title={
          pageData?.call_to_action?.title || "Ready to Create Your Anime Video"
        }
        description={
          pageData?.call_to_action?.description ||
          "Join millions of creators and realize your anime dreams"
        }
        buttonText={
          pageData?.call_to_action?.start_creating || "Start Creating Now"
        }
      />

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
