import { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Palette, ImageIcon } from "lucide-react";
import Link from "next/link";
import { getUserInfo } from "@/services/user";
import { getMyCreationsPage } from "@/services/page";
import { getUserArtworks } from "@/services/artworks";
import { MyCreationsClient } from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getMyCreationsPage(locale);

  return {
    title: pageData.metadata?.title || "My Creations - AnividAI",
    description: pageData.metadata?.description || "Manage your characters and artworks in one place",
  };
}

export default async function MyCreationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  noStore();

  const { locale } = await params;
  setRequestLocale(locale);
  const pageData = await getMyCreationsPage(locale);

  // Check if user is authenticated
  let user;

  try {
    user = await getUserInfo();
  } catch (error) {
    console.log("User not authenticated");
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="mb-6 flex items-center justify-center gap-4">
            <Palette className="h-12 w-12 text-gray-300" />
            <ImageIcon className="h-12 w-12 text-gray-300" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {pageData.page?.sign_in_required || "Sign In Required"}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {pageData.page?.sign_in_message || "Please sign in to view and manage your characters and artworks"}
          </p>
          <Button asChild size="lg" variant="default">
            <Link href="/auth/signin">{pageData.page?.sign_in_button || "Sign In"}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initialArtworks = await getUserArtworks({
    userUuid: user.uuid || "",
    tab: "mine",
    type: "all",
    page: 1,
    limit: 20,
  });

  return (
    <MyCreationsClient
      pageData={pageData}
      userUuid={user.uuid || ""}
      initialArtworks={initialArtworks}
    />
  );
}
