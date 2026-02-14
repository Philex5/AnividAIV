import { setRequestLocale } from "next-intl/server";

import AdminEmailsClient from "@/components/admin/email/AdminEmailsClient";
import enCopy from "@/i18n/pages/admin-emails/en.json";
import jaCopy from "@/i18n/pages/admin-emails/ja.json";

const COPIES: Record<string, any> = {
  en: enCopy,
  ja: jaCopy,
};

export default async function AdminEmailsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const copy = COPIES[locale] || enCopy;

  return <AdminEmailsClient copy={copy} />;
}
