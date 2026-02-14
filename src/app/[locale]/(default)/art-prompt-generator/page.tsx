import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getArtPromptGeneratorPage } from "@/services/page";
import { getUserInfo } from "@/services/user";
import { ArtPromptGeneratorPageClient } from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getArtPromptGeneratorPage(locale);

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/art-prompt-generator`;
  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/art-prompt-generator`;
  }

  const title = pageData.metadata?.title || "Art Prompt Generator";
  const description =
    pageData.metadata?.description ||
    "Generate creative AI art prompts instantly.";
  const keywords = pageData.metadata?.keywords || "art prompt generator";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/art-prompt-generator`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/art-prompt-generator`,
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
      locale,
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

export default async function ArtPromptGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pageData = await getArtPromptGeneratorPage(locale);

  let user: Awaited<ReturnType<typeof getUserInfo>> | null = null;
  try {
    user = await getUserInfo();
  } catch (error) {
    console.log("Art Prompt Generator: user not authenticated");
  }

  return (
    <ArtPromptGeneratorPageClient
      pageData={pageData}
      isLoggedIn={Boolean(user)}
    />
  );
}
