import { ReactNode, useState, useEffect } from "react";
import { Sidebar as SidebarType } from "@/types/blocks/sidebar";
import AppHeader from "@/components/blocks/app-header";
import AppSidebar from "@/components/blocks/app-sidebar";

export default function AppLayout({
  children,
  sidebar,
  isFullWidth = false,
}: {
  children: ReactNode;
  sidebar: SidebarType;
  isFullWidth?: boolean;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved === "true";
    }
    return false;
  });

  // Sync sidebar state to localStorage and dispatch event for other components
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", isCollapsed.toString());
    // Dispatch custom event for components that listen for sidebar state changes
    window.dispatchEvent(new CustomEvent("sidebar-state-changed", {
      detail: { isCollapsed }
    }));
  }, [isCollapsed]);

  return (
    <div className="min-h-screen bg-transparent">
      {/* App Header */}
      <AppHeader
        brand={sidebar.brand}
        onMenuClick={() => setIsMobileSidebarOpen(true)}
        isCollapsed={isCollapsed}
      />

      <div className="flex">
        {/* Desktop Sidebar Placeholder & Container */}
        <div
          className={`hidden lg:block transition-all duration-300 shrink-0 ${
            isCollapsed ? "w-16" : "w-52"
          }`}
        >
          <AppSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </div>

        {/* Mobile Sidebar Overlay - Only shown when open */}
        {isMobileSidebarOpen && (
          <AppSidebar
            isMobile={true}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 transition-all duration-300 overflow-x-hidden ${
            isFullWidth
              ? "h-[calc(100vh-56px)] min-h-[calc(100vh-56px)] overflow-y-hidden"
              : "min-h-[calc(100vh-56px)]"
          }`}
        >
          {isFullWidth ? (
            children
          ) : (
            <div className="min-h-full px-4 md:px-6 lg:px-8 pt-8 pb-4">
              <div className="w-full max-w-full md:max-w-7xl lg:max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1920px] mx-auto min-h-full">
                {children}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
