import { TableColumn } from "@/types/blocks/table";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getCategories } from "@/models/category";
import moment from "moment";
import Dropdown from "@/components/blocks/table/dropdown";
import { NavItem } from "@/types/blocks/base";
import { getTranslations } from "next-intl/server";

export default async function CategoriesPage() {
  const t = await getTranslations("admin.categories");
  const categories = await getCategories({
    page: 1,
    limit: 50,
  });

  const columns: TableColumn[] = [
    {
      title: t("table.name"),
      name: "name",
      callback: (row) => {
        return row.name;
      },
    },
    {
      title: t("table.title"),
      name: "title",
      callback: (row) => row.title,
    },
    {
      name: "description",
      title: t("table.description"),
      callback: (row) => row.description,
    },
    {
      name: "sort",
      title: t("table.sort"),
      callback: (row) => row.sort,
    },
    {
      name: "status",
      title: t("table.status"),
      callback: (row) => row.status,
    },
    {
      name: "created_at",
      title: t("table.created_at"),
      callback: (row) => moment(row.created_at).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      callback: (item) => {
        const items: NavItem[] = [
          {
            title: t("table.edit"),
            icon: "RiEditLine",
            url: `/admin/categories/${item.uuid}/edit`,
          },
          {
            title: t("table.view"),
            icon: "RiEyeLine",
            target: "_blank",
            url: `/posts?category=${encodeURIComponent(item.name)}`,
          },
        ];

        return <Dropdown items={items} />;
      },
    },
  ];

  const table: TableSlotType = {
    title: t("title"),
    toolbar: {
      items: [
        {
          title: t("toolbar.add_category"),
          icon: "RiAddLine",
          url: "/admin/categories/add",
        },
      ],
    },
    columns,
    data: categories,
    showHeader: false,
    refresh: {
      enabled: true,
      onRefresh: async () => {
        "use server";
        // 重新获取分类数据
        await getCategories({
          page: 1,
          limit: 50,
        });
      },
    },
  };

  return <TableSlot {...table} />;
}
