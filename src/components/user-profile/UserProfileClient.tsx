"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { ReferenceImageUpload } from "@/components/anime-generator/ReferenceImageUpload";
import { motion } from "framer-motion";
import { assetLoader } from "@/lib/asset-loader";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useResolvedImageUrl, useResolvedImageUrls } from "@/hooks/useResolvedImage";
import type { PublicUserProfile } from "@/services/user-profile";
import type { CharacterWithImages } from "@/services/character";
import type { OCworldWithCount } from "@/models/oc-world";
import type { ArtworkListItem } from "@/types/pages/my-artworks";
import type { CommunityPage, ArtworkPreview } from "@/types/pages/community";
import { ArtworkCard } from "@/components/community/ArtworkCard";
import { ArtworkDetailModal } from "@/components/community/detail/ArtworkDetailModal";
import { CommentSection } from "@/components/community/comment/CommentSection";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Settings2,
  Image as ImageIcon,
  Palette,
  Users,
  Globe,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { getMemberBadgeUrl } from "@/lib/asset-loader";
import { GenderIcon } from "@/components/icon/gender-icon";

interface UserProfileClientProps {
  profile: PublicUserProfile;
  characters: CharacterWithImages[];
  worlds: OCworldWithCount[];
  artworks: ArtworkListItem[];
  pageData: any;
  communityPageData: CommunityPage;
}

export default function UserProfileClient({
  profile,
  characters,
  worlds,
  artworks: initialArtworks,
  pageData,
  communityPageData,
}: UserProfileClientProps) {
  const [profileState, setProfileState] = useState(profile);
  const [artworks, setArtworks] = useState(initialArtworks);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [selectedArtworkSnapshot, setSelectedArtworkSnapshot] =
    useState<ArtworkPreview | null>(null);

  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatar_url || null
  );
  const [gender, setGender] = useState<string | null>(profile.gender || null);
  const [bio, setBio] = useState(profile.bio || "");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(
    profile.background_url || null
  );
  const { displayUrl: avatarDisplayUrl } = useResolvedImageUrl(
    profileState.avatar_url,
  );
  const { displayUrl: backgroundDisplayUrl } = useResolvedImageUrl(
    profileState.background_url,
  );
  const { resolvedMap: worldCoverMap } = useResolvedImageUrls(
    worlds.map((world) => world.cover_url),
    "desktop",
  );

  useEffect(() => {
    if (profileDialogOpen) {
      setDisplayName(profileState.display_name || "");
      setAvatarUrl(profileState.avatar_url || null);
      setGender(profileState.gender || null);
      setBio(profileState.bio || "");
    }
  }, [profileDialogOpen, profileState]);

  useEffect(() => {
    if (backgroundDialogOpen) {
      setBackgroundUrl(profileState.background_url || null);
    }
  }, [backgroundDialogOpen, profileState]);

  const initials = useMemo(() => {
    const name = profileState.display_name || "";
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  }, [profileState.display_name]);

  const uploadPageData = useMemo(
    () => ({ reference: pageData.reference || {} }) as any,
    [pageData]
  );

  const isSub = useMemo(() => {
    return (
      profileState.is_sub &&
      profileState.sub_expired_at &&
      new Date(profileState.sub_expired_at) > new Date()
    );
  }, [profileState.is_sub, profileState.sub_expired_at]);

  const membershipLevel = useMemo(() => {
    if (isSub && profileState.sub_plan_type && profileState.sub_plan_type.trim()) {
      return profileState.sub_plan_type.trim();
    }
    return isSub ? "pro" : "free";
  }, [isSub, profileState.sub_plan_type]);

  const handleUpdateProfile = async () => {
    setIsSavingProfile(true);
    try {
      const payload: {
        display_name: string;
        avatar_url: string | null;
        bio: string;
        gender?: string;
      } = {
        display_name: displayName,
        avatar_url: avatarUrl,
        bio,
      };
      if (gender) {
        payload.gender = gender;
      }
      const response = await fetch(`/api/users/${profileState.uuid}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (result && result.message) ||
          pageData.errors?.update_failed ||
          "Failed to update profile";
        throw new Error(message);
      }

      const updated = result?.data;
      if (updated) {
        setProfileState((prev) => ({ ...prev, ...updated }));
      }

      toast.success(pageData.profile_form?.success || "Profile updated");
      setProfileDialogOpen(false);
    } catch (error: any) {
      toast.error(
        error.message || pageData.errors?.update_failed || "Failed to update profile"
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateBackground = async () => {
    setIsSavingBackground(true);
    try {
      const response = await fetch(`/api/users/${profileState.uuid}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          background_url: backgroundUrl,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (result && result.message) ||
          pageData.errors?.update_failed ||
          "Failed to update profile";
        throw new Error(message);
      }

      const updated = result?.data;
      if (updated) {
        setProfileState((prev) => ({ ...prev, ...updated }));
      }

      toast.success(
        pageData.background_form?.success || "Background updated"
      );
      setBackgroundDialogOpen(false);
    } catch (error: any) {
      toast.error(
        error.message || pageData.errors?.update_failed || "Failed to update profile"
      );
    } finally {
      setIsSavingBackground(false);
    }
  };

  const handleToggleLike = useCallback(async (id: string, target: boolean) => {
    setArtworks(prev => prev.map(item => {
      if (item.uuid !== id) return item;
      return {
        ...item,
        liked: target,
        like_count: Math.max(0, item.like_count + (target ? 1 : -1))
      };
    }));

    try {
      const artwork = initialArtworks.find(a => a.uuid === id);
      const artworkType = artwork?.type || "image";
      const response = await fetch(
        `/api/community/artworks/${id}/like?artworkType=${artworkType}`,
        { method: target ? "POST" : "DELETE" }
      );
      if (!response.ok) throw new Error();
    } catch (error) {
      toast.error(communityPageData.toasts.likeFailed);
      setArtworks(prev => prev.map(item => {
        if (item.uuid !== id) return item;
        return {
          ...item,
          liked: !target,
          like_count: Math.max(0, item.like_count + (target ? -1 : 1))
        };
      }));
    }
  }, [initialArtworks, communityPageData]);

  const handleToggleFavorite = useCallback(async (id: string, target: boolean) => {
    setArtworks(prev => prev.map(item => {
      if (item.uuid !== id) return item;
      return { ...item, favorited: target };
    }));

    try {
      const artwork = initialArtworks.find(a => a.uuid === id);
      const artworkType = artwork?.type || "image";
      const response = await fetch(
        `/api/community/artworks/${id}/favorite?artworkType=${artworkType}`,
        { method: target ? "POST" : "DELETE" }
      );
      if (!response.ok) throw new Error();
    } catch (error) {
      toast.error(communityPageData.toasts.favoriteFailed);
      setArtworks(prev => prev.map(item => {
        if (item.uuid !== id) return item;
        return { ...item, favorited: !target };
      }));
    }
  }, [initialArtworks, communityPageData]);

  const mappedArtworks = useMemo(
    () =>
      artworks.map((item) => {
        const isVideo = item.type === "video";
        const mediaUrls = isVideo
          ? [item.video_url, item.thumbnail_url].filter(
              (url): url is string => Boolean(url && url.trim())
            )
          : [item.thumbnail_url].filter(
              (url): url is string => Boolean(url && url.trim())
            );

        return {
          id: item.uuid,
          type: item.type,
          title: item.title || "",
          cover_url: item.thumbnail_url,
          media_urls: mediaUrls,
          author: {
            id: profileState.uuid,
            name: profileState.display_name,
            avatar: avatarDisplayUrl || "",
          },
          stats: {
            likes: item.like_count,
            views: 0,
            comments: 0,
            favorites: item.favorite_count,
          },
          meta: {
            duration_seconds: item.duration_seconds,
          },
          liked: item.liked,
          favorited: item.favorited,
          created_at: item.created_at,
        } as ArtworkPreview;
      }),
    [artworks, profileState, avatarDisplayUrl]
  );

  useEffect(() => {
    if (!selectedArtworkId) {
      setSelectedArtworkSnapshot(null);
      return;
    }
    const current = mappedArtworks.find((item) => item.id === selectedArtworkId);
    if (current) {
      setSelectedArtworkSnapshot(current);
    }
  }, [mappedArtworks, selectedArtworkId]);

  const activeArtwork = useMemo(() => {
    if (!selectedArtworkId) return null;
    return (
      mappedArtworks.find((item) => item.id === selectedArtworkId) ||
      selectedArtworkSnapshot
    );
  }, [mappedArtworks, selectedArtworkId, selectedArtworkSnapshot]);

  const handleOpenDetail = useCallback((artwork: ArtworkPreview) => {
    setSelectedArtworkId(artwork.id);
    setSelectedArtworkSnapshot(artwork);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedArtworkId(null);
    setSelectedArtworkSnapshot(null);
  }, []);

  const displayStats = useMemo(() => ({
    public_artworks: artworks.length,
    public_characters: characters.length,
    public_worlds: worlds.length,
  }), [artworks.length, characters.length, worlds.length]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 -mt-4 md:-mt-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden md:rounded-3xl border-x-0 md:border border-border/50 bg-card">
        <div
          className={cn(
            "relative h-48 md:h-72 bg-gradient-to-br from-primary/10 via-background to-secondary/10",
            backgroundDisplayUrl ? "bg-cover bg-center" : ""
          )}
          style={
            backgroundDisplayUrl
              ? { backgroundImage: `url(${backgroundDisplayUrl})` }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          
          {profileState.is_self && (
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-md text-foreground hover:bg-white dark:hover:bg-white/30 border-none shadow-sm"
                    onClick={() => setBackgroundDialogOpen(true)}
                  >
                    <ImageIcon className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{pageData.buttons?.set_background}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-md text-foreground hover:bg-white dark:hover:bg-white/30 border-none shadow-sm"
                    onClick={() => setProfileDialogOpen(true)}
                  >
                    <Settings2 className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{pageData.buttons?.update_profile}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="relative px-6 pb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16 md:-mt-20">
            <div className="relative shrink-0 mx-auto md:mx-0">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-2xl">
                {avatarDisplayUrl ? (
                  <AvatarImage
                    src={avatarDisplayUrl}
                    alt={profileState.display_name}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-muted text-4xl font-bold">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 text-center md:text-left">
              <div className="space-y-2.5">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center justify-center md:justify-start gap-3">
                  {profileState.display_name}
                  {isSub && (
                    <Image
                      src={getMemberBadgeUrl(`${membershipLevel}_member`)}
                      alt={`${membershipLevel} Member`}
                      width={32}
                      height={32}
                      className="drop-shadow-sm shrink-0"
                    />
                  )}
                  {profileState.gender && (
                    <GenderIcon gender={profileState.gender} className="text-2xl" />
                  )}
                </h1>
                
                {profileState.bio && (
                  <p className="max-w-xl text-sm md:text-base font-medium text-muted-foreground leading-relaxed">
                    {profileState.bio}
                  </p>
                )}

                <div className="flex items-center justify-center md:justify-start gap-6 pt-1">
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-lg font-bold">{displayStats.public_artworks}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{pageData.sections?.artworks}</span>
                  </div>
                  <div className="h-8 w-px bg-border/50 hidden md:block" />
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-lg font-bold">{displayStats.public_characters}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{pageData.sections?.characters}</span>
                  </div>
                  <div className="h-8 w-px bg-border/50 hidden md:block" />
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-lg font-bold">{displayStats.public_worlds}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{pageData.sections?.worlds}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section with Tabs */}
      <Tabs defaultValue="artworks" className="w-full space-y-8">
        <div className="flex justify-center md:justify-start px-1">
          <TabsList className="inline-flex items-center rounded-full glass-panel p-1.5 h-auto gap-1 bg-transparent border-none shadow-none">
            <TabsTrigger 
              value="artworks" 
              className="relative flex h-10 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:text-foreground/80 text-muted-foreground gap-2 border-none ring-0 focus-visible:ring-0"
            >
              {pageData.sections?.artworks}
            </TabsTrigger>
            <TabsTrigger 
              value="characters"
              className="relative flex h-10 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:text-foreground/80 text-muted-foreground gap-2 border-none ring-0 focus-visible:ring-0"
            >
              {pageData.sections?.characters}
            </TabsTrigger>
            <TabsTrigger 
              value="worlds"
              className="relative flex h-10 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:text-foreground/80 text-muted-foreground gap-2 border-none ring-0 focus-visible:ring-0"
            >
              {pageData.sections?.worlds}
            </TabsTrigger>
            <TabsTrigger 
              value="messages"
              className="relative flex h-10 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm hover:text-foreground/80 text-muted-foreground gap-2 border-none ring-0 focus-visible:ring-0"
            >
              {pageData.sections?.message_board || "Messages"}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="artworks" className="mt-0 outline-none">
          {artworks.length > 0 ? (
            <div className="columns-2 gap-3 md:columns-4 2xl:columns-5 px-1">
              {mappedArtworks.map((artwork) => (
                <div key={artwork.id} className="mb-3 break-inside-avoid">
                  <ArtworkCard
                    artwork={artwork}
                    onOpen={handleOpenDetail}
                    onToggleLike={handleToggleLike}
                    onToggleFavorite={handleToggleFavorite}
                    pageData={communityPageData}
                    className="mb-0 shadow-none border-border/60 hover:shadow-xl transition-shadow"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5 rounded-3xl border border-dashed">
              <Palette className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No artworks yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="characters" className="mt-0 outline-none">
          {characters.length > 0 ? (
            <div className="grid gap-6 grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 px-1">
              {characters.map((character) => {
                const imageUrl = character.profile_image_url || character.avatar_url || "";
                return (
                  <Link
                    key={character.uuid}
                    href={`/characters/${character.uuid}`}
                    className="group"
                  >
                    <motion.div
                      whileHover={{ y: -8, scale: 1.02 }}
                      className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border-2 border-border/40 bg-card shadow-lg transition-all duration-300 hover:border-primary/40"
                    >
                      {imageUrl ? (
                        <img
                          src={assetLoader.getR2Url(imageUrl)}
                          alt={character.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                          <span className="text-muted-foreground font-anime text-2xl">{character.name?.[0]}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <p className="text-white font-bold text-sm md:text-lg font-anime">
                          {character.name}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5 rounded-3xl border border-dashed">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No characters yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="worlds" className="mt-0 outline-none">
          {worlds.length > 0 ? (
            <div className="grid gap-6 grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 px-1">
              {worlds.map((world) => {
                const coverUrl = world.cover_url
                  ? worldCoverMap[world.cover_url] || world.cover_url
                  : "";
                return (
                <Link
                  key={world.uuid}
                  href={`/worlds/${world.uuid}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:shadow-xl hover:border-primary/40"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-muted/20">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={world.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center">
                         <Globe className="h-12 w-12 opacity-10" />
                       </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="truncate text-lg font-bold group-hover:text-primary transition-colors">{world.name}</div>
                    <div className="mt-2 flex items-center gap-2">
                       <Users className="h-3 w-3 text-muted-foreground" />
                       <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                         {pageData.sections?.characters}: {world.character_count || 0}
                       </span>
                    </div>
                  </div>
                </Link>
              )})}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5 rounded-3xl border border-dashed">
              <Globe className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No worlds yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-0 outline-none">
          <div className="rounded-3xl bg-muted/10 p-4 md:p-8 border border-border/50">
            <CommentSection 
              artId={profileState.uuid} 
              artType="user" 
            />
          </div>
        </TabsContent>
      </Tabs>

      <ArtworkDetailModal
        open={Boolean(selectedArtworkId)}
        artworkId={selectedArtworkId}
        listItem={activeArtwork || undefined}
        onClose={handleCloseDetail}
        onToggleLike={handleToggleLike}
        onToggleFavorite={handleToggleFavorite}
        pageData={communityPageData}
      />

      {/* Dialogs */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-[480px] glass-card sm:rounded-2xl border-none">
          <DialogHeader>
            <DialogTitle>{pageData.profile_form?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="display_name" className="text-xs font-medium ml-1">
                {pageData.profile_form?.display_name_label}
              </Label>
              <Input
                id="display_name"
                className="rounded-xl h-9 text-sm"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={pageData.profile_form?.display_name_placeholder}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium ml-1">{pageData.profile_form?.avatar_label}</Label>
              <div className="rounded-xl border bg-muted/5 p-3">
                <ReferenceImageUpload
                  value={avatarUrl ? [avatarUrl] : []}
                  onChange={(urls) => setAvatarUrl(urls[0] || null)}
                  maxImages={1}
                  pageData={uploadPageData}
                  showTitle={false}
                  uploadType="user-avatar"
                  preferUploadUuid
                  galleryValueField="uuid"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium ml-1">{pageData.profile_form?.gender_label}</Label>
              <Select
                value={gender || ""}
                onValueChange={(value) => setGender(value || null)}
              >
                <SelectTrigger className="rounded-xl h-9 text-sm">
                  <SelectValue
                    placeholder={pageData.profile_form?.gender_placeholder}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">
                    <div className="flex items-center gap-2">
                      <GenderIcon gender="male" />
                      <span>{pageData.profile_form?.gender_male || "Male"}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="female">
                    <div className="flex items-center gap-2">
                      <GenderIcon gender="female" />
                      <span>{pageData.profile_form?.gender_female || "Female"}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <GenderIcon gender="transgender" />
                      <span>{pageData.profile_form?.gender_other || "Other"}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-medium ml-1">{pageData.profile_form?.bio_label}</Label>
              <Textarea
                id="bio"
                className="rounded-xl min-h-[80px] text-sm"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder={pageData.profile_form?.bio_placeholder}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="rounded-full text-xs"
              onClick={() => setProfileDialogOpen(false)}
              disabled={isSavingProfile}
            >
              {pageData.profile_form?.cancel}
            </Button>
            <Button 
              className="rounded-full px-6 text-xs"
              onClick={handleUpdateProfile} 
              disabled={isSavingProfile}
            >
              {pageData.profile_form?.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={backgroundDialogOpen} onOpenChange={setBackgroundDialogOpen}>
        <DialogContent className="sm:max-w-[480px] glass-card sm:rounded-2xl border-none">
          <DialogHeader>
            <DialogTitle>{pageData.background_form?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="rounded-xl border bg-muted/5 p-3">
              <ReferenceImageUpload
                value={backgroundUrl ? [backgroundUrl] : []}
                onChange={(urls) => setBackgroundUrl(urls[0] || null)}
                maxImages={1}
                pageData={uploadPageData}
                showTitle={false}
                uploadType="user-background"
                preferUploadUuid
                galleryValueField="uuid"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="rounded-full text-xs"
              onClick={() => setBackgroundDialogOpen(false)}
              disabled={isSavingBackground}
            >
              {pageData.background_form?.cancel}
            </Button>
            <Button 
              className="rounded-full px-6 text-xs"
              onClick={handleUpdateBackground} 
              disabled={isSavingBackground}
            >
              {pageData.background_form?.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
