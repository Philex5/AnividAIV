"use client";

import {
  Select,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

import { MdLanguage } from "react-icons/md";
import { localeNames } from "@/i18n/locale";

export default function ({ isIcon = false }: { isIcon?: boolean }) {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const pathname = usePathname();
  
  // 安全地使用 useSidebar，在非 SidebarProvider 上下文中返回默认值
  const getSidebarState = () => {
    try {
      const { open } = useSidebar();
      return { open, inSidebar: true };
    } catch {
      return { open: true, inSidebar: false }; // 默认显示文字
    }
  };
  
  const { open, inSidebar } = getSidebarState();

  const handleSwitchLanguage = (value: string) => {
    if (value !== locale) {
      let newPathName = pathname.replace(`/${locale}`, `/${value}`);
      if (!newPathName.startsWith(`/${value}`)) {
        newPathName = `/${value}${newPathName}`;
      }
      router.push(newPathName);
    }
  };

  return (
    <Select value={locale} onValueChange={handleSwitchLanguage}>
      <SelectPrimitive.Trigger className="flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors outline-none">
        <MdLanguage className="text-lg" />
      </SelectPrimitive.Trigger>
      <SelectContent className="z-50">
        {Object.keys(localeNames).map((key: string) => {
          const name = localeNames[key];
          return (
            <SelectItem className="cursor-pointer px-4" key={key} value={key}>
              {name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
