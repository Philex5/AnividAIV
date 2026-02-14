import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { getPage } from "@/services/page";
import ChangelogPageClient from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = (await getPage("changelog", locale)) as any;
  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/changelog` : `${baseUrl}/${locale}/changelog`;

  const title = pageData?.seo?.title || pageData?.title || "Product Changelog";
  const description =
    pageData?.seo?.description ||
    pageData?.description ||
    "Track all version updates, new features, improvements, and bug fixes for AnividAI.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/changelog`,
        ja: `${baseUrl}/ja/changelog`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
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

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const pageData = (await getPage("changelog", locale)) as any;

  return <ChangelogPageClient pageData={pageData} />;
}

