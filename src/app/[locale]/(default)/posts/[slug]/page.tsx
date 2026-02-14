import { PostStatus, findPostBySlug } from "@/models/post";
import { CategoryStatus, getCategories } from "@/models/category";

import BlogDetail from "@/components/blocks/blog-detail";
import Empty from "@/components/blocks/empty";
import { Post } from "@/types/post";
import { toImageUrl } from "@/lib/r2-utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const post = await findPostBySlug(slug, locale);

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  let canonicalUrl = `${baseUrl}/posts/${slug}`;

  if (locale !== "en") {
    canonicalUrl = `${baseUrl}/${locale}/posts/${slug}`;
  }

  const title = post?.title || "";
  const description = post?.description || "";
  const cover = post?.cover_url ? toImageUrl(post.cover_url) : "";
  const resolvedCover = cover && cover.startsWith("/") ? `${baseUrl}${cover}` : cover;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/posts/${slug}`,
        ja: `${baseUrl}/ja/posts/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "AnividAI",
      type: "article",
      ...(resolvedCover
        ? {
            images: [
              {
                url: resolvedCover,
                width: 1200,
                height: 630,
                alt: title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: resolvedCover ? "summary_large_image" : "summary",
      title,
      description,
      ...(resolvedCover ? { images: [resolvedCover] } : {}),
      site: process.env.NEXT_PUBLIC_TWITTER_SITE,
    },
  };
}

export default async function ({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await findPostBySlug(slug, locale);

  if (!post || post.status !== PostStatus.Online) {
    return <Empty message="Post not found" />;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";
  const canonicalUrl =
    locale === "en" ? `${baseUrl}/posts/${slug}` : `${baseUrl}/${locale}/posts/${slug}`;
  const cover = post.cover_url ? toImageUrl(post.cover_url) : "";
  const resolvedCover = cover && cover.startsWith("/") ? `${baseUrl}${cover}` : cover;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title || "",
    description: post.description || "",
    datePublished: post.created_at || undefined,
    dateModified: post.updated_at || post.created_at || undefined,
    author: post.author_name
      ? {
          "@type": "Person",
          name: post.author_name,
        }
      : undefined,
    ...(resolvedCover ? { image: resolvedCover } : {}),
    mainEntityOfPage: canonicalUrl,
  };

  const categories = await getCategories({
    status: CategoryStatus.Online,
    page: 1,
    limit: 200,
  });

  const category = categories?.find(
    (category) => category.uuid === post.category_uuid
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <BlogDetail
        post={post as unknown as Post}
        categories={categories as any}
        category={category}
      />
    </>
  );
}
