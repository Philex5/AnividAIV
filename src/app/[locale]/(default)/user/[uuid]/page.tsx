import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getUserProfilePage, getCommunityPage } from "@/services/page";
import {
  getPublicProfile,
  listPublicArtworks,
  listPublicCharacters,
  listPublicWorlds,
} from "@/services/user-profile";
import UserProfileClient from "@/components/user-profile/UserProfileClient";
import type { Metadata } from "next";
import { defaultLocale } from "@/i18n/locale";
import { resolveProfileImageUrl } from "@/lib/profile-image-resolve";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; uuid: string }>;
}): Promise<Metadata> {
  const { locale, uuid } = await params;
  const pageData = await getUserProfilePage(locale);
  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  const canonicalPath =
    locale === defaultLocale ? `/user/${uuid}` : `/${locale}/user/${uuid}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  try {
    const profile = await getPublicProfile(uuid);
    const title =
      profile.display_name?.trim() ||
      pageData.metadata?.title ||
      "User Profile | AnividAI";
    const description = profile.bio || pageData.metadata?.description || "User profile";
    const avatar = await resolveProfileImageUrl(profile.avatar_url, {
      ownerUuid: profile.uuid,
    });
    const resolvedAvatar =
      avatar && avatar.startsWith("/") ? `${baseUrl}${avatar}` : avatar;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
        languages: {
          en: `${baseUrl}/user/${uuid}`,
          ja: `${baseUrl}/ja/user/${uuid}`,
        },
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: "AnividAI",
        type: "profile",
        ...(resolvedAvatar
          ? {
              images: [
                {
                  url: resolvedAvatar,
                  width: 1200,
                  height: 630,
                  alt: title,
                },
              ],
            }
          : {}),
      },
      twitter: {
        card: resolvedAvatar ? "summary_large_image" : "summary",
        title,
        description,
        ...(resolvedAvatar ? { images: [resolvedAvatar] } : {}),
        site: process.env.NEXT_PUBLIC_TWITTER_SITE,
      },
    };
  } catch {
    return {
      title: pageData.metadata?.title || "User Profile | AnividAI",
      description: pageData.metadata?.description || "User profile",
      alternates: {
        canonical: canonicalUrl,
        languages: {
          en: `${baseUrl}/user/${uuid}`,
          ja: `${baseUrl}/ja/user/${uuid}`,
        },
      },
    };
  }
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ locale: string; uuid: string }>;
}) {
  const { locale, uuid } = await params;
  setRequestLocale(locale);

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  const canonicalPath =
    locale === defaultLocale ? `/user/${uuid}` : `/${locale}/user/${uuid}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  const session = await auth();
  const viewerUuid = session?.user?.uuid || undefined;

  let profile: Awaited<ReturnType<typeof getPublicProfile>> | null = null;
  try {
    profile = await getPublicProfile(uuid, viewerUuid);
  } catch (error) {
    notFound();
  }
  if (!profile) {
    notFound();
  }

  const [charactersResult, worldsResult, artworksResult, pageData, communityPageData] = await Promise.all([
    listPublicCharacters(uuid, { page: 1, limit: 6 }),
    listPublicWorlds(uuid, { page: 1, limit: 4 }),
    listPublicArtworks(uuid, { page: 1, limit: 6, type: "all" }),
    getUserProfilePage(locale),
    getCommunityPage(locale),
  ]);
  const characters = charactersResult.filter(
    (character) => Boolean(character.profile_generation_image_uuid)
  );

  const resolvedAvatar = await resolveProfileImageUrl(profile.avatar_url, {
    ownerUuid: profile.uuid,
  });
  const resolvedAvatarWithDomain =
    resolvedAvatar && resolvedAvatar.startsWith("/")
      ? `${baseUrl}${resolvedAvatar}`
      : resolvedAvatar;
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.display_name,
      description: profile.bio || "",
      url: canonicalUrl,
      ...(resolvedAvatarWithDomain
        ? { image: resolvedAvatarWithDomain }
        : {}),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <UserProfileClient
        profile={profile}
        characters={characters}
        worlds={worldsResult.worlds}
        artworks={artworksResult.artworks}
        pageData={pageData}
        communityPageData={communityPageData}
      />
    </>
  );
}
