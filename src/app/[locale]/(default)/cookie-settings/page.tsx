import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getCookieSettingsPage } from "@/services/page";
import { CookieSettingsPageClient } from "./page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  const pageData = await getCookieSettingsPage(locale);
  let canonicalUrl = `${baseUrl}/cookie-settings`;

  if (locale !== "en") {
    canonicalUrl = `${baseUrl}/${locale}/cookie-settings`;
  }

  const title =
    locale === "ja"
      ? `Cookie Settings & Consent Management | ${pageData.settingsTitle || "AnividAI"}`
      : `Cookie Settings & Consent Management | ${pageData.settingsTitle || "AnividAI"}`;
  const description =
    pageData.settingsDescription ||
    "Manage your cookie preferences and learn how we use cookies on our website.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/cookie-settings`,
        ja: `${baseUrl}/ja/cookie-settings`,
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

export default async function CookieSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pageData = await getCookieSettingsPage(locale);

  return <CookieSettingsPageClient pageData={pageData} />;
}
