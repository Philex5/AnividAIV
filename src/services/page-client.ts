import type { CommunityPage } from "@/types/pages/community";

async function getPageClient(name: string, locale: string) {
  let normalizedLocale = locale;
  if (normalizedLocale === "zh-CN") {
    normalizedLocale = "zh";
  }

  try {
    return await import(
      `@/i18n/pages/${name}/${normalizedLocale.toLowerCase()}.json`
    ).then((module) => module.default);
  } catch (error) {
    console.warn(`Failed to load ${normalizedLocale}.json, falling back to en.json`);
    return await import(`@/i18n/pages/${name}/en.json`).then(
      (module) => module.default
    );
  }
}

export async function getCommunityPageClient(
  locale: string
): Promise<CommunityPage> {
  return (await getPageClient("community", locale)) as CommunityPage;
}
