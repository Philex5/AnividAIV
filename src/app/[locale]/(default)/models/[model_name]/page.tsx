import { notFound } from "next/navigation";
import { AnimeGenerator } from "@/components/anime-generator/AnimeGenerator";
import { VideoGenerator } from "@/components/video/VideoGenerator";
import { MarketingIntroduction } from "@/components/marketing/MarketingIntroduction";
import { MarketingBenefits } from "@/components/marketing/MarketingBenefits";
import { MarketingHowToUse } from "@/components/marketing/MarketingHowToUse";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ";
import { FeatureRecommend } from "@/components/feature-recommend/FeatureRecommend";
import AppFooter from "@/components/blocks/footer/AppFooter";
import {
  getModelIdByRoute,
  getModelType,
  isValidModelRoute,
} from "@/configs/models/route-mapping";
import { getModelPage } from "@/services/page";
import { getUserInfo } from "@/services/user";
import { setRequestLocale } from "next-intl/server";
import { MODEL_ROUTE_MAP } from "@/configs/models/route-mapping";
import type { AnimeGalleryImage } from "@/lib/configs";
import { locales } from "@/i18n/locale";

export const revalidate = 3600; // Cache for 1 hour
export const dynamicParams = false; // Only allow predefined model routes

// Generate static params for all valid model routes
export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    Object.keys(MODEL_ROUTE_MAP).map((model_name) => ({
      locale,
      model_name,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; model_name: string }>;
}) {
  const { locale, model_name } = await params;
  setRequestLocale(locale);

  // Validate model route
  if (!isValidModelRoute(model_name)) {
    return {
      title: "Model Not Found",
    };
  }

  const modelId = getModelIdByRoute(model_name);
  if (!modelId) {
    return {
      title: "Model Not Found",
    };
  }

  const pageData = await getModelPage(locale, model_name);

  const title =
    pageData?.metadata?.title || `${model_name} AI Generator | AnividAI`;
  const description =
    pageData?.metadata?.description ||
    `Generate art with ${model_name} AI model on AnividAI`;

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/models/${model_name}`;
  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/models/${model_name}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/models/${model_name}`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/models/${model_name}`,
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

export default async function ModelPage({
  params,
}: {
  params: Promise<{ locale: string; model_name: string }>;
}) {
  const { locale, model_name } = await params;
  setRequestLocale(locale);

  // Validate model route
  if (!isValidModelRoute(model_name)) {
    notFound();
  }

  const modelId = getModelIdByRoute(model_name);
  if (!modelId) {
    notFound();
  }

  const modelType = getModelType(modelId);

  // Load model-specific examples
  let modelExamples: AnimeGalleryImage[] | any[] | undefined;
  try {
    if (modelType === "video") {
      const examplesData = await import(
        `@/configs/gallery/models/${model_name}-examples.json`
      );
      modelExamples = examplesData.examples || [];
    } else {
      const examplesData = await import(
        `@/configs/gallery/models/${model_name}-examples.json`
      );
      modelExamples = examplesData.examples || [];
    }
  } catch (error) {
    console.warn(`Failed to load model examples for ${model_name}:`, error);
    // Fallback to undefined, will use default examples
  }

  // Get user info and page data in parallel
  const [user, pageData] = await Promise.all([
    getUserInfo().catch(() => {
      console.log("User not authenticated");
      return null;
    }),
    getModelPage(locale, model_name),
  ]);

  // If user is logged in, show simplified fullscreen layout

  if (user) {
    const GeneratorComponent =
      modelType === "video" ? VideoGenerator : AnimeGenerator;

    return (
      <div className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] overflow-hidden">
        <GeneratorComponent
          pageData={pageData}
          className="h-full"
          initialModelId={modelId}
          isLoggedIn={true}
          examples={modelExamples}
        />
      </div>
    );
  }

  // Build JSON-LD structured data
  const modelDisplayName = model_name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Model-specific feature mappings
  const modelFeatures: Record<string, string[]> = {
    "nano-banana": [
      "Character Consistency Across Generations",
      "Multi-Image Fusion for Complex Compositions",
      "World Knowledge Integration",
      "Conversational Input Support",
      "Prompt-Based Image Editing",
      "Multiple Aspect Ratios Support",
      "Free Credits with No Credit Card Required",
      "SynthID Watermark for AI Content Transparency",
    ],
    "wan-2-5": [
      "Text-to-Video Generation",
      "Image-to-Video Conversion",
      "Multiple Quality Options",
      "Flexible Aspect Ratios",
      "High-Speed Generation",
    ],
    "z-image": [
      "Text-to-Image Generation",
      "Multiple Aspect Ratios",
      "Affordable Pricing",
      "Fast Generation Speed",
    ],
    "kling-3-0": [
      "Cinematic Text-to-Video Generation",
      "Native Audio-Visual Co-Generation",
      "Extended 15s Generation Duration",
      "Multi-Shot Cinematic Control",
      "Video & Image Character Consistency",
      "Flexible Aspect Ratios",
    ],
  };

  const defaultFeatures = [
    "AI-Powered Generation",
    "Multiple Output Formats",
    "High-Quality Results",
  ];

  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${modelDisplayName} AI Generator`,
    alternateName:
      pageData?.metadata?.title ||
      `${modelDisplayName} AI Generator | AnividAI`,
    description:
      pageData?.metadata?.description ||
      `Generate art with ${modelDisplayName} AI model`,
    url: `${process.env.NEXT_PUBLIC_WEB_URL}/models/${model_name}`,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description:
        "Free to use with credit system - get free credits through daily sign-in and sharing",
    },
    featureList: modelFeatures[model_name] || defaultFeatures,
    provider: {
      "@type": "Organization",
      name: "AnividAI",
      url: process.env.NEXT_PUBLIC_WEB_URL,
    },
    screenshot: "https://artworks.anividai.com/social/og/anividai-og.webp",
    applicationSubCategory: getModelType(modelId) === "video"
      ? "AI Video Generator"
      : "AI Image Generator",
    keywords: pageData?.metadata?.keywords || "",
  };

  const faqItems = pageData?.FAQ?.items || [];
  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems
      .slice(0, 5)
      .map((item: { question: string; answer: string }) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Structured Data */}
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

      {/* First section: Full screen generator experience */}
      <section className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] lg:overflow-hidden">
        {modelType === "video" ? (
          <VideoGenerator
            pageData={pageData}
            className="h-full"
            initialModelId={modelId}
            isLoggedIn={false}
            examples={modelExamples}
          />
        ) : (
          <AnimeGenerator
            pageData={pageData}
            className="h-full"
            initialModelId={modelId}
            isLoggedIn={false}
            examples={modelExamples}
          />
        )}
      </section>

      {/* Marketing sections */}
      {/* Model Introduction */}
      <MarketingIntroduction
        title={pageData?.Introduce?.title || `${modelDisplayName} AI Generator`}
        description={pageData?.Introduce?.description || ""}
        tagline={pageData?.Introduce?.tagline || ""}
      />

      {/* Benefits Section */}
      <MarketingBenefits
        title={pageData?.benefits?.title || `Why Choose ${modelDisplayName}?`}
        subtitle={
          pageData?.benefits?.subtitle ||
          "Experience powerful AI capabilities designed for creators"
        }
        benefits={
          pageData?.benefits?.items?.map((item: any) => ({
            icon: "",
            title: item.title,
            description: item.description,
          })) || []
        }
      />

      {/* How To Use Section */}
      <MarketingHowToUse
        title={pageData?.howToUse?.title || "Generate Art in Simple Steps"}
        subtitle={
          pageData?.howToUse?.subtitle ||
          "Transform your creative vision into stunning artwork"
        }
        steps={
          pageData?.howToUse?.steps?.map((step: any, idx: number) => ({
            number: `0${idx + 1}`,
            title: step.title,
            description: step.description,
          })) || [
            {
              number: "01",
              title: "Describe Your Vision",
              description:
                "Enter a detailed text description of the artwork you want to create",
            },
            {
              number: "02",
              title: "Choose Settings",
              description:
                "Select your preferred aspect ratio and generation parameters",
            },
            {
              number: "03",
              title: "Generate & Download",
              description:
                "Click generate and download your creation in seconds",
            },
          ]
        }
      />
       {/* Feature Recommendations */}
      <FeatureRecommend currentSlug={`models-${model_name}`} />

      {/* FAQ Section */}
      <MarketingFAQ
        title={pageData?.FAQ?.title || "Frequently Asked Questions"}
        subtitle={
          pageData?.FAQ?.subtitle ||
          "Everything you need to know about this AI model"
        }
        items={pageData?.FAQ?.items || []}
      />
      {/* CTA Section */}
      <MarketingCTA
        title={pageData?.call_to_action?.title || "Start Creating Today"}
        description={
          pageData?.call_to_action?.subtitle ||
          "Generate beautiful artwork with AI technology"
        }
        buttonText={
          pageData?.call_to_action?.button_primary || "Start Creating"
        }
      />

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
