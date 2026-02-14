import { getCommunityDetail } from "@/services/community";
import type { ArtworkPreview } from "@/types/pages/community";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { UserShowcaseFlatClient } from "./UserShowcaseFlatClient";
import { unstable_cache } from "next/cache";

interface UserShowcaseConfig {
  title: string;
  description: string;
  see_more: string;
  loading: string;
  empty: string;
  featured_artworks: Array<{
    uuid: string;
    type: "image" | "video" | "character";
    badge_type: string;
  }>;
}

interface UserShowcaseSectionProps {
  config: UserShowcaseConfig;
  locale: string;
}

const batchFetchArtworks = unstable_cache(
  async (
    items: Array<{ uuid: string; type: "image" | "video" | "character"; badge_type: string }>
  ): Promise<ArtworkPreview[]> => {
    if (!items || items.length === 0) return [];

    const results = await Promise.allSettled(
      items.map(async (item) => {
        try {
          const detail = await getCommunityDetail(item.uuid, item.type);
          if (!detail) return null;

          const preview: ArtworkPreview = {
            id: detail.id,
            type: detail.type,
            title: detail.title || "",
            cover_url: detail.cover_url || "",
            media_urls: detail.media_urls,
            author: detail.author,
            stats: detail.stats,
            tags: detail.tags,
            meta: detail.meta,
            liked: detail.liked,
            favorited: detail.favorited,
            created_at: detail.created_at,
            model_id: detail.model_id,
            model_name: detail.model_name,
            characters: detail.characters,
            prompt: detail.prompt,
            original_prompt: detail.original_prompt,
            final_prompt: detail.final_prompt,
            description: detail.description,
            gen_type: item.badge_type
          };
          return preview;
        } catch (error) {
          console.error(`Failed to fetch artwork ${item.uuid}:`, error);
          return null;
        }
      })
    );

    return results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<ArtworkPreview>).value);
  },
  ["user-showcase-artworks"],
  { revalidate: 3600, tags: ["user-showcase"] }
);

export default async function UserShowcaseFlatSection({
  config,
  locale,
}: UserShowcaseSectionProps) {
  const artworks = await batchFetchArtworks(config.featured_artworks);

  if (artworks.length === 0) return null;

  return (
    <section className="py-16 bg-transparent relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-left mb-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-anime mb-3 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 tracking-tight">
            {config.title}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-3xl font-medium">
            {config.description}
          </p>
        </div>

        <UserShowcaseFlatClient artworks={artworks} locale={locale} />

        <div className="mt-12 text-left">
          <Link
            href={`/${locale}/community`}
            className="inline-flex items-center gap-2 text-base font-bold text-primary hover:gap-3 transition-all duration-300 group"
          >
            {config.see_more}
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
