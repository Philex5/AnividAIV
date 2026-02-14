import {
  useSidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Brand as BrandType } from "@/types/blocks/base";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getCreamyDecorationUrl } from "@/lib/asset-loader";

export default function ({ brand }: { brand: BrandType }) {
  const { open } = useSidebar();
  const padUrl = getCreamyDecorationUrl("pad");

  return (
    <SidebarHeader className={`pt-4 ${open ? "px-4" : "px-2"}`}>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-center h-10">
              <Link
                href={brand?.url as any}
                className="flex items-center justify-center w-full"
              >
                {open ? (
                  brand?.logo && (
                    <Image
                      src={brand?.logo?.src as any}
                      alt={brand?.title as string}
                      width={120}
                      height={32}
                      className="h-8 w-auto object-contain"
                    />
                  )
                ) : (
                  <Image
                    src={padUrl}
                    alt="Pad"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                )}
              </Link>
            </div>
            <div className="flex items-center justify-end pb-2">
              <SidebarTrigger />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
