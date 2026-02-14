import { TableColumn } from "@/types/blocks/table";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getFeedbacks } from "@/models/feedback";
import moment from "moment";
import { getTranslations } from "next-intl/server";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";

export default async function () {
  const t = await getTranslations("admin.feedbacks");
  const feedbacks = await getFeedbacks(1, 50);

  const columns: TableColumn[] = [
    {
      title: t("table.user"),
      name: "user",
      callback: (row) => {
        if (!row.user) {
          return "-";
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`/admin/users?user_uuid=${row.user_uuid}`}
                  target="_self"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <AdminUserAvatar
                    avatarUrl={row.user?.avatar_url}
                    name={row.user?.display_name}
                    email={row.user?.email}
                    className="size-8"
                    fallbackClassName="text-[10px]"
                  />
                  <span>{row.user?.display_name || "User"}</span>
                </a>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      name: "content",
      title: t("table.content"),
      callback: (row) => {
        const content = row.content || "";
        const truncated = content.length > 50 ? content.substring(0, 50) + "..." : content;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{truncated}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p className="whitespace-pre-wrap">{content}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      name: "type",
      title: t("table.type"),
      callback: (row) => {
        const typeMap: Record<string, string> = {
          general: t("table.types.general"),
          bug_report: t("table.types.bug_report"),
          feature_request: t("table.types.feature_request"),
          user_experience: t("table.types.user_experience"),
        };
        return typeMap[row.type] || row.type;
      },
    },
    {
      name: "created_at",
      title: t("table.created_at"),
      callback: (row) => moment(row.created_at).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  const table: TableSlotType = {
    title: t("title"),
    columns,
    data: feedbacks,
    showHeader: false,
    refresh: {
      enabled: true,
      onRefresh: async () => {
        "use server";
        await getFeedbacks(1, 50);
      },
    },
  };

  return <TableSlot {...table} />;
}
