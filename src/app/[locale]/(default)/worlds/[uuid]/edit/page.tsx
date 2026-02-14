import { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getWorldPage } from "@/services/page";
import { getUserUuid } from "@/services/user";
import { getworldByIdentifier } from "@/services/world";
import { WorldForm } from "@/components/worlds/WorldForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getWorldPage(locale);
  const metadata = pageData?.edit?.metadata || pageData?.metadata || {};

  return {
    title: metadata.title || "",
    description: metadata.description || "",
    keywords: metadata.keywords,
  };
}

export default async function WorldEditPage({
  params,
}: {
  params: Promise<{ locale: string; uuid: string }>;
}) {
  const { locale, uuid } = await params;
  setRequestLocale(locale);

  const pageData = await getWorldPage(locale);
  const editCopy = pageData?.edit || {};

  const userUuid = await getUserUuid();
  if (!userUuid) {
    notFound();
  }

  let world;
  try {
    world = await getworldByIdentifier(uuid, userUuid || undefined);
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  if (!world || world.creator_uuid !== userUuid) {
    notFound();
  }

  return (
    <div className="min-h-[calc(100svh-48px)] bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 lg:py-16">
        <div className="text-center space-y-3 mb-4">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            {editCopy.title || ""}
          </h1>
          <p className="text-muted-foreground text-base lg:text-lg max-w-2xl mx-auto">
            {editCopy.subtitle || ""}
          </p>
        </div>

        <WorldForm pageData={pageData} mode="edit" world={world} />
      </div>
    </div>
  );
}
