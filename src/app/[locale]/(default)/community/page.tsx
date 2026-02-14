import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"
import { setRequestLocale } from "next-intl/server"

import { getCommunityList } from "@/services/community"
import { getCommunityPage } from "@/services/page"
import CommunityPageClient from "./page-client"

type CommunityFilterType = "all" | "oc" | "image" | "video"
type CommunitySortValue = "trending" | "newest" | "top"

const DEFAULT_TYPE: CommunityFilterType = "all"
const DEFAULT_SORT: CommunitySortValue = "trending"

function parseFilters(searchParams?: Record<string, string | string[] | undefined>) {
  const getSingleValue = (key: string) => {
    const value = searchParams?.[key]
    if (Array.isArray(value)) return value[0]
    return value
  }

  const typeParam = getSingleValue("type")
  const sortParam = getSingleValue("sort")
  const qParam = getSingleValue("q")
  const genTypesParam = getSingleValue("gen_types")

  const type: CommunityFilterType =
    typeParam === "oc" || typeParam === "image" || typeParam === "video"
      ? typeParam
      : DEFAULT_TYPE

  const sort: CommunitySortValue =
    sortParam === "newest" || sortParam === "top" || sortParam === "trending"
      ? sortParam
      : DEFAULT_SORT

  const q = qParam ? qParam.slice(0, 100) : ""
  const genTypes = genTypesParam
    ? genTypesParam
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  return {
    filters: {
      type,
      sort,
      q,
      genTypes,
    },
    filtersKey: JSON.stringify({
      type,
      sort,
      q,
      genTypes: genTypes.join(","),
    }),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const pageData = await getCommunityPage(locale)

  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://anividai.com"
  const canonical =
    locale === "en" ? `${baseUrl}/community` : `${baseUrl}/${locale}/community`

  const title = pageData.seo?.metaTitle || pageData.title
  const description = pageData.seo?.metaDescription || pageData.subtitle

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: `${baseUrl}/community`,
        ja: `${baseUrl}/ja/community`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "AnividAI",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: process.env.NEXT_PUBLIC_TWITTER_SITE,
    },
  }
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  noStore()

  const { locale } = await params
  const resolvedSearchParams = await searchParams
  setRequestLocale(locale)

  const pageDataPromise = getCommunityPage(locale)
  const { filters, filtersKey } = parseFilters(resolvedSearchParams)
  const initialListPromise = getCommunityList({
    type: filters.type,
    sort: filters.sort,
    q: filters.q || null,
    gen_types: filters.genTypes,
    limit: 24,
  })

  const [pageData, initialList] = await Promise.all([
    pageDataPromise,
    initialListPromise,
  ])

  return (
    <CommunityPageClient
      pageData={pageData}
      initialList={initialList}
      initialFiltersKey={filtersKey}
    />
  )
}
