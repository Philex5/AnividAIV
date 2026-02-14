import DataCards from "@/components/blocks/data-cards";
import { DataCard } from "@/types/blocks/base";

export default function ChatMetricsCards({
  totalSessions,
  totalUsers,
  t,
}: {
  totalSessions: number;
  totalUsers: number;
  t: (key: string) => string;
}) {
  const dataCards: DataCard[] = [
    {
      title: t("cards.total_sessions"),
      label: "",
      value: totalSessions.toString(),
      description: t("cards.total_sessions_desc"),
    },
    {
      title: t("cards.total_users"),
      label: "",
      value: totalUsers.toString(),
      description: t("cards.total_users_desc"),
    },
  ];

  return (
    <DataCards
      dataCards={dataCards}
      className="px-0 grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1"
    />
  );
}
