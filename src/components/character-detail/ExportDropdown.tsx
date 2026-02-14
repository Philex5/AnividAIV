"use client";

import React, { useState, forwardRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  FileJson,
  FileDown,
  Sparkles,
  Shield,
  Loader2,
  Download,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ExportDropdownProps extends React.HTMLAttributes<HTMLDivElement> {
  characterUuid: string;
  characterName: string;
  isOwner: boolean;
  onExportCard?: () => void;
  pageData: any;
  themeColor?: string;
  className?: string;
  locale?: string;
}

type RarityType = "ssr" | "sr" | "r";
type ThemeType = "dark" | "light" | "cyberpunk" | "minimal" | "fantasy";
type ExportFormat = "json" | "markdown" | "pdf";

export const ExportDropdown = forwardRef<HTMLDivElement, ExportDropdownProps>(
  (
    {
      characterUuid,
      characterName,
      isOwner,
      onExportCard,
      pageData,
      themeColor,
      className,
      locale = "en",
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
    const [isCardGenerating, setIsCardGenerating] = useState(false);
    const [isDocGenerating, setIsDocGenerating] = useState(false);

    const [selectedRarity, setSelectedRarity] = useState<RarityType>("ssr");
    const [selectedTheme, setSelectedTheme] = useState<ThemeType>("fantasy");

    // 从 pagedata 获取翻译文本
    const getText = (path: string): string => {
      try {
        const keys = path.split(".");
        let current: any = pageData;
        for (const key of keys) {
          if (current && typeof current === "object" && key in current) {
            current = current[key];
          } else {
            if (path.startsWith("export.")) return getText(`create_mode.${path}`);
            return "";
          }
        }
        return typeof current === "string" ? current : "";
      } catch (error) {
        return "";
      }
    };

        const handleExportCard = () => {
          onExportCard?.();
          setIsOpen(false);
        };

    

        const handleExport = async (format: ExportFormat) => {

          if (!isOwner && format !== "pdf") return;

          try {

            setIsDocGenerating(true);

            const response = await fetch(`/api/export/character/${characterUuid}/${format}`);

            if (!response.ok) throw new Error();

    

            const blob = await response.blob();

            const url_download = window.URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url_download;

            const safeName =
              characterName.replace(/[^a-zA-Z0-9]/g, "_") ||
              getText("export.filename_fallback");

            link.download = `${safeName}_${format}.${format === "markdown" ? "md" : format}`;

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            window.URL.revokeObjectURL(url_download);

            toast.success(getText("export.export_success"));

          } catch (error) {

            toast.error(getText("export.export_failed"));

          } finally {

            setIsDocGenerating(false);

          }

        };

    

        return (

          <div className={className} ref={ref} {...props}>

            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>

              <DropdownMenuTrigger asChild>

                <Button

                  variant="ghost"

                  size="icon"

                  className={cn(

                    "h-10 w-10 rounded-xl transition-all duration-300",

                    isOpen ? "bg-primary/10 text-primary" : "text-primary/60 hover:text-primary hover:bg-primary/5"

                  )}

                >

                  <Download className="h-5 w-5" />

                </Button>

              </DropdownMenuTrigger>

              <DropdownMenuContent

                align="end"

                className="w-64 bg-background/95 backdrop-blur-3xl p-1.5 border-border shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200"

              >

                <div className="px-3 py-2">

                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">

                    {getText("export.title")}

                  </h4>

                </div>

    

                                <DropdownMenuItem

    

                                  onClick={handleExportCard}

    

                                  disabled={isCardGenerating}

    

                                  className="group cursor-pointer rounded-xl p-3 flex items-center gap-3 transition-all hover:bg-primary/10 focus:bg-primary/10 hover:text-primary focus:text-primary active:scale-95"

    

                                >

    

                                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 group-focus:bg-primary/20 transition-colors">

    

                                    {isCardGenerating ? (

    

                                      <Loader2 className="h-4 w-4 animate-spin" />

    

                                    ) : (

    

                                      <Zap className="h-5 w-5 fill-primary/10 group-hover:fill-primary/20 group-focus:fill-primary/20 transition-colors" />

    

                                    )}

    

                                  </div>

    

                                  <div className="flex-1">

    

                                    <div className="font-bold text-sm tracking-tight transition-colors">

    

                                      {isCardGenerating ? getText("export.generating") : getText("export.export_card")}

    

                                    </div>

    

                                    <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60 group-hover:text-primary/60 group-focus:text-primary/60 transition-colors">

    

                                      {getText("export.export_card_hint")}

    

                                    </div>

    

                                  </div>

    

                                </DropdownMenuItem>

    

                    

    

                

    

                                <DropdownMenuSeparator className="my-1.5 opacity-50" />

    

                

    

                    

    

                

    

                                {isOwner ? (

    

                

    

                                  <div className="space-y-0.5">

    

                

    

                                    {[

    

                                      { id: "pdf", icon: FileText, label: getText("export.file_profile_label"), sub: getText("export.file_profile_ext"), color: "text-blue-500" },

    

                                      { id: "json", icon: FileJson, label: getText("export.file_source_label"), sub: getText("export.file_source_ext"), color: "text-amber-500" },

    

                                      { id: "markdown", icon: FileDown, label: getText("export.file_archive_label"), sub: getText("export.file_archive_ext"), color: "text-emerald-500" }

    

                                    ].map((item) => (

    

                

    

                                      <DropdownMenuItem

    

                

    

                                        key={item.id}

    

                

    

                                        onClick={() => handleExport(item.id as ExportFormat)}

    

                

    

                                        disabled={isDocGenerating}

    

                

    

                                        className="group cursor-pointer rounded-xl p-2.5 flex items-center gap-3 transition-all hover:bg-primary/10 focus:bg-primary/10 hover:text-primary focus:text-primary active:scale-95"

    

                

    

                                      >

    

                

    

                                        <div className={cn("h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center transition-colors group-hover:bg-primary/20 group-focus:bg-primary/20", item.color)}>

    

                

    

                                          <item.icon className="h-4 w-4" />

    

                

    

                                        </div>

    

                

    

                                        <div className="flex-1">

    

                

    

                                          <div className="font-bold text-xs transition-colors">{item.label}</div>

    

                

    

                                        </div>

    

                

    

                                        <div className="text-[8px] font-black opacity-30 group-hover:opacity-60 group-focus:opacity-60 transition-opacity">{item.sub}</div>

    

                

    

                                      </DropdownMenuItem>

    

                

    

                                    ))}

    

                

    

                                  </div>

    

                

                ) : (

                  <div className="px-3 py-2 text-[9px] text-muted-foreground italic opacity-40 flex items-center gap-2">

                    <Shield className="h-3 w-3" />

                    {getText("export.owner_only")}

                  </div>

                )}

              </DropdownMenuContent>

            </DropdownMenu>

          </div>

        );

      }

    );

    
