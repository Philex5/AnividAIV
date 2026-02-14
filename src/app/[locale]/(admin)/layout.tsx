import DashboardLayout from "@/components/dashboard/layout";
import Empty from "@/components/blocks/empty";
import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";
import { getLogoUrl } from "@/lib/asset-loader";
import { SidebarTrigger } from "@/components/ui/sidebar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  return {
    title: "Admin | AnividAI",
    description: "Administor System Of AnividAI",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    redirect("/auth/signin");
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",");
  if (!adminEmails?.includes(userInfo?.email)) {
    return <Empty message="No access" />;
  }

  const sidebar: Sidebar = {
    brand: {
      title: "AnividAI",
      logo: {
        src: getLogoUrl(),
        alt: "AnividAI",
      },
      url: "/admin",
    },
    // nav: {
    //   items: [
    //     {
    //       title: "Dashboard",
    //       url: "/admin",
    //       icon: "RiDashboardLine",
    //     },
    //   ],
    // },
    variant: "sidebar", // sidebar, floating, inset
    collapsible: "icon", // offcanvas, icon
    nav: {
      title: "Menu",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: "RiDashboardLine",
        },
        {
          title: "Users",
          url: "/admin/users",
          icon: "RiUserLine",
        },
        {
          title: "Generations",
          icon: "RiImageLine",
          url: "/admin/generations",
        },
        {
          title: "Chats",
          icon: "RiMessage3Line",
          url: "/admin/chats",
        },
        {
          title: "Revenue",
          icon: "RiBarChart2Line",
          url: "/admin/revenue",
        },
        {
          title: "Subscriptions",
          url: "/admin/subscriptions",
          icon: "RiOrderPlayLine",
        },
        {
          title: "Orders",
          icon: "RiOrderPlayLine",
          url: "/admin/orders",
        },
        {
          title: "Logs",
          icon: "RiErrorWarningLine",
          url: "/admin/logs",
        },
        {
          title: "Tasks",
          icon: "RiComputerLine",
          is_expand: true,
          children: [
            {
              title: "FileTransR2",
              url: "/admin/file_trans",
              icon: "RiFolderLine",
            },
          ],
        },
        {
          title: "CMS",
          icon: "RiArticleLine",
          is_expand: true,
          children: [
            {
              title: "Posts",
              url: "/admin/posts",
              icon: "RiArticleLine",
            },
            {
              title: "Categories",
              url: "/admin/categories",
              icon: "RiFolderLine",
            },
            {
              title: "Emails",
              url: "/admin/emails",
              icon: "RiMailLine",
            },
          ],
        },
        {
          title: "Feedbacks",
          url: "/admin/feedbacks",
          icon: "RiMessage2Line",
        },
      ],
    },
    bottomNav: {
      items: [],
    },
    account: {
      items: [],
    },
  };

  // Mobile header component
  const MobileHeader = () => (
    <div className="flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <img
          src={sidebar.brand?.logo?.src}
          alt={sidebar.brand?.logo?.alt || "Logo"}
          className="h-6 w-6"
        />
        <span className="font-semibold">{sidebar.brand?.title}</span>
      </div>
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <MobileHeader />
      {children}
    </DashboardLayout>
  );
}
