import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getAnimeCharacterGeneratorPage } from "@/services/page";
import { getUserInfo } from "@/services/user";
import { OCMakerPageClient } from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getAnimeCharacterGeneratorPage(locale);
  let baseUrl = `${process.env.NEXT_PUBLIC_WEB_URL}`;

  if (locale !== "en") {
    baseUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}`;
  }
  const canonicalUrl = `${baseUrl}/anime-character-generator`;

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
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/anime-character-generator`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/anime-character-generator`,
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

export default async function AnimeCharacterGeneratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pageData = await getAnimeCharacterGeneratorPage(locale);
  let baseUrl = `${process.env.NEXT_PUBLIC_WEB_URL}`;

  if (locale !== "en") {
    baseUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}`;
  }
  const canonicalUrl = `${baseUrl}/anime-character-generator`;
  const structuredTitle =
    pageData.metadata?.title || "Anime Character Generator on AnividAI | Create Anime Characters";
  const structuredDescription =
    pageData.metadata?.description ||
    pageData.Introduce?.description ||
    "Create unique anime characters with AnividAI's Anime Character Generator.";

  // Check user authentication status
  let user;
  try {
    user = await getUserInfo();
  } catch (error) {
    console.log("User not authenticated");
  }

  // Structured data for SEO
  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": structuredTitle,
    "alternateName":
      pageData.Introduce?.tagline || pageData.metadata?.title || "Anime Character Generator",
    "description": structuredDescription,
    "url": canonicalUrl,
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      pageData.benefits?.professional_quality?.title,
      pageData.benefits?.diverse_styles?.title,
      pageData.benefits?.fine_details?.title,
      pageData.benefits?.character_ecosystem?.title,
      pageData.benefits?.efficiency?.title,
      pageData.benefits?.rich_character_info?.title,
    ].filter((item): item is string => Boolean(item)),
    "provider": {
      "@type": "Organization",
      "name": "AnividAI",
      "url": process.env.NEXT_PUBLIC_WEB_URL
    },
    "screenshot": "https://artworks.anividai.com/social/og/anividai-oc.webp"
  };

  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": (pageData.faq?.items || []).map((item) => ({
      "@type": "Question",
      "name": item.question || "",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer || "",
      },
    })),
  };

  return (
    <div className="min-h-full">
      {/* Structured data */}
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

      {/* Client component */}
      <OCMakerPageClient
        pageData={pageData}
        isLoggedIn={!!user}
        isSub={user?.is_sub || false}
        locale={locale}
      />
    </div>
  );
}
