import { setRequestLocale } from "next-intl/server";
import RoadmapSection from "@/components/roadmap/RoadmapSection";
import timelineConfig from "@/configs/roadmap/timeline.json";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang = (locale === "ja" ? "ja" : "en") as "en" | "ja";
  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/roadmap` : `${baseUrl}/${locale}/roadmap`;
  const title = timelineConfig.hero.title[lang] || "Roadmap | AnividAI";
  const description =
    timelineConfig.hero.subtitle[lang] || "Roadmap";
  
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/roadmap`,
        ja: `${baseUrl}/ja/roadmap`,
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

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = (locale === "ja" ? "ja" : "en") as "en" | "ja";

  // 将配置与直接从 timelineConfig 获取的翻译结合
  const timeline = timelineConfig.timeline.map((section: any) => ({
    ...section,
    periodDisplay: section.period,
    statusDisplay: timelineConfig.status_labels[section.status as keyof typeof timelineConfig.status_labels]?.[lang] || section.status,
    phaseName: section.phase_name[lang],
    items: section.items.map((item: any) => ({
      ...item,
      title: item.title[lang] || item.id,
      desc: item.desc[lang] || "",
      status: item.status,
    })),
  }));

  return (
    <div className="min-h-screen pt-1 md:pt-3">
      <RoadmapSection 
        title={timelineConfig.hero.title[lang]}
        subtitle={timelineConfig.hero.subtitle[lang]}
        timeline={timeline}
        showFullLink={false}
      />
    </div>
  );
}
