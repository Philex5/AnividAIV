import DataCards from "@/components/blocks/data-cards";
import DataCharts from "@/components/blocks/data-charts";
import { getOrderCountByDate, getPaidOrdersTotal } from "@/models/order";
import { getUserCountByDate, getUsersTotal } from "@/models/user";
import { getFeedbacksTotal } from "@/models/feedback";
import { getPostsTotal } from "@/models/post";
import { DataCard } from "@/types/blocks/base";
import {
  getGenerationTrendSince,
  getTotalGenerations,
  getSuccessRate,
} from "@/services/admin";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  return {
    title: "Admin | AnividAI",
    description: "Administor System Of AnividAI",
  };
}

export default async function () {
  const t = await getTranslations("admin.dashboard");

  const [
    totalPaidOrders,
    totalUsers,
    totalFeedbacks,
    totalPosts,
    totalGenerations,
    successRate,
  ] = await Promise.all([
    getPaidOrdersTotal(),
    getUsersTotal(),
    getFeedbacksTotal(),
    getPostsTotal(),
    getTotalGenerations(),
    getSuccessRate(),
  ]);

  const dataCards: DataCard[] = [
    {
      title: t("cards.total_users"),
      label: "",
      value: (totalUsers || 0).toString(),
      description: t("cards.users_desc"),
    },
    {
      title: t("cards.paid_orders"),
      label: "",
      value: (totalPaidOrders || 0).toString(),
      description: t("cards.orders_desc"),
    },
    {
      title: t("cards.system_posts"),
      label: "",
      value: (totalPosts || 0).toString(),
      description: t("cards.posts_desc"),
    },
    {
      title: t("cards.user_feedbacks"),
      label: "",
      value: (totalFeedbacks || 0).toString(),
      description: t("cards.feedbacks_desc"),
    },
    {
      title: t("cards.total_generations"),
      label: "",
      value: (totalGenerations || 0).toString(),
      description: t("cards.generations_desc"),
    },
    {
      title: t("cards.success_rate"),
      label: "",
      value: `${(successRate || 0).toFixed(1)}%`,
      description: t("cards.success_rate_desc"),
    },
  ];

  // Get data for the last 30 days
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - 90);
  const orders = await getOrderCountByDate(startTime.toISOString(), "paid");
  const users = await getUserCountByDate(startTime.toISOString());
  const genTrendMap = await getGenerationTrendSince(startTime.toISOString());

  // Merge the data into a single array
  const allDates = new Set([
    ...(orders ? Array.from(orders.keys()) : []),
    ...(users ? Array.from(users.keys()) : []),
  ]);

  const data = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      users: users?.get(date) || 0,
      orders: orders?.get(date) || 0,
      generations: genTrendMap.get(date)?.total || 0,
    }));

  const fields = [
    { key: "users", label: t("chart.users"), color: "var(--primary)" },
    { key: "orders", label: t("chart.orders"), color: "var(--secondary)" },
    {
      key: "generations",
      label: t("chart.generations"),
      color: "var(--accent)",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <DataCards dataCards={dataCards} />
      <DataCharts
        data={data}
        fields={fields}
        title={t("chart.title")}
        description={t("chart.description")}
        defaultTimeRange="90d"
      />
    </div>
  );
}
