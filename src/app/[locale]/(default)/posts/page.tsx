import Blog from "@/components/blocks/blog";
import { BlogItem, Blog as BlogType } from "@/types/blocks/blog";
import { getPostsByLocale, getPostsByLocaleAndCategory } from "@/models/post";
import {
  CategoryStatus,
  getCategories,
  findCategoryByName,
} from "@/models/category";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const baseUrl =
    process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") || "https://anividai.com";

  let canonicalUrl = `${baseUrl}/posts`;

  if (locale !== "en") {
    canonicalUrl = `${baseUrl}/${locale}/posts`;
  }

  const title = `${t("blog.title")} | AnividAI`;
  const description = t("blog.description");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/posts`,
        ja: `${baseUrl}/ja/posts`,
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

export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  const t = await getTranslations();

  const categories = await getCategories({
    status: CategoryStatus.Online,
    page: 1,
    limit: 200,
  });

  let posts;
  if (category) {
    const matched = await findCategoryByName(category);
    posts = matched
      ? await getPostsByLocaleAndCategory(locale, matched.uuid!)
      : [];
  } else {
    posts = await getPostsByLocale(locale);
  }

  const blog: BlogType = {
    title: t("blog.title"),
    description: t("blog.description"),
    items: posts as unknown as BlogItem[],
    read_more_text: t("blog.read_more_text"),
  };

  return (
    <div className="container py-6 md:py-8">
      <Blog
        blog={blog}
        categories={categories as any}
        category={category as any}
      />
    </div>
  );
}
