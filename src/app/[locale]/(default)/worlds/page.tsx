import { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getWorldPage } from "@/services/page";
import { getworlds } from "@/services/world";
import { WorldListPage } from "@/components/worlds/WorldListPage";
import { getUserUuid } from "@/services/user";
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
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getWorldPage(locale);
  const metadata = pageData?.metadata || {};

  return {
    title: metadata.title || "",
    description: metadata.description || "",
    keywords: metadata.keywords,
  };
}

export default async function WorldPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("nav");
  const pageData = await getWorldPage(locale);
  const worldCopy = pageData as any;

  // Fetch all public worlds
  const viewerUuid = await getUserUuid();
  const { worlds } = await getworlds({
    visibility_level: "public",
    limit: 100,
    includePreset: true,
    viewerUuid: viewerUuid || undefined,
  });

  return (
    <div className="min-h-[calc(100svh-48px)] bg-transparent">
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
                <BreadcrumbPage>{tNav("worlds")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-6 lg:py-10">
          <WorldListPage initialWorlds={worlds} pageData={pageData} />
        </div>
      </div>
    </div>
  );
}
