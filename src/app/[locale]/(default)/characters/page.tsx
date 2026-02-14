import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getCharactersPage } from "@/services/page";
import CharactersPageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getCharactersPage(locale);

  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://anividai.com";
  const canonical =
    locale === "en" ? `${baseUrl}/characters` : `${baseUrl}/${locale}/characters`;

  const title = pageData.title;
  const description = pageData.subtitle;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: `${baseUrl}/characters`,
        ja: `${baseUrl}/ja/characters`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "AnividAI",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: process.env.NEXT_PUBLIC_TWITTER_SITE,
    },
  };
}

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const pageData = await getCharactersPage(locale);

  return <CharactersPageClient pageData={pageData} />;
}
