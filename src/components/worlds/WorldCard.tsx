"use client";

import { useState } from "react";
import { ArrowRight, Trash2, Heart, Bookmark, MessageCircle, Share2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { OCworldWithCount } from "@/models/oc-world";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorldSocialActions } from "@/components/worlds/WorldSocialActions";
import { isAbsoluteUrl, toImageUrl } from "@/lib/r2-utils";
import { isImageUuid } from "@/lib/image-resolve";
import { getWorldGenreLabel } from "@/components/worlds/world-genre";

interface WorldCardProps {
  world: OCworldWithCount;
  isOwner?: boolean;
  onDelete?: (uuid: string) => Promise<void>;
  translations: any;
}

export function WorldCard({
  world,
  isOwner = false,
  onDelete,
  translations,
}: WorldCardProps) {
  const themeColor = (world.theme_colors as any)?.primary || "#FF6B9D";
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isPublic = world.visibility_level === "public";
  const cardCopy = translations?.card || {};
  const tGenres = useTranslations("worlds.genres");
  const { displayUrl: coverDisplayUrl } = useResolvedImageUrl(world.cover_url);
  const { displayUrl: creatorAvatarUrl } = useResolvedImageUrl(
    world.creator?.avatar_url || null,
  );
  const labels = {
    like:
      translations?.social?.labels?.like ||
      translations?.actions?.labels?.like ||
      "",
    favorite:
      translations?.social?.labels?.favorite ||
      translations?.actions?.labels?.favorite ||
      "",
    comment:
      translations?.social?.labels?.comment ||
      translations?.actions?.labels?.comment ||
      "",
    share:
      translations?.social?.labels?.share ||
      translations?.actions?.labels?.share ||
      "",
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  // Character avatars logic
  const maxAvatars = 5;
  const displayCharacters = world.characters?.slice(0, maxAvatars) || [];
  const hasMoreCharacters = (world.character_count || 0) > maxAvatars;
  const moreCount = (world.character_count || 0) - maxAvatars;
  const genreLabel = getWorldGenreLabel(world.genre, tGenres);

  return (
    <div className="group relative h-full flex flex-col rounded-3xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <Link href={`/worlds/${world.uuid}`} className="flex-1 flex flex-col">
        {/* Card Header: Cover Image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {coverDisplayUrl ? (
            <img
              src={coverDisplayUrl}
              alt={world.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div
              className="w-full h-full opacity-10"
              style={{
                backgroundColor: themeColor,
                backgroundImage:
                  "radial-gradient(circle, currentColor 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
          )}

          <div
            className="absolute bottom-0 left-0 w-full h-1 opacity-60"
            style={{ backgroundColor: themeColor }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Genre Badge on Cover */}
          {genreLabel && (
            <div className="absolute top-4 left-4 z-10">
              <div 
                className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20 shadow-lg text-white"
                style={{ backgroundColor: `${themeColor}cc` }}
              >
                {genreLabel}
              </div>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-4 px-6 pt-4 mb-1">
            <h3 className="text-lg font-black tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {world.name}
            </h3>
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>

          <p className="px-6 text-sm text-muted-foreground/80 line-clamp-2 mb-3 flex-1 leading-relaxed font-medium">
            {world.description || cardCopy.description_fallback || ""}
          </p>
        </div>
      </Link>

      {/* Card Footer: integrated social actions and creator info */}
      <div className="relative flex items-end justify-between pl-1 pr-2 pb-1 pt-3 border-t border-border/10 bg-card/50">
        {/* Creator Info - Bottom Left */}
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8 border border-border/40 bg-background/50 shadow-inner">
            <AvatarImage
              src={creatorAvatarUrl}
              alt={cardCopy.creator_label || ""}
              className="object-cover"
            />
            <AvatarFallback className="text-[10px] font-bold">
              {(world.creator?.display_name || cardCopy.creator_fallback || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-bold text-foreground/70 truncate max-w-[120px]">
            {world.creator?.display_name || cardCopy.creator_fallback || ""}
          </span>
        </div>

        {/* Right Side: Avatars + Social Actions */}
        <div className="flex flex-col items-end gap-3">
          {/* Character Avatars Row - Above Social Actions */}
          {displayCharacters.length > 0 && (
            <div className="flex items-center -space-x-2">
              {displayCharacters.map((char, i) => {
                const charImageUrl = char.thumbnail_mobile || char.image_url;
                const displayUrl = charImageUrl && !isImageUuid(charImageUrl) 
                  ? toImageUrl(charImageUrl) 
                  : charImageUrl;

                return (
                  <div 
                    key={char.uuid} 
                    className="w-7 h-7 rounded-full border-2 border-card overflow-hidden bg-muted shadow-sm ring-1 ring-black/5"
                    style={{ zIndex: maxAvatars - i }}
                  >
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src={displayUrl || undefined}
                        alt={char.name || ""}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-[8px] font-bold">
                        {char.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                );
              })}
              {hasMoreCharacters && (
                <div 
                  className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground shadow-sm ring-1 ring-black/5"
                  style={{ zIndex: 0 }}
                >
                  +{moreCount}
                </div>
              )}
            </div>
          )}

          {/* Social Actions Row */}
          <div className="flex items-center">
            {!isOwner && isPublic && (
              <WorldSocialActions
                worldUuid={world.uuid}
                worldName={world.name}
                isPublic={isPublic}
                likeCount={world.like_count}
                favoriteCount={world.favorite_count}
                liked={world.liked}
                favorited={world.favorited}
                size="sm"
                translations={translations}
                themeColor={themeColor}
              />
            )}

            {isOwner && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5" title={labels.like}>
                  <Heart className="h-3.5 w-3.5" />
                  <span className="font-bold tabular-nums text-foreground">
                    {world.like_count || 0}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5" title={labels.favorite}>
                  <Bookmark className="h-3.5 w-3.5" />
                  <span className="font-bold tabular-nums text-foreground">
                    {world.favorite_count || 0}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5" title={labels.comment}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="font-bold tabular-nums text-foreground">
                    {world.comment_count || 0}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5" title={labels.share}>
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="font-bold tabular-nums text-foreground">
                    {world.share_count || 0}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Owner Actions */}
      {isOwner && onDelete && (
        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <button 
                onClick={handleDelete}
                className="p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white shadow-lg backdrop-blur-sm transition-all hover:scale-110"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>
                  {cardCopy.delete_title || ""}
                </DialogTitle>
                <DialogDescription>
                  {cardCopy.delete_description || ""}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(false);
                  }}
                >
                  {cardCopy.delete_cancel || ""}
                </Button>
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(world.uuid);
                    setIsDeleteDialogOpen(false);
                  }}
                >
                  {cardCopy.delete_confirm || ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
