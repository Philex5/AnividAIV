import { useState } from "react";
import { toast } from "sonner";

interface UseCharacterGenerationReturn {
  triggerAvatarGeneration: (params: any) => Promise<string | null>;
  triggerProfileGeneration: (params: any) => Promise<string | null>;
  triggerBackgroundGeneration: (params: any) => Promise<string | null>;
  isGenerating: boolean;
}

export function useCharacterGeneration(): UseCharacterGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);

  const extractGenerationUuid = (data: any): string | null => {
    const uuid =
      data?.data?.generation_uuid ??
      data?.data?.uuid ??
      data?.generation_uuid ??
      data?.uuid ??
      null;
    return typeof uuid === "string" && uuid.trim() ? uuid : null;
  };

  const triggerAvatarGeneration = async (params: {
    reference_image_urls: string[];
    character_data?: any;
  }) => {
    if (isGenerating) return null;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/oc-maker/characters/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok || data.code !== 0) {
        throw new Error(data.message || data.error || "Failed to start generation");
      }

      return extractGenerationUuid(data);
    } catch (error: any) {
      console.error("Avatar generation failed:", error);
      toast.error(error.message || "Failed to start generation");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerProfileGeneration = async (params: {
    character_data: any;
    art_style?: string;
    aspect_ratio?: string;
    custom_prompt_additions?: string;
    prompt?: string;
    reference_image_urls?: string[];
    model_uuid?: string;
    gen_type?: "character" | "profile" | "full_body";
  }) => {
    if (isGenerating) return null;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/oc-maker/characters/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok || data.code !== 0) {
        throw new Error(data.message || data.error || "Failed to start generation");
      }

      return extractGenerationUuid(data);
    } catch (error: any) {
      console.error("Profile generation failed:", error);
      toast.error(error.message || "Failed to start generation");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerBackgroundGeneration = async (params: {
    scene_description: string;
    style?: string;
    reference_image_urls?: string[];
  }) => {
    if (isGenerating) return null;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/oc-maker/characters/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok || data.code !== 0) {
        throw new Error(data.message || data.error || "Failed to start generation");
      }

      return extractGenerationUuid(data);
    } catch (error: any) {
      console.error("Background generation failed:", error);
      toast.error(error.message || "Failed to start generation");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    triggerAvatarGeneration,
    triggerProfileGeneration,
    triggerBackgroundGeneration,
    isGenerating,
  };
}
