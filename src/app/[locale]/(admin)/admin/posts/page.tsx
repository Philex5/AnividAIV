import Dropdown from "@/components/blocks/table/dropdown";
import { NavItem } from "@/types/blocks/base";
import { Post } from "@/types/post";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getAllPosts } from "@/models/post";
import moment from "moment";
import { getCategories } from "@/models/category";
import { getTranslations } from "next-intl/server";

export default async function () {
  const t = await getTranslations("admin.posts");
  const posts = await getAllPosts();
  const categories = await getCategories({});

  const table: TableSlotType = {
    title: t("title"),
    toolbar: {
      items: [
        {
          title: t("toolbar.add_post"),
          icon: "RiAddLine",
          url: "/admin/posts/add",
        },
      ],
    },
    columns: [
      {
        name: "title",
        title: t("table.title"),
      },
      {
        name: "description",
        title: t("table.description"),
      },
      {
        name: "slug",
        title: t("table.slug"),
      },
      {
        name: "locale",
        title: t("table.locale"),
      },
      {
        name: "category_uuid",
        title: t("table.category"),
        callback: (item: Post) => {
          if (!categories || !item.category_uuid) return "-";

          const category = categories.find(
            (category) => category.uuid === item.category_uuid
          );

          return category?.title;
        },
      },
      {
        name: "status",
        title: t("table.status"),
      },
      {
        name: "created_at",
        title: t("table.created_at"),
        callback: (item: Post) => {
          return moment(item.created_at).format("YYYY-MM-DD HH:mm:ss");
        },
      },
      {
        callback: (item: Post) => {
          const items: NavItem[] = [
            {
              title: t("table.edit"),
              icon: "RiEditLine",
              url: `/admin/posts/${item.uuid}/edit`,
            },
            {
              title: t("table.view"),
              icon: "RiEyeLine",
              url: `/${item.locale}/posts/${item.slug}`,
              target: "_blank",
            },
          ];

          return <Dropdown items={items} />;
        },
      },
    ],
    data: posts,
    empty_message: t("empty_message"),
    showHeader: false,
    refresh: {
      enabled: true,
      onRefresh: async () => {
        "use server";
        // 重新获取文章和分类数据
        await getAllPosts();
        await getCategories({});
      },
    },
  };

  return <TableSlot {...table} />;
}
