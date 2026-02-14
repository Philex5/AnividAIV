import { motion } from "framer-motion";
import { assetLoader, getR2Url } from "@/lib/asset-loader";
import { cn } from "@/lib/utils";
import { useCharacterByUuid } from "@/lib/hooks/useConfigs";
import type { OCGalleryCharacter } from "@/lib/configs";
import type { OCMakerPage } from "@/types/pages/landing";
import { useRouter } from "@/i18n/navigation";
import { GenderIcon } from "@/components/icon/gender-icon";
import speciesConfig from "@/configs/characters/species.json";
import { Cake } from "lucide-react";

interface CharacterShowCardProps {
  character?: OCGalleryCharacter;
  characterUuid?: string;
  pageData?: OCMakerPage;
  onSelectTemplate?: (character: OCGalleryCharacter) => void;
  variant?: "full" | "preview";
  className?: string;
  onClick?: () => void;
}

type SpeciesConfigItem = {
  uuid: string;
  key: string;
  name: string;
  i18n_key?: string;
  icon_url?: string;
};

function resolveSpeciesItem(speciesValue: string | null | undefined) {
  const value = (speciesValue || "").trim();
  if (!value) return null;
  const items = (speciesConfig as any)?.items as SpeciesConfigItem[] | undefined;
  if (!Array.isArray(items) || !items.length) return null;

  const lower = value.toLowerCase();
  return (
    items.find((item) => item.key === value) ||
    items.find((item) => item.uuid === value) ||
    items.find((item) => item.name.toLowerCase() === lower) ||
    null
  );
}

export function CharacterShowCard({
  character: providedCharacter,
  characterUuid,
  pageData,
  onSelectTemplate,
  variant = "full",
  className,
  onClick,
}: CharacterShowCardProps) {
  const router = useRouter();
  const { character: fetchedCharacter, loading } =
    useCharacterByUuid(characterUuid);

  const character = providedCharacter || fetchedCharacter;

  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-2xl bg-muted aspect-[3/4] w-full",
          className
        )}
      />
    );
  }

  if (!character) {
    return null;
  }

  const imageUrl = character.profile_url || character.avatar_url || "";
  const displayName = character.name;
  const resolvedImageUrl = imageUrl
    ? assetLoader.getR2Url(imageUrl)
    : undefined;

  // Character data
  const charData = character.character_data;
  const gender = charData?.gender;
  const species = charData?.species;
  const age = charData?.age;
  const role = charData?.role;
  const briefIntroduction = character.brief_description || character.description || "";

  // Resolve species item for icon
  const speciesItem = species ? resolveSpeciesItem(species) : null;
  const speciesIconUrl = speciesItem?.icon_url
    ? getR2Url(speciesItem.icon_url)
    : null;

  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.05, zIndex: 10 }}
      className={cn(
        "relative aspect-[3/4] w-full rounded-2xl overflow-hidden border-2 border-white/20 bg-card shadow-2xl cursor-pointer transition-all duration-300 hover:border-primary/40 group",
        className
      )}
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          router.push(`/chat/${character.uuid}`);
        }
      }}
    >
      {resolvedImageUrl ? (
        <img
          src={resolvedImageUrl}
          alt={displayName}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="h-full w-full bg-muted" />
      )}

      {/* Hover overlay with character info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        {/* Line 1: OC Name */}
        <p className="text-white font-bold text-sm md:text-base font-anime transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          {displayName}
        </p>

        {/* Line 2: Gender icon, Species icon, Age, Role */}
        <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">
          {gender && (
            <GenderIcon gender={gender} className="w-3.5 h-3.5" />
          )}
          {speciesIconUrl && (
            <img
              src={speciesIconUrl}
              alt={species}
              width={14}
              height={14}
              className="h-3.5 w-3.5"
            />
          )}
          {age && age > 0 && (
            <div className="flex items-center gap-0.5 text-white/80 text-[10px] font-medium">
              <Cake className="w-3 h-3" />
              <span>{age}</span>
            </div>
          )}
          {role && (
            <span className="text-white/80 text-[10px] uppercase tracking-wider font-medium">
              {role}
            </span>
          )}
        </div>

        {/* Line 3: Brief Introduction */}
        {briefIntroduction && (
          <p className="text-white/70 text-[9px] sm:text-[10px] mt-1.5 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 leading-snug">
            {briefIntroduction}
          </p>
        )}
      </div>
    </motion.div>
  );
}
