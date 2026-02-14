import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCharacterByUuid, type Character as CharacterModel } from "@/models/character";
import { findUserByUuid } from "@/models/user";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { getUserInfo } from "@/services/user";
import { getCharacterDetailPage } from "@/services/page";
import { getUserInteractionState } from "@/services/user-interaction";
import { getCharacterCreationsByType } from "@/services/character-creations";
import { CharacterDetailClient } from "@/components/character-detail/CharacterDetailClient";
import { parseCharacterModules } from "@/types/oc";
import { findworldByUuid } from "@/models/oc-world";
import { toImageUrl } from "@/lib/r2-utils";
import Crumb from "@/components/blocks/crumb";
import { locales } from "@/i18n/locale";

interface CharacterDetailPageProps {
  params: Promise<{
    locale: string;
    uuid: string;
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; uuid: string }>;
}): Promise<Metadata> {
  const { locale, uuid } = await params;
  const pageData = await getCharacterDetailPage(locale);

  let character: CharacterModel | null = null;
  try {
    character = (await findCharacterByUuid(uuid)) ?? null;
  } catch (error) {
    character = null;
  }

  const displayName =
    character?.name || pageData?.breadcrumb?.characters || "AnividAI";

  const seoVars = buildSeoVariables({
    character,
    pageData,
  });

  const applyName = (template?: string | null) =>
    template ? applyTemplate(template, seoVars) : undefined;

  const title = applyName(pageData?.metadata?.title) || displayName;
  const description = applyName(pageData?.metadata?.description);
  const fallbackDescription =
    applyName(pageData?.metadata?.fallback_description) ||
    "Explore this character profile on AnividAI.";
  const metaDescription = normalizeMetaText(
    description || fallbackDescription || title
  );
  const keywords = buildKeywords({
    name: character?.name,
    role: character?.role,
    species: character?.species,
    tags: normalizeStringArray(character?.tags),
    personalityTags: normalizeStringArray(character?.personality_tags),
    worldName: seoVars.world,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || undefined;

  const storageDomain =
    process.env.NEXT_PUBLIC_STORAGE_DOMAIN || process.env.STORAGE_DOMAIN;

  const path =
    locale && locale !== "en"
      ? `/${locale}/characters/${uuid}`
      : `/characters/${uuid}`;
  const canonicalUrl = baseUrl ? `${baseUrl}${path}` : undefined;
  const languageAlternates =
    baseUrl && locales?.length
      ? locales.reduce<Record<string, string>>((acc, value) => {
          const localePath =
            value !== "en" ? `/${value}/characters/${uuid}` : `/characters/${uuid}`;
          acc[value] = `${baseUrl}${localePath}`;
          return acc;
        }, {})
      : undefined;

  // Use the new OG Share Card API
  const ogImageUrl = baseUrl
    ? `${baseUrl}/api/og/character/${uuid}?locale=${locale}`
    : `/api/og/character/${uuid}?locale=${locale}`;
  const isPublic = character?.visibility_level === "public";

  const metadata: Metadata = {
    title,
    description: metaDescription,
    ...(keywords.length ? { keywords } : {}),
    ...(canonicalUrl
      ? {
          alternates: {
            canonical: canonicalUrl,
            ...(languageAlternates ? { languages: languageAlternates } : {}),
          },
        }
      : {}),
    robots: isPublic
      ? undefined
      : {
          index: false,
          follow: false,
          noarchive: true,
          nosnippet: true,
        },
    openGraph: {
      title,
      description: metaDescription,
      url: canonicalUrl,
      siteName: "AnividAI",
      images: [
        {
          url: ogImageUrl,
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
      description: metaDescription,
      images: [ogImageUrl],
      site: process.env.NEXT_PUBLIC_TWITTER_SITE,
    },
  };

  return metadata;
}

export default async function CharacterDetailPage({
  params,
}: CharacterDetailPageProps) {
  const { locale, uuid } = await params;

  // 加载页面级国际化配置
  const pageData = await getCharacterDetailPage(locale);

  // 获取角色数据
  const character = await findCharacterByUuid(uuid);

  if (!character) {
    notFound();
  }

  // 获取当前用户信息
  const user = await getUserInfo();
  const isOwner = user ? user.uuid === character.user_uuid : false;
  const isSub = user?.is_sub || false;

  // 权限验证：非public角色仅所有者可见
  if (character.visibility_level !== "public" && !isOwner) {
    notFound();
  }

  // 获取用户交互状态
  let userHasLiked = false;
  let userHasFavorited = false;

  if (user && character.uuid) {
    try {
      const interactionState = await getUserInteractionState(
        user.uuid,
        character.uuid,
        "character"
      );

      userHasLiked = interactionState.hasLiked;
      userHasFavorited = interactionState.hasFavorited;
    } catch (error) {
      console.error("Failed to load interaction state:", error);
    }
  }

  const resolvedModulesInput = await resolveGalleryModules(character.modules);
  const modules = parseCharacterModules(resolvedModulesInput);

  const worldUuid =
    typeof character.world_uuid === "string" ? character.world_uuid : null;
  const worldRecord = worldUuid ? await findworldByUuid(worldUuid) : null;

  // Fetch creator info
  const creator = character.user_uuid ? await findUserByUuid(character.user_uuid) : null;

  const serializedCharacter = serializeCharacter(character);

  const initialCreations = await getCharacterCreationsByType({
    characterUuid: character.uuid,
    isOwner,
    page: 1,
    limit: 20,
  });

  // 加载avatar和profile image的实际URL (通过UUID)
  let avatarImageUrl: string | undefined =
    character.avatar_generation_image_uuid || undefined;
  let profileImageUrl: string | undefined =
    character.profile_generation_image_uuid || undefined;

  if (character.avatar_generation_image_uuid) {
    try {
      const avatarImage = await findGenerationImageByUuid(
        character.avatar_generation_image_uuid
      );
      if (avatarImage?.image_url) {
        avatarImageUrl =
          isOwner && avatarImage.uuid
            ? `/api/download/image/${avatarImage.uuid}`
            : toImageUrl(avatarImage.image_url);
      }
    } catch (error) {
      console.error("Failed to load avatar image:", error);
    }
  }

  if (character.profile_generation_image_uuid) {
    try {
      const profileImage = await findGenerationImageByUuid(
        character.profile_generation_image_uuid
      );
      if (profileImage?.image_url) {
        profileImageUrl =
          isOwner && profileImage.uuid
            ? `/api/download/image/${profileImage.uuid}`
            : toImageUrl(profileImage.image_url);
      }
    } catch (error) {
      console.error("Failed to load profile image:", error);
    }
  }

  // Build breadcrumb items
  const breadcrumbItems = [
    {
      title: pageData.breadcrumb?.home || "Home",
      url: buildLocalizedPath(locale, "/"),
    },
    {
      title: pageData.breadcrumb?.characters || "Characters",
      url: buildLocalizedPath(locale, "/characters"),
    },
    {
      title: character.name,
      url: buildLocalizedPath(locale, `/characters/${character.uuid}`),
      is_active: true,
    },
  ];

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || undefined;
  const canonicalPath = buildLocalizedPath(locale, `/characters/${character.uuid}`);
  const canonicalUrl = baseUrl ? `${baseUrl}${canonicalPath}` : undefined;
  const primaryImageUrl = resolveAbsoluteUrl(
    baseUrl,
    avatarImageUrl || profileImageUrl
  );
  const ogImageUrl = baseUrl
    ? `${baseUrl}/api/og/character/${character.uuid}?locale=${locale}`
    : undefined;

  const seoVars = buildSeoVariables({
    character,
    pageData,
    worldName: worldRecord?.name,
    creatorName: creator?.display_name || undefined,
  });
  const descriptionTemplate = pageData?.metadata?.description;
  const fallbackDescription =
    pageData?.metadata?.fallback_description ||
    "Explore this character profile on AnividAI.";
  const metaDescription = normalizeMetaText(
    (descriptionTemplate ? applyTemplate(descriptionTemplate, seoVars) : "") ||
      fallbackDescription
  );
  const jsonLd = buildCharacterJsonLd({
    canonicalUrl,
    locale,
    title: seoVars.title || character.name,
    description: metaDescription,
    imageUrl: primaryImageUrl || ogImageUrl,
    character,
    worldName: worldRecord?.name,
    breadcrumbItems,
  });

  return (
    <div className="px-2 sm:px-4 lg:container lg:mx-auto lg:px-4 py-4">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {/* Breadcrumb Navigation */}
      <div className="-mt-8 mb-4">
        <Crumb items={breadcrumbItems} />
      </div>
      <CharacterDetailClient
        character={serializedCharacter}
        modules={modules}
        pageData={pageData}
        avatarUrl={avatarImageUrl}
        profileImageUrl={profileImageUrl}
        creator={
          creator
            ? {
                uuid: creator.uuid,
                display_name: creator.display_name,
                avatar_url: creator.avatar_url,
              }
            : null
        }
        isOwner={isOwner}
        isSub={isSub}
        userHasLiked={userHasLiked}
        userHasFavorited={userHasFavorited}
        locale={locale}
        initialCreationsByType={initialCreations.byType}
        world={
          worldRecord
            ? {
                id: worldRecord.id,
                uuid: worldRecord.uuid,
                name: worldRecord.name,
                theme_colors: normalizeStringRecord(worldRecord.theme_colors),
                cover_url: worldRecord.cover_url,
              }
            : null
        }
      />
    </div>
  );
}

function serializeCharacter(character: CharacterModel) {
  return {
    uuid: character.uuid,
    name: character.name,
    gender: character.gender,
    species: character.species,
    role: character.role,
    age: character.age,
    brief_introduction: character.brief_introduction,
    personality_tags: normalizeStringArray(character.personality_tags),
    tags: normalizeStringArray(character.tags),
    like_count: character.like_count,
    favorite_count: character.favorite_count,
    comment_count: character.comment_count,
    visibility_level: character.visibility_level,
    world_uuid:
      typeof character.world_uuid === "string" ? character.world_uuid : null,
    avatar_generation_image_uuid: character.avatar_generation_image_uuid,
    profile_generation_image_uuid: character.profile_generation_image_uuid,
    remixed_from_uuid: character.remixed_from_uuid,
  };
}

function buildSeoVariables({
  character,
  pageData,
  worldName,
  creatorName,
}: {
  character: CharacterModel | null;
  pageData: Awaited<ReturnType<typeof getCharacterDetailPage>> | null;
  worldName?: string | null;
  creatorName?: string | null;
}) {
  const displayName =
    character?.name || pageData?.breadcrumb?.characters || "AnividAI";
  const brief = character?.brief_introduction?.trim() || "";
  const tags = normalizeStringArray(character?.tags) || [];
  const personalityTags = normalizeStringArray(character?.personality_tags) || [];
  const role = character?.role?.trim() || "";
  const species = character?.species?.trim() || "";
  const age =
    character?.age !== null && character?.age !== undefined
      ? String(character.age)
      : "";
  const world = worldName?.trim() || "";
  const creator = creatorName?.trim() || "";
  const title = pageData?.metadata?.title
    ? applyTemplate(pageData.metadata.title, {
        name: displayName,
      })
    : displayName;

  return {
    name: displayName,
    title,
    brief,
    role,
    species,
    age,
    world,
    creator,
    tags: tags.join(", "),
    personality_tags: personalityTags.join(", "),
  };
}

function applyTemplate(
  template: string,
  variables: Record<string, string | undefined>
) {
  const replaced = template.replace(/{(\w+)}/g, (_, key: string) => {
    const value = variables[key];
    return value ? value : "";
  });
  return normalizeMetaText(replaced);
}

function normalizeMetaText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s+,/g, ", ")
    .replace(/\s+\./g, ".")
    .replace(/\.+/g, ".")
    .trim();
}

function buildKeywords({
  name,
  role,
  species,
  tags,
  personalityTags,
  worldName,
}: {
  name?: string | null;
  role?: string | null;
  species?: string | null;
  tags?: string[] | null;
  personalityTags?: string[] | null;
  worldName?: string | null;
}) {
  const values = [
    name,
    role,
    species,
    worldName,
    ...(tags || []),
    ...(personalityTags || []),
  ]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(values));
}

function resolveAbsoluteUrl(baseUrl: string | undefined, value?: string | null) {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (!baseUrl) return undefined;
  if (value.startsWith("/")) return `${baseUrl}${value}`;
  return `${baseUrl}/${value}`;
}

function buildLocalizedPath(locale: string, path: string) {
  if (!path.startsWith("/")) return path;
  if (!locale || locale === "en") return path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

function buildCharacterJsonLd({
  canonicalUrl,
  locale,
  title,
  description,
  imageUrl,
  character,
  worldName,
  breadcrumbItems,
}: {
  canonicalUrl?: string;
  locale: string;
  title: string;
  description: string;
  imageUrl?: string;
  character: CharacterModel;
  worldName?: string | null;
  breadcrumbItems: Array<{
    title: string;
    url: string;
  }>;
}) {
  if (!canonicalUrl) return null;

  const tags = normalizeStringArray(character.tags) || [];
  const personalityTags = normalizeStringArray(character.personality_tags) || [];
  const knowsAbout = [character.species, character.role, worldName, ...tags, ...personalityTags]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  const mainEntity = {
    "@type": "Person",
    name: character.name,
    description,
    ...(imageUrl ? { image: imageUrl } : {}),
    identifier: character.uuid,
    ...(character.gender ? { gender: character.gender } : {}),
    ...(knowsAbout.length ? { knowsAbout } : {}),
  };

  const profilePage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: locale,
    mainEntity,
    about: mainEntity,
  };

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title,
      item: resolveAbsoluteUrl(process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, ""), item.url),
    })),
  };

  return [profilePage, breadcrumbList];
}

async function resolveGalleryModules(raw: unknown): Promise<unknown> {
  const parsed = parseRawModules(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return raw;
  }

  const modules = { ...(parsed as Record<string, unknown>) };
  const art =
    modules.art && typeof modules.art === "object" && !Array.isArray(modules.art)
      ? { ...(modules.art as Record<string, unknown>) }
      : null;
  if (!art) return raw;

  const gallery = art.gallery;
  const entries = normalizeGalleryEntries(gallery);
  if (!entries.length) return raw;

  const nextGallery: Record<string, unknown> = {};
  entries.forEach(({ key, entry, value }) => {
    const nextEntry =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? { ...(entry as Record<string, unknown>) }
        : {};
    if (value && isUuid(value)) {
      nextEntry.url = value;
      nextEntry.value = value;
      nextEntry.meta = mergeMetaImageUuid(nextEntry.meta, value);
    } else if (value && !nextEntry.url && isUrlLike(value)) {
      nextEntry.url = value;
      nextEntry.value = value;
    }
    nextGallery[key] = nextEntry;
  });

  art.gallery = nextGallery;
  modules.art = art;

  return modules;
}

function parseRawModules(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

function normalizeGalleryEntries(
  gallery: unknown,
): Array<{ key: string; entry: unknown; value?: string }> {
  if (!gallery) return [];
  if (Array.isArray(gallery)) {
    return gallery.map((entry, index) => ({
      key: `artwork_${index}`,
      entry,
      value: extractGalleryValue(entry),
    }));
  }
  if (typeof gallery === "object") {
    return Object.entries(gallery as Record<string, unknown>).map(
      ([key, entry]) => ({
        key,
        entry,
        value: extractGalleryValue(entry),
      }),
    );
  }
  return [];
}

function extractGalleryValue(entry: unknown): string | undefined {
  if (typeof entry === "string") return entry.trim();
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return undefined;
  const record = entry as Record<string, unknown>;
  const value =
    typeof record.value === "string" && record.value.trim()
      ? record.value.trim()
      : undefined;
  if (value) return value;
  if (typeof record.url === "string" && record.url.trim()) return record.url.trim();
  if (typeof record.image_url === "string" && record.image_url.trim())
    return record.image_url.trim();
  return undefined;
}

function mergeMetaImageUuid(meta: unknown, imageUuid: string) {
  const nextMeta: Record<string, string> = {};
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    Object.entries(meta as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === "string") nextMeta[key] = value;
    });
  }
  if (!nextMeta.image_uuid) nextMeta.image_uuid = imageUuid;
  return nextMeta;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function isUrlLike(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:")
  );
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const result = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return result.length ? result : null;
}

function normalizeStringRecord(
  value: unknown
): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string") {
      result[key] = raw;
    }
  }
  return Object.keys(result).length ? result : null;
}
