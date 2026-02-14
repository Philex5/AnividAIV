import { getTranslations } from "next-intl/server";
import GenerationsList from "@/components/admin/generations/GenerationsList";
import {
  getAnimeGeneratorPage,
  getCommunityPage,
  getVideoGeneratorPage,
} from "@/services/page";

export default async function AdminGenerationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin.generations");

  const [imagePageData, videoPageData, communityPageData] = await Promise.all([
    getAnimeGeneratorPage(locale),
    getVideoGeneratorPage(locale),
    getCommunityPage(locale),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      {/* Generations 列表 */}
      <GenerationsList
        imagePageData={imagePageData}
        videoPageData={videoPageData}
        communityPageData={communityPageData}
      />
    </div>
  );
}
