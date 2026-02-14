import { unstable_noStore as noStore } from "next/cache";
import { setRequestLocale } from "next-intl/server";

import { getPage } from "@/services/page";
import ChatsPageClient from "./page-client";

export default async function AdminChatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  noStore();

  const { locale } = await params;
  setRequestLocale(locale);

  const pageData = await getPage("admin-chats", locale);

  return <ChatsPageClient pageData={pageData as any} />;
}

