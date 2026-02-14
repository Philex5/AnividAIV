import { ReactNode } from "react";
import { getLandingPage } from "@/services/page";
import ConditionalLayout from "@/components/layout/ConditionalLayout";

export default async function DefaultLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  return (
    <ConditionalLayout header={page.header}>
      {children}
    </ConditionalLayout>
  );
}
