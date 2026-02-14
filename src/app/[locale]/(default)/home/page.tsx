import { setRequestLocale } from "next-intl/server";
import { getUserCharacterAvatars } from "@/services/character";
import { getCommunityPage, getHomePage } from "@/services/page";
import { type Metadata } from "next";
import { Link } from "@/i18n/navigation";
import CharactersRow from "@/components/console/characters/CharactersRow";
import CreationTools from "@/components/console/tools/CreationTools";
import { CommunityPicksClient } from "@/components/community/CommunityPicksClient";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData: any = await getHomePage(locale).catch(() => ({}));
  const base = process.env.NEXT_PUBLIC_WEB_URL || "";
  const canonicalUrl =
    locale === "en" ? `${base}/home` : `${base}/${locale}/home`;
  return {
    title: "Home | Your AI Anime Creation Dashboard - AnividAI",
    description: "Access your AI anime dashboard. Manage your OCs, create anime images and videos with Veo 3.1 & Sora 2.0, chat with characters, and explore community creations.",
    alternates: { canonical: canonicalUrl },
    robots: { index: false, follow: false },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 并发拉取数据，出错单项降级为空数组
  const [pageData, communityPageData, characters] = await Promise.all([
    getHomePage(locale).catch(() => ({}) as any),
    getCommunityPage(locale).catch(() => getCommunityPage("en")),
    getUserCharacterAvatars(undefined, {
      limit: 16,
      deviceType: "desktop",
    }).catch(() => []),
  ]);

  // 不在服务器端获取 community 数据，避免 hydration 失败
  // 社区数据将在客户端的 CommunityPicksSection 组件中获取
  const sections = pageData?.sections || {};
  const charactersSection = sections?.characters || {};
  const toolsSection = sections?.tools || {};
  const communitySection = sections?.community || {};
  const toText = (value: unknown): string =>
    typeof value === "string" ? value : "";
  const charactersLabels = {
    title: toText(charactersSection?.title),
    empty: toText(charactersSection?.empty),
    create: toText(charactersSection?.create),
    all_ocs: toText(charactersSection?.all_ocs),
  };
  const chatsLabel = toText(toolsSection?.chats?.title);
  const chatsDesc =
    toText(toolsSection?.chats?.desc) || toText(toolsSection?.chats?.soon);
  const communityTitle = toText(communitySection?.title);
  const communityViewMore = toText(communitySection?.viewMore);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 lg:py-8 space-y-6 lg:space-y-10">
        {/* My Characters */}
        <section aria-labelledby="home-my-characters">
          <CharactersRow
            locale={locale}
            data={characters}
            labels={charactersLabels}
            chat_label={chatsLabel}
          />
        </section>

        {/* Creation Tools */}
        <section aria-labelledby="home-creation-tools">
          <CreationTools locale={locale} tools={toolsSection} />
        </section>

        {/* Community Picks */}
        <section aria-labelledby="home-community">
          <div className="flex items-baseline justify-between mb-4">
            <h2
              id="home-community"
              className="text-2xl font-semibold text-foreground"
            >
              {communityTitle}
            </h2>
            <Link
              href={{ pathname: "/community" }}
              className="text-primary hover:underline cursor-pointer"
            >
              {communityViewMore}
            </Link>
          </div>

          <CommunityPicksClient
            pageData={communityPageData}
            initialQuery={{ sort: "trending", limit: 8 }}
          />
        </section>
      </div>
    </div>
  );
}
