import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getWorldPage } from "@/services/page";
import { WorldForm } from "@/components/worlds/WorldForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getWorldPage(locale);
  const metadata = pageData?.create?.metadata || pageData?.metadata || {};

  return {
    title: metadata.title || "",
    description: metadata.description || "",
    keywords: metadata.keywords,
  };
}

export default async function WorldCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pageData = await getWorldPage(locale);
  const createCopy = pageData?.create || {};

  return (
    <div className="min-h-[calc(100svh-48px)] bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 lg:py-16">
        <div className="text-center space-y-3 mb-4">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            {createCopy.title || ""}
          </h1>
          <p className="text-muted-foreground text-base lg:text-lg max-w-2xl mx-auto">
            {createCopy.subtitle || ""}
          </p>
        </div>

        <WorldForm pageData={pageData} />
      </div>
    </div>
  );
}
