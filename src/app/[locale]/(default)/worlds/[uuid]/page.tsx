import { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getWorldPage } from "@/services/page";
import { getworldByIdentifier } from "@/services/world";
import { getUserUuid } from "@/services/user";
import { WorldDetailView } from "@/components/worlds/WorldDetailView";
import { toImageUrl } from "@/lib/r2-utils";
import { defaultLocale } from "@/i18n/locale";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; uuid: string }>;
}): Promise<Metadata> {
  const { locale, uuid } = await params;
  const pageData = await getWorldPage(locale);
  const metadata = pageData?.detail?.metadata || pageData?.metadata || {};
  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  const canonicalPath =
    locale === defaultLocale ? `/worlds/${uuid}` : `/${locale}/worlds/${uuid}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  try {
    const world = await getworldByIdentifier(uuid);
    const ogImage = world.cover_url ? toImageUrl(world.cover_url) : "";
    const resolvedOgImage =
      ogImage && ogImage.startsWith("/") ? `${baseUrl}${ogImage}` : ogImage;
    return {
      title: metadata.title ? `${world.name} | ${metadata.title}` : world.name,
      description: metadata.description || world.description || "",
      keywords: metadata.keywords,
      alternates: {
        canonical: canonicalUrl,
        languages: {
          en: `${baseUrl}/worlds/${uuid}`,
          ja: `${baseUrl}/ja/worlds/${uuid}`,
        },
      },
      openGraph: {
        title: metadata.title ? `${world.name} | ${metadata.title}` : world.name,
        description: metadata.description || world.description || "",
        url: canonicalUrl,
        siteName: "AnividAI",
        type: "website",
        ...(resolvedOgImage
          ? {
              images: [
                {
                  url: resolvedOgImage,
                  width: 1200,
                  height: 630,
                  alt: world.name,
                },
              ],
            }
          : {}),
      },
      twitter: {
        card: resolvedOgImage ? "summary_large_image" : "summary",
        title: metadata.title ? `${world.name} | ${metadata.title}` : world.name,
        description: metadata.description || world.description || "",
        ...(resolvedOgImage ? { images: [resolvedOgImage] } : {}),
        site: process.env.NEXT_PUBLIC_TWITTER_SITE,
      },
    };
  } catch {
    return {
      title: metadata.title || "",
      description: metadata.description || "",
      keywords: metadata.keywords,
      alternates: {
        canonical: canonicalUrl,
        languages: {
          en: `${baseUrl}/worlds/${uuid}`,
          ja: `${baseUrl}/ja/worlds/${uuid}`,
        },
      },
    };
  }
}

export default async function WorldDetailPage({
  params,
}: {
  params: Promise<{ locale: string; uuid: string }>;
}) {
  const { locale, uuid } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("nav");
  
  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  const canonicalPath =
    locale === defaultLocale ? `/worlds/${uuid}` : `/${locale}/worlds/${uuid}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const userUuid = await getUserUuid();
  const pageData = await getWorldPage(locale);

  let world;
  try {
    world = await getworldByIdentifier(uuid, userUuid || undefined);
  } catch (error: any) {
    if (error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  // Check visibility/permissions
  if (world.visibility_level === "private" && world.creator_uuid !== userUuid) {
    notFound(); // Or a custom unauthorized page
  }

  const isCreator = userUuid === world.creator_uuid;
  const cover = world.cover_url ? toImageUrl(world.cover_url) : "";
  const resolvedCover = cover && cover.startsWith("/") ? `${baseUrl}${cover}` : cover;
  const worldJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: world.name,
    description: world.description || "",
    url: canonicalUrl,
    ...(resolvedCover ? { image: resolvedCover } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(worldJsonLd) }}
      />
      <div className="px-2 sm:px-4 lg:container lg:mx-auto lg:px-4 pt-0 pb-8">
        <div className="-mt-4 mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">{tNav("home")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/worlds">{tNav("worlds")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{world.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <WorldDetailView world={world} isCreator={isCreator} pageData={pageData} />
      </div>
    </>
  );
}
