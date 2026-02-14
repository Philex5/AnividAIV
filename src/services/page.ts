import "server-only";
import { unstable_cache } from "next/cache";
import {
  LandingPage,
  PricingPage,
  ShowcasePage,
  AnimeGeneratorPage,
  OCMakerPage,
  CharacterDetailPage,
} from "@/types/pages/landing";
import { CommunityPage } from "@/types/pages/community";
import { ArtPromptGeneratorPage } from "@/types/pages/art-prompt-generator";
import { WorldPage } from "@/types/pages/world";

// 缓存配置 - 使用 revalidateTag 进行高效缓存管理
const getPageCached = unstable_cache(
  async (name: string, locale: string) => {
    try {
      if (locale === "zh-CN") {
        locale = "zh";
      }

      return await import(
        `@/i18n/pages/${name}/${locale.toLowerCase()}.json`
      ).then((module) => module.default);
    } catch (error) {
      console.warn(`Failed to load ${locale}.json, falling back to en.json`);

      return await import(`@/i18n/pages/${name}/en.json`).then(
        (module) => module.default
      );
    }
  },
  // 缓存键前缀
  ["page-data-cache"],
  {
    // 缓存时间：1小时，与 ISR 保持一致
    revalidate: 3600,
    // 标签，用于精确失效
    tags: ["page-data"],
  }
);

export async function getLandingPage(locale: string): Promise<LandingPage> {
  return (await getPage("landing", locale)) as LandingPage;
}

export async function getPricingPage(locale: string): Promise<PricingPage> {
  return (await getPage("pricing", locale)) as PricingPage;
}

export async function getShowcasePage(locale: string): Promise<ShowcasePage> {
  return (await getPage("showcase", locale)) as ShowcasePage;
}

export async function getAnimeGeneratorPage(locale: string): Promise<AnimeGeneratorPage> {
  return (await getPage("anime-generator", locale)) as AnimeGeneratorPage;
}

export async function getArtPromptGeneratorPage(locale: string): Promise<ArtPromptGeneratorPage> {
  return (await getPage("art-prompt-generator", locale)) as ArtPromptGeneratorPage;
}

export async function getVideoGeneratorPage(locale: string): Promise<AnimeGeneratorPage> {
  return (await getPage("ai-anime-video-generator", locale)) as AnimeGeneratorPage;
}

export async function getOCMakerPage(locale: string): Promise<OCMakerPage> {
  return (await getPage("oc-maker", locale)) as OCMakerPage;
}

export async function getAnimeCharacterGeneratorPage(locale: string): Promise<OCMakerPage> {
  return (await getPage("anime-character-generator", locale)) as OCMakerPage;
}

export async function getCharacterDetailPage(locale: string): Promise<CharacterDetailPage> {
  return (await getPage("character-detail", locale)) as CharacterDetailPage;
}

export async function getCommunityPage(locale: string): Promise<CommunityPage> {
  return (await getPage("community", locale)) as CommunityPage;
}

export async function getWorldPage(locale: string): Promise<WorldPage> {
  return (await getPage("world", locale)) as WorldPage;
}

export async function getMyCreationsPage(locale: string): Promise<any> {
  return (await getPage("my-creations", locale)) as any;
}

// Home 页面：页面级文案配置
export async function getHomePage(locale: string): Promise<any> {
  return (await getPage("home", locale)) as any;
}

export async function getChatWithCharacterPage(locale: string): Promise<any> {
  return (await getPage("chat", locale)) as any;
}

// User Center 页面：页面级文案配置
export async function getUserCenterPage(locale: string): Promise<any> {
  return (await getPage("user-center", locale)) as any;
}

// Roadmap 页面：页面级文案配置
export async function getRoadmapPage(locale: string): Promise<any> {
  return (await getPage("roadmap", locale)) as any;
}

// User Profile 页面：页面级文案配置
export async function getUserProfilePage(locale: string): Promise<any> {
  return (await getPage("user-profile", locale)) as any;
}

// Payment Success 页面：页面级文案配置
export async function getPaymentSuccessPage(locale: string): Promise<any> {
  return (await getPage("payment_success", locale)) as any;
}

// Action Figure Generator 页面：页面级文案配置
export async function getActionFigureGeneratorPage(locale: string): Promise<any> {
  return (await getPage("ai-action-figure-generator", locale)) as any;
}

// Sticker Generator 页面：页面级文案配置
export async function getStickerGeneratorPage(locale: string): Promise<any> {
  return (await getPage("ai-sticker-generator", locale)) as any;
}

// Model Landing Pages：页面级文案配置
export async function getModelPage(locale: string, modelName: string): Promise<any> {
  return (await getPage(`models/${modelName}`, locale)) as any;
}


// Cookie Settings 页面：页面级文案配置
export async function getCookieSettingsPage(locale: string): Promise<any> {
  return (await getPage("legal", locale)) as any;
}

// Characters 页面：页面级文案配置
export async function getCharactersPage(locale: string): Promise<any> {
  return (await getPage("characters", locale)) as any;
}

export async function getPage(
  name: string,
  locale: string
): Promise<
  | LandingPage
  | PricingPage
  | ShowcasePage
  | AnimeGeneratorPage
  | OCMakerPage
  | CharacterDetailPage
  | WorldPage
  | CommunityPage
  | ArtPromptGeneratorPage
> {
  // 使用缓存版本，提高数据读取速度
  return await getPageCached(name, locale);
}
