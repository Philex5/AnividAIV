import type { MetadataRoute } from "next";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { characters, ocworlds, posts } from "@/db/schema";
import { defaultLocale, locales } from "@/i18n/locale";
import { PostStatus } from "@/models/post";

const BASE_URL = (process.env.NEXT_PUBLIC_WEB_URL || "https://anividai.com")
  .replace(/\/$/, "");

const SITEMAP_LIMIT = Number(process.env.SITEMAP_LIMIT || 5000);

const normalizePath = (path: string) => (path === "/" ? "" : path);

const withLocale = (locale: string, path: string) => {
  const normalized = normalizePath(path);
  if (locale === defaultLocale) {
    return `${BASE_URL}${normalized || "/"}`;
  }
  return `${BASE_URL}/${locale}${normalized || "/"}`;
};

const staticPaths: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/characters", changeFrequency: "daily", priority: 0.8 },
  { path: "/community", changeFrequency: "daily", priority: 0.8 },
  { path: "/oc-maker", changeFrequency: "weekly", priority: 0.9 },
  { path: "/ai-anime-generator", changeFrequency: "weekly", priority: 0.9 },
  { path: "/ai-anime-video-generator", changeFrequency: "weekly", priority: 0.9 },
  { path: "/ai-action-figure-generator", changeFrequency: "weekly", priority: 0.9 },
  { path: "/ai-sticker-generator", changeFrequency: "weekly", priority: 0.9 },
  { path: "/art-prompt-generator", changeFrequency: "weekly", priority: 0.9 },
  { path: "/anime-character-generator", changeFrequency: "weekly", priority: 0.9 },
  { path: "/chat", changeFrequency: "weekly", priority: 0.9 },
  { path: "/posts", changeFrequency: "weekly", priority: 0.7 },
  { path: "/worlds", changeFrequency: "weekly", priority: 0.7 },
  { path: "/my-creations", changeFrequency: "weekly", priority: 0.6 },
  { path: "/changelog", changeFrequency: "monthly", priority: 0.4 },
  { path: "/roadmap", changeFrequency: "monthly", priority: 0.4 },
  { path: "/privacy-policy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/terms-of-service", changeFrequency: "monthly", priority: 0.3 },
  { path: "/cookie-settings", changeFrequency: "monthly", priority: 0.3 },
  // Model landing pages (FEAT-MODEL-PAGES)
  { path: "/models/nano-banana", changeFrequency: "weekly", priority: 0.8 },
  { path: "/models/wan-2-5", changeFrequency: "weekly", priority: 0.8 },
  { path: "/models/z-image", changeFrequency: "weekly", priority: 0.8 },
  { path: "/models/kling-3-0", changeFrequency: "weekly", priority: 0.8 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [postRows, characterRows, worldRows] = await Promise.all([
    db()
      .select({
        slug: posts.slug,
        locale: posts.locale,
        updated_at: posts.updated_at,
        created_at: posts.created_at,
      })
      .from(posts)
      .where(and(eq(posts.status, PostStatus.Online), inArray(posts.locale, locales)))
      .orderBy(desc(posts.updated_at))
      .limit(SITEMAP_LIMIT),
    db()
      .select({
        uuid: characters.uuid,
        updated_at: characters.updated_at,
        created_at: characters.created_at,
      })
      .from(characters)
      .where(eq(characters.visibility_level, "public"))
      .orderBy(desc(characters.updated_at))
      .limit(SITEMAP_LIMIT),
    db()
      .select({
        uuid: ocworlds.uuid,
        updated_at: ocworlds.updated_at,
        created_at: ocworlds.created_at,
      })
      .from(ocworlds)
      .where(and(eq(ocworlds.visibility_level, "public"), eq(ocworlds.is_active, true)))
      .orderBy(desc(ocworlds.updated_at))
      .limit(SITEMAP_LIMIT),
  ]);

  const staticEntries = locales.flatMap((locale) =>
    staticPaths.map((item) => ({
      url: withLocale(locale, item.path),
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    }))
  );

  const postEntries = postRows
    .filter((row) => row.slug && row.locale)
    .map((row) => ({
      url: withLocale(row.locale as string, `/posts/${row.slug}`),
      lastModified: row.updated_at || row.created_at || new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  const characterEntries = characterRows.flatMap((row) =>
    locales.map((locale) => ({
      url: withLocale(locale, `/characters/${row.uuid}`),
      lastModified: row.updated_at || row.created_at || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  const worldEntries = worldRows.flatMap((row) =>
    locales.map((locale) => ({
      url: withLocale(locale, `/worlds/${row.uuid}`),
      lastModified: row.updated_at || row.created_at || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  return [...staticEntries, ...postEntries, ...characterEntries, ...worldEntries];
}
