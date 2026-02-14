import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";
import { getUserCreditSummary } from "@/services/credit";
import { getUserCenterPage } from "@/services/page";
import UserInfoCard from "@/components/console/user-center/UserInfoCard";
import UserCenterTabs from "@/components/console/user-center/UserCenterTabs";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getUserCenterPage(locale);

  return {
    title: pageData.metadata?.title || "User Center | AnividAI",
    description: pageData.metadata?.description || "User Center",
  };
}

export default async function UserCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const pageData = await getUserCenterPage(locale);

  const userInfo = await getUserInfo();

  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
  }

  const creditSummary = await getUserCreditSummary({
    userUuid: userInfo.uuid,
    window: "all",
    type: "all",
  });

  return (
    <div className="space-y-6">
      <UserInfoCard
        user={userInfo}
        creditBalance={creditSummary.balance || 0}
      />
      <UserCenterTabs userUuid={userInfo.uuid} pageData={pageData} />
    </div>
  );
}
