import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";

export default async function ConsoleLayout({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: Sidebar;
}) {
  return (
    <div className="container max-w-6xl py-8 mx-auto">
      <div className="w-full space-y-6 p-4 pb-16 block">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
