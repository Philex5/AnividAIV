"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Upload,
  Wand2,
  Check,
  Palette,
  X,
  Coins,
  Gem,
  Ghost,
  Shield,
  Zap,
  Wand,
  Cpu,
  Heart,
  Sword,
  Book,
  Scale,
  MapPin,
  Users,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Images,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import speciesConfig from "@/configs/characters/species.json";
import themeColorPresets from "@/configs/worlds/theme-color-presets.json";
import { assetLoader } from "@/lib/asset-loader";
import {
  worldInsertSchema,
  type worldInsert,
  CLIMATE_OPTIONS,
  TECH_MAGIC_SYSTEM_OPTIONS,
} from "@/types/world";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  GenerationStatusModal,
  type GenerationStatusType,
} from "@/components/generation/GenerationStatusModal";
import { isImageUuid, resolveImageReference } from "@/lib/image-resolve";
import { isAbsoluteUrl } from "@/lib/r2-utils";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import {
  useGenerationPolling,
  type GenerationStatusResponse,
} from "@/hooks/useGenerationPolling";
import { useModels } from "@/lib/hooks/useConfigs";
import { ArtworkGalleryDialog } from "@/components/anime-generator/ArtworkGalleryDialog";
import type { OCworldWithCount } from "@/models/oc-world";
import { GenreSelector } from "./GenreSelector";
import { toImageUrl } from "@/lib/r2-utils";

interface WorldFormProps {
  pageData?: any;
  mode?: "create" | "edit";
  world?: OCworldWithCount | null;
}

// Helper for extra attributes
interface ExtraAttribute {
  key: string;
  value: string;
  icon?: string;
}

const EXTRA_ICONS = [
  { name: "Coins", icon: Coins },
  { name: "Gem", icon: Gem },
  { name: "Users", icon: Users },
  { name: "MapPin", icon: MapPin },
  { name: "Shield", icon: Shield },
  { name: "Sword", icon: Sword },
  { name: "Zap", icon: Zap },
  { name: "Wand2", icon: Wand },
  { name: "Cpu", icon: Cpu },
  { name: "Book", icon: Book },
  { name: "Scale", icon: Scale },
  { name: "Heart", icon: Heart },
  { name: "Ghost", icon: Ghost },
  { name: "Layers", icon: Layers },
];

type WorldLinkedOC = {
  uuid: string;
  name: string;
  avatar_url?: string | null;
  world_uuid?: string | null;
};

export function WorldForm({
  pageData,
  mode = "create",
  world,
}: WorldFormProps) {
  const router = useRouter();
  const tGallery = useTranslations("artworkGallery");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extraAttributes, setExtraAttributes] = useState<ExtraAttribute[]>([]);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatusResponse | null>(null);
  const [generationResults, setGenerationResults] =
    useState<GenerationStatusResponse["results"]>();
  const [generationError, setGenerationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocCandidates, setOcCandidates] = useState<WorldLinkedOC[]>([]);
  const [ocLoading, setOcLoading] = useState(true);
  const [ocSelectorOpen, setOcSelectorOpen] = useState(false);
  const [selectedOcs, setSelectedOcs] = useState<string[]>([]);
  const [ocSearch, setOcSearch] = useState("");
  const selectedOcsInitRef = useRef<string[]>([]);
  const ocSelectionReadyRef = useRef(false);
  const defaultThemeColor = themeColorPresets[0];
  const createCopy = pageData?.create || {};
  const editCopy = pageData?.edit || {};
  const formCopy =
    mode === "edit"
      ? editCopy.form || createCopy.form || {}
      : createCopy.form || {};
  const formLabels = formCopy.labels || {};
  const formPlaceholders = formCopy.placeholders || {};
  const formSections = formCopy.sections || {};
  const formButtons = formCopy.buttons || {};
  const formEmpty = formCopy.empty || {};
  const formHelpers = formCopy.helpers || {};
  const formFields = formCopy.fields || {};
  const formOptions = formCopy.options || {};
  const formOcs = formCopy.ocs || {};
  const createErrors = createCopy?.errors || {};
  const editErrors = editCopy?.errors || {};
  const climateOptions = formOptions.climate || {};
  const techOptions = formOptions.tech_magic_system || {};
  const extraFieldCopy = formFields.extra || {};
  const visibilityCopy = createCopy.visibility || editCopy.visibility || {};
  const { models, loading: modelsLoading } = useModels();

  const climateLabelByKey = useMemo(
    () => new Map(Object.entries(climateOptions as Record<string, string>)),
    [climateOptions],
  );
  const techLabelByKey = useMemo(
    () => new Map(Object.entries(techOptions as Record<string, string>)),
    [techOptions],
  );
  const speciesLabelByKey = useMemo(() => {
    return new Map(
      (speciesConfig?.items || []).map((item) => [item.key, item.name]),
    );
  }, []);

  const resolveLabel = (
    value: string | undefined,
    labelByKey: Map<string, string>,
  ) => {
    if (!value) return value;
    return labelByKey.get(value) || value;
  };

  const defaultValues = useMemo<worldInsert>(
    () => ({
      name: world?.name || "",
      genre: world?.genre || undefined,
      tags: Array.isArray(world?.tags) ? world.tags : [],
      description: world?.description || "",
      visibility_level:
        world?.visibility_level === "private" ? "private" : "public",
      allow_join: world?.allow_join ?? true,
      is_active: world?.is_active ?? true,
      is_preset: world?.is_preset ?? false,
      species: Array.isArray(world?.species)
        ? world.species.map((item) => speciesLabelByKey.get(item) || item)
        : [],
      regions: Array.isArray(world?.regions) ? world?.regions : [],
      factions: Array.isArray(world?.factions) ? world?.factions : [],
      history_timeline: Array.isArray(world?.history_timeline)
        ? world?.history_timeline
        : [],
      theme_colors:
        world?.theme_colors && (world.theme_colors as any).primary
          ? (world.theme_colors as any)
          : defaultThemeColor
            ? { primary: defaultThemeColor }
            : undefined,
      climate: resolveLabel(world?.climate ?? undefined, climateLabelByKey),
      tech_magic_system: resolveLabel(
        world?.tech_magic_system ?? undefined,
        techLabelByKey,
      ),
      cover_url: world?.cover_url || undefined,
      extra: world?.extra || {},
    }),
    [
      climateLabelByKey,
      defaultThemeColor,
      speciesLabelByKey,
      techLabelByKey,
      world,
    ],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<worldInsert>({
    resolver: zodResolver(worldInsertSchema),
    defaultValues,
  });

  const watchName = watch("name") || "";
  const watchGenre = watch("genre");
  const watchTags = watch("tags") || [];
  const watchDescription = watch("description") || "";
  const watchSpecies = watch("species") || [];
  const watchThemeColors = watch("theme_colors");
  const watchClimate = watch("climate");
  const watchTechSystem = watch("tech_magic_system");
  const watchCoverUrl = watch("cover_url");
  const watchRegions = watch("regions") || [];
  const watchFactions = watch("factions") || [];
  const watchHistory = watch("history_timeline") || [];
  const watchAllowJoin = watch("allow_join");
  const { displayUrl: coverDisplayUrl } = useResolvedImageUrl(watchCoverUrl);
  const watchVisibilityLevel = watch("visibility_level");

  const selectedOcSet = useMemo(() => new Set(selectedOcs), [selectedOcs]);

  const selectedOcItems = useMemo(
    () => ocCandidates.filter((item) => selectedOcSet.has(item.uuid)),
    [ocCandidates, selectedOcSet],
  );

  const filteredOcCandidates = useMemo(() => {
    const keyword = ocSearch.trim().toLowerCase();
    if (!keyword) return ocCandidates;
    return ocCandidates.filter((item) =>
      item.name.toLowerCase().includes(keyword),
    );
  }, [ocCandidates, ocSearch]);

  const toggleOcSelection = (uuid: string) => {
    setSelectedOcs((prev) =>
      prev.includes(uuid)
        ? prev.filter((item) => item !== uuid)
        : [...prev, uuid],
    );
  };

  const removeSelectedOc = (uuid: string) => {
    setSelectedOcs((prev) => prev.filter((item) => item !== uuid));
  };

  useEffect(() => {
    if (!world) return;
    reset(defaultValues);
    if (world.extra && typeof world.extra === "object") {
      const extras = Object.entries(world.extra as Record<string, unknown>).map(
        ([key, value]) => {
          if (value && typeof value === "object" && "value" in value) {
            return {
              key,
              value: String((value as any).value || ""),
              icon: String((value as any).icon || "Layers"),
            };
          }
          return {
            key,
            value: value === null || value === undefined ? "" : String(value),
            icon: "Layers",
          };
        },
      );
      setExtraAttributes(extras);
    }
  }, [defaultValues, reset, world]);

  useEffect(() => {
    let mounted = true;

    async function fetchUserInfo() {
      try {
        const res = await fetch("/api/get-user-info", { method: "POST" });
        const json = await res.json();
        if (!mounted) return;
        setIsSubscriber(Boolean(json?.data?.is_sub));
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      }
    }

    fetchUserInfo();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchUserOcs() {
      setOcLoading(true);
      try {
        const response = await fetch("/api/oc-maker/characters?limit=200");
        const data = await response.json();
        if (!mounted) return;
        if (!response.ok || data?.code === -1) {
          throw new Error(data?.message || "Failed to load OCs");
        }
        const items = (data?.data?.characters || []) as WorldLinkedOC[];

        // Merge characters already in world into candidates if they are missing
        const worldCharacters = (world as any)?.characters || [];
        const mergedItems = [...items];
        worldCharacters.forEach((wc: any) => {
          if (!mergedItems.find((i) => i.uuid === wc.uuid)) {
            mergedItems.push({
              uuid: wc.uuid,
              name: wc.name,
              avatar_url: wc.thumbnail_mobile || wc.image_url,
              world_uuid: world?.uuid,
            });
          }
        });

        setOcCandidates(mergedItems);
        if (!ocSelectionReadyRef.current) {
          const initialSelected = world?.uuid
            ? mergedItems
                .filter((item) => item.world_uuid === world.uuid)
                .map((item) => item.uuid)
            : [];
          setSelectedOcs(initialSelected);
          selectedOcsInitRef.current = initialSelected;
          ocSelectionReadyRef.current = true;
        }
      } catch (error) {
        console.error("Failed to load user OCs:", error);
      } finally {
        if (mounted) setOcLoading(false);
      }
    }

    fetchUserOcs();
    return () => {
      mounted = false;
    };
  }, [world?.uuid]);

  const syncSelectedOcs = async (targetWorldUuid: string) => {
    const initial = selectedOcsInitRef.current;
    const next = selectedOcs;
    const toAdd = next.filter((uuid) => !initial.includes(uuid));
    const toRemove = initial.filter((uuid) => !next.includes(uuid));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    const updateRequests = [
      ...toAdd.map((uuid) =>
        fetch(`/api/oc-maker/characters/${uuid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ world_uuid: targetWorldUuid }),
        }),
      ),
      ...toRemove.map((uuid) =>
        fetch(`/api/oc-maker/characters/${uuid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ world_uuid: null }),
        }),
      ),
    ];

    const results = await Promise.allSettled(
      updateRequests.map(async (request) => {
        const response = await request;
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.code === -1) {
          throw new Error(data?.message || "Failed to update OC");
        }
        return data;
      }),
    );

    const failed = results.find((item) => item.status === "rejected");
    if (failed) {
      throw (failed as PromiseRejectedResult).reason;
    }
  };

  const normalizeCoverUrl = async (value?: string) => {
    const input = typeof value === "string" ? value.trim() : "";
    if (!input) return undefined;
    if (isImageUuid(input)) return input;
    if (isAbsoluteUrl(input)) return input;
    const resolved = await resolveImageReference(input, "auto");
    const candidate = (
      resolved?.originalUrl ||
      resolved?.resolvedUrl ||
      input
    ).trim();
    return isAbsoluteUrl(candidate) ? candidate : undefined;
  };

  const applyCoverUrl = async (value?: string, onSuccess?: () => void) => {
    const normalized = await normalizeCoverUrl(value);
    if (!normalized) {
      const message =
        editErrors.invalid_cover_url ||
        createErrors.invalid_cover_url ||
        "Cover image URL is invalid.";
      toast.error(message);
      return;
    }
    setValue("cover_url", normalized, {
      shouldDirty: true,
      shouldValidate: true,
    });
    onSuccess?.();
  };

  const onSubmit = async (data: worldInsert) => {
    setIsSubmitting(true);

    const extra: Record<string, any> = {};
    extraAttributes.forEach((attr) => {
      if (attr.key.trim()) {
        extra[attr.key.trim()] = {
          value: attr.value,
          icon: attr.icon || "Layers",
        };
      }
    });
    data.extra = extra;

    const normalizedCoverUrl = await normalizeCoverUrl(data.cover_url);
    if (data.cover_url && !normalizedCoverUrl) {
      throw new Error(
        editErrors.invalid_cover_url ||
          createErrors.invalid_cover_url ||
          "Cover image URL is invalid.",
      );
    }

    const payload = {
      name: data.name,
      genre: data.genre,
      tags: data.tags,
      description: data.description,
      visibility_level: data.visibility_level,
      allow_join: data.allow_join,
      species: data.species,
      climate: data.climate,
      tech_magic_system: data.tech_magic_system,
      theme_colors: data.theme_colors,
      cover_url: normalizedCoverUrl,
      extra: data.extra,
    };

    try {
      const requestUrl =
        mode === "edit" && world?.uuid
          ? `/api/worlds/${world.uuid}`
          : "/api/worlds";
      const response = await fetch(requestUrl, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch (error) {
        console.error("Failed to parse world response:", error);
      }

      if (!response.ok || result?.code === -1) {
        const limitMessage =
          createCopy?.errors?.world_limit_reached || result?.message || "";
        const apiMessage = result?.message || result?.error || "";
        const fallbackMessage =
          mode === "edit"
            ? editCopy?.errors?.update_failed
            : createCopy?.errors?.create_failed;
        const errorMessage =
          response.status === 402
            ? limitMessage
            : apiMessage || fallbackMessage || "";
        throw new Error(
          errorMessage || `Failed to update world (${response.status})`,
        );
      }

      const successMessage =
        (mode === "edit"
          ? editCopy?.toast?.success
          : createCopy?.toast?.success) || "";
      if (successMessage) {
        toast.success(successMessage);
      }
      const targetUuid = result?.data?.uuid || world?.uuid;
      if (targetUuid) {
        try {
          await syncSelectedOcs(targetUuid);
        } catch (error: any) {
          console.error("Failed to sync related OCs:", error);
          const message =
            (mode === "edit"
              ? editErrors?.oc_update_failed
              : createErrors?.oc_update_failed) ||
            createErrors?.oc_update_failed ||
            "Failed to update related OCs.";
          if (message) {
            toast.error(message);
          }
        }
      }
      if (targetUuid) {
        router.push(`/worlds/${targetUuid}`);
      }
    } catch (error: any) {
      console.error("World submit failed:", error);
      const errorMessage =
        error.message ||
        (mode === "edit"
          ? editCopy?.errors?.update_failed
          : createCopy?.errors?.create_failed) ||
        "";
      if (errorMessage) {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalid = (formErrors: FieldErrors<worldInsert>) => {
    console.warn("World form validation failed:", formErrors);
    const message =
      formErrors.root?.message ||
      (mode === "edit" ? editErrors.form_invalid : createErrors.form_invalid) ||
      createErrors.form_invalid ||
      "Please check the form fields and try again.";
    toast.error(message);
  };

  const removeSpecies = (s: string) => {
    setValue(
      "species",
      watchSpecies.filter((item) => item !== s),
    );
  };

  const addExtraAttribute = () => {
    setExtraAttributes([
      ...extraAttributes,
      { key: "", value: "", icon: "Layers" },
    ]);
  };

  const removeExtraAttribute = (index: number) => {
    setExtraAttributes(extraAttributes.filter((_, i) => i !== index));
  };

  const updateExtraAttribute = (
    index: number,
    field: keyof ExtraAttribute,
    val: string,
  ) => {
    const newAttrs = [...extraAttributes];
    (newAttrs[index] as any)[field] = val;
    setExtraAttributes(newAttrs);
  };

  const colorPresets = themeColorPresets;

  const availableImageModels = useMemo(() => {
    return (models || []).filter((model) => model.model_type !== "text2video");
  }, [models]);

  const defaultImageModel = useMemo(() => {
    return availableImageModels[0];
  }, [availableImageModels]);

  const defaultImageResolution = useMemo(() => {
    const config = (defaultImageModel?.config as any) || {};
    if (typeof config.default_resolution === "string") {
      return config.default_resolution;
    }
    if (
      Array.isArray(config.image_resolution) &&
      config.image_resolution.length > 0
    ) {
      return config.image_resolution[0];
    }
    return "";
  }, [defaultImageModel]);

  const resetGenerationState = useCallback(() => {
    setIsGenerating(false);
    setGenerationId(null);
    setGenerationStatus(null);
    setGenerationResults(undefined);
    setGenerationError(null);
  }, []);

  const { isPolling, error: pollingError } = useGenerationPolling({
    generationId,
    generationType: "anime",
    onCompleted: (completedResults) => {
      setGenerationResults(completedResults);
      setGenerationStatus((prev) =>
        prev ? { ...prev, status: "completed" } : prev,
      );
      if (completedResults.length > 0) {
        const primaryResult = completedResults[0];
        void applyCoverUrl(
          primaryResult.image_uuid || primaryResult.image_url,
          () => setIsStatusOpen(false),
        );
      } else {
        setIsStatusOpen(false);
      }
      setGenerationId(null);
      setIsGenerating(false);
    },
    onFailed: (message) => {
      setGenerationError(message);
    },
    onStatusUpdate: (statusUpdate) => {
      setGenerationStatus(statusUpdate);
    },
  });

  const statusType: GenerationStatusType =
    generationError || pollingError
      ? "failed"
      : isGenerating
        ? "submitting"
        : isPolling
          ? "polling"
          : generationResults?.length
            ? "completed"
            : "idle";

  const handleGenerateCover = useCallback(async () => {
    setGenerationError(null);
    setGenerationResults(undefined);
    setGenerationStatus(null);
    setGenerationId(null);
    setIsStatusOpen(true);
    setIsGenerating(true);

    if (!watchName.trim()) {
      setGenerationError(
        createErrors.cover_generation_missing_fields ||
          editErrors.cover_generation_missing_fields ||
          createErrors.form_invalid ||
          editErrors.form_invalid ||
          "",
      );
      setIsGenerating(false);
      return;
    }

    if (modelsLoading || !defaultImageModel?.model_id) {
      setGenerationError(
        createErrors.cover_generation_unavailable ||
          editErrors.cover_generation_unavailable ||
          createErrors.create_failed ||
          editErrors.update_failed ||
          "",
      );
      setIsGenerating(false);
      return;
    }

    const themeColors =
      watchThemeColors && typeof watchThemeColors === "object"
        ? Object.values(watchThemeColors).filter(Boolean).join(", ")
        : "";
    const extraText = extraAttributes
      .filter((item) => item.key.trim())
      .map((item) => `${item.key.trim()}: ${item.value}`)
      .join(", ");

    const templateParams = {
      world_name: watchName.trim(),
      world_genre: watchGenre || "",
      world_description: watchDescription.trim(),
      world_tags: watchTags.filter(Boolean).join(", "),
      world_species: watchSpecies.filter(Boolean).join(", "),
      world_climate: watchClimate || "",
      world_regions: watchRegions.filter(Boolean).join(", "),
      world_tech_magic: watchTechSystem || "",
      world_theme_colors: themeColors,
      world_factions: watchFactions
        .map((item) => (item && typeof item === "object" ? item.name : ""))
        .filter(Boolean)
        .join(", "),
      world_history: watchHistory
        .map((item) => (item && typeof item === "object" ? item.title : ""))
        .filter(Boolean)
        .join(", "),
      world_extra: extraText,
      scene_hint: "",
    };

    let prompt = "";

    try {
      const buildResponse = await fetch(
        "/api/anime-generation/build-extract-prompt",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_key: "world-cover",
            template_params: templateParams,
            use_llm_build: true,
          }),
        },
      );

      const buildData = await buildResponse.json().catch(() => ({}));
      if (!buildResponse.ok || !buildData?.success) {
        const message =
          buildData?.error ||
          createErrors.cover_generation_failed ||
          editErrors.cover_generation_failed ||
          "";
        setGenerationError(message);
        setIsGenerating(false);
        return;
      }

      prompt = String(buildData?.data?.prompt || "").trim();
      if (!prompt) {
        const message =
          createErrors.cover_generation_failed ||
          editErrors.cover_generation_failed ||
          "";
        setGenerationError(message);
        setIsGenerating(false);
        return;
      }
    } catch (error: any) {
      console.error("Failed to build world cover prompt:", error);
      setGenerationError(
        error?.message ||
          createErrors.cover_generation_failed ||
          editErrors.cover_generation_failed ||
          "",
      );
      setIsGenerating(false);
      return;
    }

    try {
      const payload: Record<string, any> = {
        gen_type: "world_cover",
        prompt,
        model_uuid: defaultImageModel.model_id,
        batch_size: 1,
        aspect_ratio: "16:9",
        visibility_level: watchVisibilityLevel || "public",
      };

      if (defaultImageResolution) {
        payload.image_resolution = defaultImageResolution;
      }

      const response = await fetch("/api/anime-generation/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.data?.generation_uuid) {
        const message =
          data?.error ||
          createErrors.cover_generation_failed ||
          editErrors.cover_generation_failed ||
          "";
        setGenerationError(message);
        setIsGenerating(false);
        return;
      }

      setGenerationId(data.data.generation_uuid);
    } catch (error: any) {
      console.error("Failed to create world cover task:", error);
      setGenerationError(
        error?.message ||
          createErrors.cover_generation_failed ||
          editErrors.cover_generation_failed ||
          "",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    createErrors,
    defaultImageModel,
    defaultImageResolution,
    editErrors,
    extraAttributes,
    modelsLoading,
    watchClimate,
    watchDescription,
    watchFactions,
    watchGenre,
    watchHistory,
    watchName,
    watchRegions,
    watchSpecies,
    watchTags,
    watchTechSystem,
    watchThemeColors,
    watchVisibilityLevel,
  ]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "world-background");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || createCopy?.errors?.upload_failed || "");
      }
      setValue("cover_url", data.url);
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.message || createCopy?.errors?.upload_failed || "");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, handleInvalid)}
      className="space-y-12 pb-20"
    >
      {/* 1. Core Identity Section */}
      <section className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* World Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-bold ml-1">
              {formLabels.name || ""}
            </Label>
            <Input
              id="name"
              placeholder={formPlaceholders.name || ""}
              {...register("name")}
              className={cn(
                "h-12 rounded-2xl bg-muted/20 border-border/50 focus:ring-primary/20 transition-all",
                errors.name && "border-destructive focus:ring-destructive/20",
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive ml-1">
                {errors.name.message as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Join Permission */}
            <div className="space-y-2">
              <Label className="text-sm font-bold ml-1">
                {formLabels.allow_join || ""}
              </Label>
              <div className="flex items-center justify-between h-12 rounded-2xl bg-muted/20 border border-border/50 px-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight">
                    {watchAllowJoin
                      ? formHelpers.allow_join_enabled
                      : formHelpers.allow_join_disabled}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 leading-tight">
                    {watchAllowJoin
                      ? formHelpers.allow_join_enabled_hint
                      : formHelpers.allow_join_disabled_hint}
                  </span>
                </div>
                <Switch
                  checked={watchAllowJoin !== false}
                  onCheckedChange={(checked) => {
                    setValue("allow_join", checked, { shouldDirty: true });
                  }}
                />
              </div>
              <input type="hidden" {...register("allow_join")} />
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label className="text-sm font-bold ml-1">
                {visibilityCopy.label || ""}
              </Label>
              <div className="flex items-center justify-between h-12 rounded-2xl bg-muted/20 border border-border/50 px-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight">
                    {watchVisibilityLevel === "private"
                      ? visibilityCopy.private
                      : visibilityCopy.public}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 leading-tight">
                    {watchVisibilityLevel === "private"
                      ? visibilityCopy.private_hint
                      : visibilityCopy.public_hint}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <VisibilityToggle
                          checked={watchVisibilityLevel !== "private"}
                          onCheckedChange={(checked) => {
                            if (!isSubscriber && !checked) {
                              const message =
                                createCopy?.errors?.visibility_sub_required ||
                                "";
                              if (message) toast.error(message);
                              setValue("visibility_level", "public");
                              return;
                            }
                            setValue(
                              "visibility_level",
                              checked ? "public" : "private",
                            );
                          }}
                          disabled={
                            !isSubscriber && watchVisibilityLevel === "public"
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    {!isSubscriber && visibilityCopy.upgrade_required && (
                      <TooltipContent>
                        <p>{visibilityCopy.upgrade_required}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              <input type="hidden" {...register("visibility_level")} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-bold ml-1">
            {formLabels.description || ""}
          </Label>
          <Textarea
            id="description"
            placeholder={formPlaceholders.description || ""}
            {...register("description")}
            className={cn(
              "min-h-[120px] rounded-[2rem] bg-muted/20 border-border/50 focus:ring-primary/20 resize-none transition-all p-5",
              errors.description &&
                "border-destructive focus:ring-destructive/20",
            )}
          />
          {errors.description && (
            <p className="text-xs text-destructive ml-1">
              {errors.description.message as string}
            </p>
          )}
        </div>

        {/* Genre & Tags Selector */}
        <GenreSelector
          selectedGenre={watchGenre}
          selectedTags={watchTags}
          onGenreChange={(genreId) => setValue("genre", genreId)}
          onTagsChange={(tags) => setValue("tags", tags)}
          labels={{
            genre: formLabels.genre,
            custom_genre: formLabels.custom_genre,
            tags: formLabels.tags,
            custom_tag: formLabels.custom_tag,
            recommended: formLabels.recommended_tags,
          }}
        />
      </section>

      {/* 3. Environment & Attributes Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Climate */}
        <div className="space-y-3">
          <Label className="text-sm font-bold ml-1">
            {formLabels.climate || ""}
          </Label>
          <Input
            placeholder={formPlaceholders.climate || ""}
            value={watchClimate || ""}
            onChange={(e) => setValue("climate", e.target.value)}
            className="h-11 rounded-xl bg-muted/20 border-border/50"
          />
          <div className="flex flex-wrap gap-1.5">
            {CLIMATE_OPTIONS.filter((o) => o !== "custom")
              .slice(0, 3)
              .map((opt) => {
                const label = climateOptions[opt] || "";
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setValue("climate", label)}
                    className={cn(
                      "text-[10px] px-2.5 py-1.5 rounded-lg border transition-all font-bold",
                      watchClimate === label
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/10 border-border/40 hover:bg-muted/20 text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Tech/Magic */}
        <div className="space-y-3">
          <Label className="text-sm font-bold ml-1">
            {formLabels.tech_magic_system || ""}
          </Label>
          <Input
            placeholder={formPlaceholders.tech_magic_system || ""}
            value={watchTechSystem || ""}
            onChange={(e) => setValue("tech_magic_system", e.target.value)}
            className="h-11 rounded-xl bg-muted/20 border-border/50"
          />
          <div className="flex flex-wrap gap-1.5">
            {TECH_MAGIC_SYSTEM_OPTIONS.slice(0, 3).map((opt) => {
              const label = techOptions[opt] || "";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setValue("tech_magic_system", label)}
                  className={cn(
                    "text-[10px] px-2.5 py-1.5 rounded-lg border transition-all font-bold",
                    watchTechSystem === label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/10 border-border/40 hover:bg-muted/20 text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Color */}
        <div className="space-y-3">
          <Label className="text-sm font-bold ml-1">
            {formLabels.theme_color || ""}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl justify-start gap-3 bg-muted/20 border-border/50 hover:bg-muted/30"
              >
                <div
                  className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: watchThemeColors?.primary }}
                />
                <span className="text-xs font-mono font-bold">
                  {watchThemeColors?.primary}
                </span>
                <Palette className="w-3.5 h-3.5 ml-auto text-muted-foreground/40" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-4 rounded-[1.5rem] border border-border shadow-2xl"
              align="end"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue("theme_colors.primary", c)}
                      className={cn(
                        "aspect-square rounded-lg transition-all border border-black/5",
                        watchThemeColors?.primary === c &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-border">
                    <input
                      type="color"
                      className="w-[150%] h-[150%] cursor-pointer m-[-25%]"
                      value={watchThemeColors?.primary}
                      onChange={(e) =>
                        setValue("theme_colors.primary", e.target.value)
                      }
                    />
                  </div>
                  <Input
                    value={watchThemeColors?.primary}
                    onChange={(e) =>
                      setValue("theme_colors.primary", e.target.value)
                    }
                    className="h-8 text-[10px] font-mono rounded-lg"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </section>

      {/* 4. Core Inhabitants Section */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">
            {formSections.inhabitants?.title || ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formSections.inhabitants?.subtitle || ""}
          </p>
        </div>

        <div className="space-y-6 bg-muted/5 rounded-3xl p-6 border border-border/30">
          <div className="flex flex-wrap items-center gap-4 px-1">
            <TooltipProvider delayDuration={0}>
              {speciesConfig.items.map((item) => {
                const isSelected = watchSpecies.includes(item.name);
                return (
                  <Tooltip key={item.uuid}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          isSelected
                            ? removeSpecies(item.name)
                            : setValue("species", [...watchSpecies, item.name])
                        }
                        className={cn(
                          "relative w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all hover:scale-110 active:scale-95",
                          isSelected
                            ? "border-primary shadow-lg"
                            : "border-border/40 hover:border-primary/40",
                        )}
                      >
                        <img
                          src={assetLoader.getImageUrl(item.icon_url)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                            <Check className="h-3 w-3 stroke-[4]" />
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-bold">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-14 h-14 rounded-2xl border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground/30 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-4 rounded-2xl border border-border shadow-xl"
                align="start"
              >
                <Input
                  placeholder={formPlaceholders.custom_species || ""}
                  className="h-10 rounded-xl text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val && !watchSpecies.includes(val)) {
                        setValue("species", [...watchSpecies, val]);
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-h-[48px]">
            {watchSpecies.length > 0 ? (
              watchSpecies.map((s, idx) => (
                <div key={s} className="flex items-center">
                  <Badge
                    variant="outline"
                    className="pl-3 pr-1.5 py-1.5 rounded-xl gap-1.5 bg-background text-foreground border-border/60 hover:border-primary/40 transition-colors"
                  >
                    <span className="text-xs font-bold">{s}</span>
                    <button
                      type="button"
                      onClick={() => removeSpecies(s)}
                      className="p-0.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                  {idx < watchSpecies.length - 1 && (
                    <span className="text-muted-foreground/20 text-xs mx-1">
                      ,
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground/40 font-medium px-2">
                {formEmpty.species || ""}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 5. Extra Details Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              {formSections.extra_details?.title || ""}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formSections.extra_details?.subtitle || ""}
            </p>
          </div>
          <Button
            type="button"
            onClick={addExtraAttribute}
            variant="outline"
            size="sm"
            className="rounded-xl h-9 border-dashed font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />{" "}
            {formButtons.add_field || ""}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {extraAttributes.map((attr, index) => {
            const IconComponent =
              EXTRA_ICONS.find((i) => i.name === attr.icon)?.icon || Layers;

            return (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-[1.5rem] bg-muted/10 border border-border/40 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Icon Selector */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-12 h-12 rounded-xl bg-background border border-border/50 flex items-center justify-center text-primary hover:border-primary/40 transition-all shrink-0"
                      >
                        <IconComponent className="w-5 h-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 p-3 rounded-2xl border border-border shadow-xl"
                      align="start"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {EXTRA_ICONS.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() =>
                              updateExtraAttribute(index, "icon", item.name)
                            }
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                              attr.icon === item.name
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-muted-foreground",
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Input
                    placeholder={extraFieldCopy.key || "Property"}
                    value={attr.key}
                    onChange={(e) =>
                      updateExtraAttribute(index, "key", e.target.value)
                    }
                    className="h-12 rounded-xl bg-background font-bold text-sm flex-1 sm:w-40"
                  />
                </div>

                <div className="relative flex-1 w-full">
                  <Textarea
                    placeholder={extraFieldCopy.value || "Value"}
                    value={attr.value}
                    onChange={(e) => {
                      updateExtraAttribute(index, "value", e.target.value);
                      // Auto-expand height
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    className="min-h-[48px] rounded-xl bg-background text-sm resize-none py-3 overflow-hidden"
                    rows={1}
                    onFocus={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeExtraAttribute(index)}
                  className="self-center text-muted-foreground/20 hover:text-destructive transition-colors p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {extraAttributes.length === 0 && (
            <div className="py-10 text-center rounded-[2rem] border border-dashed border-border/40 bg-muted/5">
              <p className="text-sm text-muted-foreground/40">
                {formEmpty.extra_details || ""}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 0. Related OCs Section */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">
            {formOcs.title || "Related OCs"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formOcs.subtitle || "Show the OCs that belong to this world."}
          </p>
        </div>

        <div className="rounded-3xl border border-border/40 bg-muted/5 p-4 sm:p-6">
          <div className="max-h-[140px] overflow-y-auto scrollbar-hide">
            <div className="flex flex-wrap items-center gap-3">
              {selectedOcItems.length === 0 && !ocLoading ? (
                <p className="text-xs text-muted-foreground/60 px-2 py-1">
                  {formOcs.empty || "No OCs linked yet."}
                </p>
              ) : null}

              {selectedOcItems.map((item) => (
                <div key={item.uuid} className="relative group">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative h-14 w-14 rounded-full border border-border/40 bg-background shadow-sm overflow-hidden">
                          {item.avatar_url ? (
                            <img
                              src={toImageUrl(item.avatar_url)}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{item.name}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <button
                    type="button"
                    onClick={() => removeSelectedOc(item.uuid)}
                    className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setOcSelectorOpen(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border/60 text-muted-foreground/60 hover:border-primary/40 hover:text-primary transition-all"
                aria-label={formOcs.add_button || "Add OC"}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <Dialog open={ocSelectorOpen} onOpenChange={setOcSelectorOpen}>
          <DialogContent className="max-w-3xl rounded-[2rem] border border-border/40 bg-background">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {formOcs.dialog_title || "Select OCs"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {formOcs.dialog_subtitle ||
                  "Choose the characters that should live in this world."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                value={ocSearch}
                onChange={(e) => setOcSearch(e.target.value)}
                placeholder={formOcs.search_placeholder || "Search your OCs..."}
                className="h-10 rounded-xl bg-muted/20 border-border/50"
              />

              <div className="max-h-[360px] overflow-y-auto scrollbar-hide rounded-2xl border border-border/40 bg-muted/5 p-3">
                {ocLoading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {formOcs.loading || "Loading OCs..."}
                  </div>
                ) : filteredOcCandidates.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {formOcs.empty_options || "No OCs match your search."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredOcCandidates.map((item) => {
                      const isSelected = selectedOcSet.has(item.uuid);
                      return (
                        <button
                          key={item.uuid}
                          type="button"
                          onClick={() => toggleOcSelection(item.uuid)}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border/40 bg-background hover:border-primary/40 hover:bg-muted/20",
                          )}
                        >
                          <div className="relative shrink-0">
                            <div className="h-12 w-12 rounded-full border border-border/40 bg-muted/10 overflow-hidden">
                              {item.avatar_url ? (
                                <img
                                  src={toImageUrl(item.avatar_url)}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
                                  {item.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow z-10">
                                <Check className="h-3 w-3 stroke-[4]" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-bold">
                              {item.name}
                            </p>
                            {item.world_uuid &&
                            item.world_uuid !== world?.uuid ? (
                              <p className="text-[10px] text-muted-foreground">
                                {formOcs.linked_hint ||
                                  "Linked to another world"}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setOcSelectorOpen(false)}
                className="h-10 rounded-xl"
              >
                {formOcs.done || "Done"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* 6. Visual & Cover Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              {formSections.cover?.title || ""}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formSections.cover?.subtitle || ""}
            </p>
          </div>
        </div>

        <div className="relative aspect-video rounded-3xl border border-dashed border-border/60 bg-muted/10 flex items-center justify-center overflow-hidden group/cover transition-all hover:bg-muted/20">
          {coverDisplayUrl ? (
            <img
              src={coverDisplayUrl}
              className="w-full h-full object-cover"
              alt={formHelpers.cover_alt || ""}
            />
          ) : (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center mx-auto mb-3 border border-border/50 shadow-sm">
                <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground/50 font-semibold">
                {formHelpers.cover_ratio || ""}
              </p>
            </div>
          )}

          {/* Action Overlay */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-4 transition-all duration-300",
              coverDisplayUrl
                ? "bg-black/40 opacity-0 group-hover/cover:opacity-100 backdrop-blur-[2px]"
                : "bg-transparent opacity-100",
            )}
          >
            <TooltipProvider delayDuration={0}>
              {/* Upload Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="w-12 h-12 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {formButtons.upload || "Upload"}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Gallery Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="w-12 h-12 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"
                    onClick={() => setIsGalleryOpen(true)}
                  >
                    <Images className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {tGallery("tooltip.gallery") || "Gallery"}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* AI Generate Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="w-12 h-12 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all bg-primary/90 text-primary-foreground hover:bg-primary"
                    onClick={handleGenerateCover}
                    disabled={isGenerating || isPolling}
                  >
                    {isGenerating || isPolling ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {formButtons.ai_generate || "AI Generate"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverUpload}
        />
      </section>

      {/* Action Footer */}
      <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-end gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="w-full sm:w-auto px-8 h-12 rounded-2xl font-bold"
        >
          {formButtons.discard || ""}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-12 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-extrabold shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:translate-y-0"
        >
          {isSubmitting
            ? formButtons.publishing || ""
            : formButtons.publish || ""}
        </Button>
      </div>

      <ArtworkGalleryDialog
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        onConfirm={(urls) => {
          if (urls.length > 0) {
            void applyCoverUrl(urls[0], () => setIsGalleryOpen(false));
          }
        }}
        maxSelect={1}
      />

      <GenerationStatusModal
        open={isStatusOpen}
        onOpenChange={(open) => {
          setIsStatusOpen(open);
          if (!open) resetGenerationState();
        }}
        status={statusType}
        message={generationStatus?.message}
        error={pollingError || generationError}
        previewUrl={generationResults?.[0]?.image_url}
      />
    </form>
  );
}
