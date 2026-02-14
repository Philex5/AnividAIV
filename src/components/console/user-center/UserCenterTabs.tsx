"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MyCreditsTab from "./MyCreditsTab";
import MySubscriptionTab from "./MySubscriptionTab";
import MyOrdersTab from "./MyOrdersTab";
import DangerZoneTab from "./DangerZoneTab";
import { RiVipCrownLine, RiCoinsLine, RiBillLine, RiErrorWarningLine } from "react-icons/ri";

interface UserCenterTabsProps {
  userUuid: string;
  pageData: any;
}

type TabValue = "subscription" | "credits" | "orders" | "danger";

export default function UserCenterTabs({
  userUuid,
  pageData,
}: UserCenterTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("subscription");

  return (
    <div className="w-full space-y-6">
      <Tabs 
        defaultValue="subscription" 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="w-full"
      >
        <div className="flex justify-center sm:justify-start mb-6">
          <TabsList className="inline-flex items-center rounded-full glass-panel p-1.5 h-auto gap-1 bg-transparent border-none shadow-none">
            <TabsTrigger 
              value="subscription" 
              className="relative flex h-10 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:text-foreground/80 text-muted-foreground gap-2 border-none ring-0 focus-visible:ring-0"
            >
              <RiVipCrownLine className="text-lg" />
              <span className="font-bold">{pageData?.tabs?.my_subscription || "Subscription"}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="credits" 
              className="relative flex h-10 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:text-foreground/80 text-muted-foreground gap-2 border-none ring-0 focus-visible:ring-0"
            >
              <RiCoinsLine className="text-lg" />
              <span className="font-bold">{pageData?.tabs?.my_credits || "Credits"}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="relative flex h-10 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:text-foreground/80 text-muted-foreground gap-2 border-none ring-0 focus-visible:ring-0"
            >
              <RiBillLine className="text-lg" />
              <span className="font-bold">{pageData?.tabs?.my_orders || "Orders"}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="danger" 
              className="relative flex h-10 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold transition-all data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground data-[state=active]:shadow-sm hover:text-foreground/80 text-muted-foreground gap-2 border-none ring-0 focus-visible:ring-0"
            >
              <RiErrorWarningLine className="text-lg" />
              <span className="font-bold">{pageData?.tabs?.danger_zone || "Danger"}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="transition-all duration-300 ease-in-out">
          <TabsContent value="subscription" className="mt-0 outline-none focus-visible:ring-0">
            <MySubscriptionTab userUuid={userUuid} pageData={pageData} />
          </TabsContent>
          <TabsContent value="credits" className="mt-0 outline-none focus-visible:ring-0">
            <MyCreditsTab userUuid={userUuid} pageData={pageData} />
          </TabsContent>
          <TabsContent value="orders" className="mt-0 outline-none focus-visible:ring-0">
            <MyOrdersTab userUuid={userUuid} pageData={pageData} />
          </TabsContent>
          <TabsContent value="danger" className="mt-0 outline-none focus-visible:ring-0">
            <DangerZoneTab userUuid={userUuid} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
