"use client";

import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarProvider,
} from "@/components/ui/sidebar";
import Nav from "../dashboard/sidebar/nav";
import { Sidebar as SidebarType } from "@/types/blocks/sidebar";
import SidebarUser from "../dashboard/sidebar/user";
import Footer from "../dashboard/sidebar/footer";
import { Library } from "../dashboard/sidebar/library";
import { BottomNav } from "../dashboard/sidebar/bottom_nav";

export default function AppSidebar({
  sidebar,
  withProvider = true,
  providerProps,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sidebar: SidebarType;
  withProvider?: boolean;
  providerProps?: React.ComponentProps<typeof SidebarProvider>;
}) {
  const sidebarView = (
    <Sidebar collapsible={sidebar.collapsible || "icon"} {...props}>
      <SidebarContent className="relative bg-gradient-to-b from-primary/5 via-sidebar to-sidebar/95 backdrop-blur-sm border-r border-primary/10">
        {sidebar.nav && <Nav nav={sidebar.nav} />}
        {sidebar.library && <Library library={sidebar.library} />}
        {sidebar.bottomNav && (
          <BottomNav nav={sidebar.bottomNav} className="mt-auto" />
        )}
      </SidebarContent>
      <SidebarFooter className="relative bg-gradient-to-b from-sidebar/95 to-primary/5 border-r border-primary/10">
        <SidebarUser account={sidebar.account} />
        {sidebar?.social && <Footer social={sidebar.social} />}
      </SidebarFooter>
    </Sidebar>
  );

  if (!withProvider) {
    return sidebarView;
  }

  return <SidebarProvider {...providerProps}>{sidebarView}</SidebarProvider>;
}
