"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CharacterDetailPage } from "@/types/pages/landing";
import type { CharacterModules } from "@/types/oc";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Download, 
  Loader2,
} from "lucide-react";

interface ShareCardDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  character: {
    uuid: string;
    name: string;
  };
  modules?: CharacterModules;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  pageData: CharacterDetailPage;
  themeColor?: string;
  locale?: string;
}

export function ShareCardDialog({
  open,
  onOpenChange,
  character,
  modules,
  avatarUrl,
  profileImageUrl,
  pageData,
  themeColor,
  locale = "en",
}: ShareCardDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const shareCopy = pageData.share_card;
  // 使用统一的分享卡片，包含语言信息，并增加 force=true 以强制刷新缓存
  const ogImageUrl = `/api/og/character/${character.uuid}?locale=${locale}&force=true&t=${Date.now()}`;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(ogImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (shareCopy?.download_filename || "")
        .replace("{name}", character.name || "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(shareCopy?.download_success || "");
    } catch (error) {
      console.error("Failed to download share card", error);
      toast.error(shareCopy?.download_error || "");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-card border-white/10 p-0 overflow-hidden shadow-2xl rounded-2xl gap-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
        
        <DialogHeader className="p-6 pb-2 relative z-10">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {shareCopy?.title || ""}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6 relative z-10">
          {/* Card Preview with Frame */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-700" 
                 style={{ backgroundColor: themeColor ? `${themeColor}33` : undefined }} />
            
            <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-xl border border-white/20 shadow-xl transition-all duration-500">
              {/* Glossy Effect */}
              <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-black/10 opacity-30" />
              
              <img
                src={ogImageUrl}
                alt={character.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button 
              type="button" 
              onClick={handleDownload}
              disabled={isDownloading}
              size="sm"
              className="px-6 h-10 rounded-xl bg-primary hover:bg-primary/90 transition-all duration-300 font-bold uppercase tracking-wider group"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                  {shareCopy?.download || ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
