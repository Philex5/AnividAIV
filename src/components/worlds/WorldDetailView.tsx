"use client";

import { useEffect } from "react";
import { 
  Users, 
  Calendar, 
  Map, 
  Cpu, 
  Zap, 
  Edit, 
  Layers,
  Coins,
  Gem,
  Shield,
  Wand2,
  Heart,
  Sword,
  Book,
  Scale,
  MapPin,
  Ghost
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Coins,
  Gem,
  Users,
  MapPin,
  Shield,
  Sword,
  Zap,
  Wand2,
  Cpu,
  Book,
  Scale,
  Heart,
  Ghost,
  Layers
};
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { OCworldWithCount } from "@/models/oc-world";
import { WorldSocialActions } from "@/components/worlds/WorldSocialActions";
import { CommentSection } from "@/components/community/comment/CommentSection";
import { WorldThemeProvider } from "@/contexts/WorldContext";
import { cn } from "@/lib/utils";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import { getWorldGenreLabel } from "@/components/worlds/world-genre";

interface WorldDetailViewProps {
  world: OCworldWithCount & {
    characters?: any[];
    creator?: {
      uuid?: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  isCreator?: boolean;
  pageData?: any;
}

export function WorldDetailView({
  world,
  isCreator,
  pageData,
}: WorldDetailViewProps) {
  const locale = useLocale();
  const tGenres = useTranslations("worlds.genres");
  // Extract custom theme color or use default
  const themeColor = (world.theme_colors as any)?.primary || "#FF6B9D";
  const secondaryColor = (world.theme_colors as any)?.secondary || themeColor;
  const detailCopy = pageData?.detail || {};
  const infoLabels = detailCopy?.info?.labels || {};
  const infoFallbacks = detailCopy?.info?.fallbacks || {};
  const { displayUrl: coverDisplayUrl } = useResolvedImageUrl(world.cover_url);
  const { displayUrl: creatorAvatarUrl } = useResolvedImageUrl(
    world.creator?.avatar_url || null,
  );
  const genreLabel = getWorldGenreLabel(world.genre, tGenres);

  useEffect(() => {
    if (!world.cover_url) return;
    console.info("World cover display url:", coverDisplayUrl || "");
  }, [world.cover_url, coverDisplayUrl]);

  // Custom attributes from extra field
  const extraAttributes = world.extra ? Object.entries(world.extra) : [];
  const tags = Array.isArray(world.tags) ? (world.tags as string[]) : [];

  return (
    <WorldThemeProvider
      theme={{ primary: themeColor, secondary: secondaryColor }}
    >
      <div className="space-y-6 relative">
        {/* Main Card Container */}
        <div
          className="rounded-3xl border-2 border-border/40 shadow-xl overflow-hidden bg-card/80 backdrop-blur-md transition-all flex flex-col relative group/main"
          style={{
            borderColor: themeColor ? `${themeColor}40` : undefined,
          }}
        >
          {/* Notion-style Cover Section - Increased height and adjusted for card layout */}
          <div className="relative h-[35vh] min-h-72 md:h-[55vh] lg:h-[60vh] w-full overflow-hidden bg-muted/20">
            {coverDisplayUrl ? (
              <img
                src={coverDisplayUrl}
                alt={world.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover/main:scale-105"
              />
            ) : (
              <div
                className="absolute inset-0 w-full h-full opacity-10"
                style={{
                  backgroundColor: themeColor,
                  backgroundImage:
                    "radial-gradient(circle, currentColor 2px, transparent 2px)",
                  backgroundSize: "32px 32px",
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          </div>

          {/* Main Content Area - Moved down with reduced negative margin */}
          <div className="px-4 sm:px-8 pb-12 relative">
            {/* Header Section (Title & Actions) */}
            <div className="relative -mt-12 md:-mt-16 pt-4 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {world.visibility_level === "private" && (
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-primary/20 text-primary bg-primary/5"
                    >
                      {detailCopy.private_badge || ""}
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground tracking-tight">
                  {world.name}
                </h1>
              </div>

              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium max-w-4xl">
                {world.description}
              </p>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
                {/* Creator Info & Tags */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground/60">
                        {detailCopy.created_by || ""}
                      </span>
                      <Link
                        href={`/user/${world.creator?.uuid}`}
                        className="flex items-center group/creator"
                      >
                        <Avatar className="w-8 h-8 border border-border/40 bg-muted/20 transition-transform group-hover/creator:scale-110">
                          <AvatarImage
                            src={creatorAvatarUrl}
                            alt={world.creator?.display_name || detailCopy.unknown_creator || ""}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-[10px] font-bold">
                            {(world.creator?.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-sm font-medium text-muted-foreground/60">
                      {new Date(world.created_at || "").toLocaleDateString(
                        locale,
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </span>
                  </div>

                  {/* Tags Row */}
                  {tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="rounded-full px-3 py-0.5 text-[11px] font-bold border-none"
                            style={{
                              backgroundColor: themeColor ? `${themeColor}15` : undefined,
                              color: themeColor,
                            }}
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <WorldSocialActions
                    worldUuid={world.uuid}
                    worldName={world.name}
                    isPublic={world.visibility_level === "public"}
                    likeCount={world.like_count}
                    favoriteCount={world.favorite_count}
                    liked={world.liked}
                    favorited={world.favorited}
                    translations={pageData}
                    themeColor={themeColor}
                  />
                  {isCreator && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                    >
                      <Link href={`/worlds/${world.uuid}/edit`}>
                        <Edit className="w-5 h-5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-16">
              {/* Left Column: Core Info */}
              <div className="lg:col-span-2 space-y-16">
                {/* Setting Overview */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black tracking-tight uppercase tracking-[0.1em]">
                      {detailCopy.section_title || ""}
                    </h2>
                    <div
                      className="h-1 flex-1 rounded-full opacity-20"
                      style={{ backgroundColor: themeColor }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard
                      icon={<Book className="w-4 h-4" />}
                      label={infoLabels.genre || "Genre"}
                      value={genreLabel || infoFallbacks.genre || ""}
                      themeColor={themeColor}
                    />
                    <InfoCard
                      icon={<Users className="w-4 h-4" />}
                      label={infoLabels.species || ""}
                      value={
                        Array.isArray(world.species) && world.species.length > 0
                          ? world.species.join(", ")
                          : infoFallbacks.species || ""
                      }
                      themeColor={themeColor}
                    />
                    <InfoCard
                      icon={<Zap className="w-4 h-4" />}
                      label={infoLabels.climate || ""}
                      value={world.climate || infoFallbacks.climate || ""}
                      themeColor={themeColor}
                    />
                    <InfoCard
                      icon={<Cpu className="w-4 h-4" />}
                      label={infoLabels.tech || ""}
                      value={world.tech_magic_system || infoFallbacks.tech || ""}
                      themeColor={themeColor}
                    />
                    <InfoCard
                      icon={<Map className="w-4 h-4" />}
                      label={infoLabels.regions || ""}
                      value={
                        Array.isArray(world.regions) && world.regions.length > 0
                          ? world.regions.join(", ")
                          : infoFallbacks.regions || ""
                      }
                      themeColor={themeColor}
                    />

                    {/* Extra Attributes */}
                    {extraAttributes.map(([key, val]) => {
                      const isStructured = val && typeof val === "object" && "value" in val;
                      const displayValue = isStructured ? (val as any).value : String(val);
                      const iconName = isStructured ? (val as any).icon : null;
                      const CustomIcon = (iconName && ICON_MAP[iconName]) || Layers;

                      return (
                        <InfoCard
                          key={key}
                          icon={<CustomIcon className="w-4 h-4" />}
                          label={key}
                          value={displayValue}
                          themeColor={themeColor}
                        />
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Right Column: Statistics & Characters */}
              <div className="h-full">
                <div
                  className="rounded-3xl border border-border/50 p-8 h-full bg-muted/5 backdrop-blur-sm"
                  style={{
                    borderColor: themeColor ? `${themeColor}20` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black uppercase tracking-widest text-foreground/80">
                      {detailCopy.characters_title || ""}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-black"
                      style={{
                        backgroundColor: themeColor
                          ? `${themeColor}20`
                          : undefined,
                        color: themeColor,
                      }}
                    >
                      {world.character_count || 0}
                    </Badge>
                  </div>

                  {world.characters && world.characters.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-4">
                      {world.characters.map((char) => (
                        <Link
                          key={char.uuid}
                          href={`/characters/${char.uuid}`}
                          title={char.name || ""}
                          className="group relative"
                        >
                          <CharacterAvatar char={char} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-border/40 rounded-2xl">
                      <p className="text-sm font-medium text-muted-foreground">
                        {detailCopy.characters_empty || ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Divider Section */}
        {!isCreator && (
          <div className="h-16 relative flex items-center justify-center pointer-events-none">
            <div
              className="absolute inset-0 bg-linear-to-b from-transparent via-primary/5 to-transparent h-px w-full top-1/2 opacity-50"
              style={{
                background: themeColor
                  ? `linear-gradient(to right, transparent, ${themeColor}20, transparent)`
                  : undefined,
              }}
            ></div>
            <div className="relative z-10 flex items-center gap-3 px-4 bg-card/60 backdrop-blur-sm border border-border/40 rounded-full h-5">
              <div
                className="w-1 h-1 rounded-full animate-pulse"
                style={{ backgroundColor: themeColor }}
              ></div>
              <div className="w-16 h-px bg-linear-to-r from-transparent via-border to-transparent"></div>
              <div
                className="w-1.5 h-1.5 rotate-45 border"
                style={{ borderColor: `${themeColor}60` }}
              ></div>
              <div className="w-16 h-px bg-linear-to-r from-transparent via-border to-transparent"></div>
              <div
                className="w-1 h-1 rounded-full animate-pulse"
                style={{ backgroundColor: secondaryColor }}
              ></div>
            </div>
          </div>
        )}

        {/* External Content (Comments) */}
        {world.visibility_level === "public" && (
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-0">
            <div className="rounded-3xl p-6 sm:p-8 shadow-none bg-muted/10 backdrop-blur-sm border border-border/20">
              <div className="flex items-center gap-3 mb-6 opacity-60">
                <div className="h-px flex-1 bg-linear-to-r from-transparent to-border"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {detailCopy.community_title || ""}
                </span>
                <div className="h-px flex-1 bg-linear-to-l from-transparent to-border"></div>
              </div>
              <CommentSection
                artId={world.uuid}
                artType="world"
                commentCount={world.comment_count || 0}
              />
            </div>
          </div>
        )}
      </div>
    </WorldThemeProvider>
  );
}

function CharacterAvatar({ char }: { char: any }) {
  const { displayUrl } = useResolvedImageUrl(
    char.thumbnail_mobile || char.image_url,
    "mobile",
  );

  return (
    <div className="aspect-square rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary/50 transition-all bg-muted/20 shadow-sm">
      <Avatar className="w-full h-full">
        <AvatarImage
          src={displayUrl}
          alt={char.name}
          className="object-cover transition-transform group-hover:scale-110"
        />
        <AvatarFallback className="text-xs font-bold">
          {char.name?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  themeColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  themeColor: string;
}) {
  return (
    <div
      className="flex items-start gap-5 p-6 rounded-4xl border border-border/40 transition-all group hover:bg-(--hover-bg) hover:border-(--hover-border) bg-card/40"
      style={
        {
          "--hover-bg": `${themeColor}05`,
          "--hover-border": `${themeColor}40`,
        } as any
      }
    >
      <div
        className="pt-1 transition-colors text-muted-foreground group-hover:text-[var(--hover-color,hsl(var(--primary)))]"
        style={{ "--hover-color": themeColor } as any}
      >
        {icon}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          {label}
        </p>
        <p className="text-base font-bold text-foreground leading-snug">
          {value}
        </p>
      </div>
    </div>
  );
}
