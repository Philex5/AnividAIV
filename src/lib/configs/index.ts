/**
 * 配置文件导出
 * 使用 ConfigManager 实现动态加载，支持 Cloudflare Workers 环境
 */

import ConfigManager from "@/lib/config-manager";

export interface ModelImageParams {
  max_images: number;
  image_field: string;
  oc_reference_priority: "oc_first" | "reference_first";
  supports_oc_and_reference: boolean;
}

// Prompt length configuration
export const DEFAULT_PROMPT_MAX_LENGTH = 2000;
export const DEFAULT_PROMPT_MIN_LENGTH = 1;

export interface UIParamConfig {
  key: string;
  label?: string;
  i18n_label_key?: string;
  type: "select" | "number" | "text" | "toggle";
  options?: string[];
  min?: number;
  max?: number;
  default: string | number | boolean;
  unit?: string;
  placeholder_key?: string;
  constraints?: {
    dependsOn?: string; // 依赖的参数key
    when?: string | number | boolean; // 依赖参数的值
    availableOptions?: string[]; // 当依赖条件满足时可用的选项
    disabledOptions?: string[]; // 当依赖条件满足时禁用的选项
    autoAdjust?: string | number | boolean; // 当冲突时自动调整到的值
  }[];
}

// Model configuration with prompt length limits
export interface AIModelConfig {
  image_params?: ModelImageParams;
  prompt_max_length?: number;
  prompt_min_length?: number;
}

export interface AIModelBadge {
  text: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface AIModel {
  name: string;
  model_id: string;
  i18n_name_key: string;
  i18n_description_key: string;
  provider: string;
  api_endpoint: string;
  max_counts: number;
  supported_ratios: string[];
  credits_per_generation: number;
  max_generations_per_minute: number;
  status: "active" | "inactive";
  is_default: boolean;
  is_premium?: boolean;
  badges?: AIModelBadge[];
  thumbnail_url: string;
  model_type: "text2img" | "img2img" | "text2video";
  ui_config?: {
    params: UIParamConfig[];
  };
  config: Record<string, any> & AIModelConfig;
}

export interface ConfigParameter {
  uuid: string;
  name: string;
  key: string;
  i18n_name_key: string;
  i18n_description_key?: string;
  prompt_value?: string;
  thumbnail_url?: string;
  sort_order: number;
  status: string;
  config_data?: Record<string, any>;
}

export interface AspectRatio {
  uuid: string;
  name: string;
  key: string;
  i18n_name_key: string;
  i18n_description_key?: string;
  thumbnail_url?: string;
  sort_order: number;
  status: string;
  config_data: {
    width: number;
    height: number;
    ratio: string;
  };
}

export interface AnimeGalleryImage {
  uuid: string;
  r2_path: string;
  alt: string;
  aspect_ratio: string;
  width?: number;
  height?: number;
  title: string;
  parameters: {
    model_id: string;
    prompt: string;
    style?: string;
    scene?: string;
    outfit?: string;
    character?: string;
    action?: string;
    aspect_ratio?: string;
  };
  sort_order: number;
}

export interface OCGalleryCharacter {
  uuid: string;
  name: string;
  role?: string;
  brief_description?: string;
  description?: string; // Legacy field, use brief_description instead
  profile_url: string;
  avatar_url: string;
  thumbnail_path: string;
  modules?: unknown;
  character_data: {
    species: string;
    gender: string;
    age: number;
    personality_tags: string[];
    art_style: string;
    body_type?: string;
    hair_color: string;
    hair_style?: string;
    eye_color: string;
    outfit_style?: string;
    accessories?: string[];
    appearance_features?: string;
    role?: string;
    character_role?: string;
    brief_introduction?: string;
    background_story?: string;
    extended_attributes?: Array<{
      key: string;
      value: string;
    }>;
  };
  sort_order: number;
}

export interface OCGalleryConfig {
  version: string;
  lastUpdated: string;
  description: string;
  characters: OCGalleryCharacter[];
}

// Anime generation configuration interface
export interface AnimeConfig {
  version: string;
  lastUpdated: string;
  config_type: string;
  styles: ConfigParameter[];
  scenes: ConfigParameter[];
  outfits: ConfigParameter[];
  actions: ConfigParameter[];
}

// Character configuration interfaces
export interface PersonalityTag {
  key: string;
  i18n_key: string;
  weight: number;
}

export interface PersonalityCategory {
  category: string;
  i18n_key: string;
  tags: PersonalityTag[];
}

export interface AppearanceOption {
  key: string;
  i18n_key: string;
  prompt?: string;
  value?: string;
}

export interface OutfitStyle {
  key: string;
  i18n_key: string;
  prompt: string;
}

export interface OutfitCategory {
  category: string;
  i18n_key: string;
  styles: OutfitStyle[];
}

export interface AccessoryItem {
  key: string;
  i18n_key: string;
  prompt: string;
}

export interface AccessoryCategory {
  category: string;
  i18n_key: string;
  items: AccessoryItem[];
}

export interface CharacterConfig {
  version: string;
  lastUpdated: string;
  config_type: string;
  personality_tags: {
    categories: PersonalityCategory[];
  };
  outfit_styles: {
    categories: OutfitCategory[];
  };
  appearance_options: {
    hair_styles: AppearanceOption[];
    eye_colors: AppearanceOption[];
    body_types: AppearanceOption[];
  };
  accessories: {
    categories: AccessoryCategory[];
  };
}

export interface ConfigData {
  models: AIModel[];
  animeConfig: AnimeConfig;
  characterConfig: CharacterConfig;
  animeGallery: AnimeGalleryImage[];
  ocGallery: OCGalleryConfig;
  videoGallery: any;
}

// Build-time static configuration data
// Legacy export - kept for backward compatibility, but now uses dynamic loading
export const configData: ConfigData = {
  models: [], // Will be loaded dynamically
  animeConfig: {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    config_type: "anime_generation",
    styles: [],
    scenes: [],
    outfits: [],
    actions: [],
  },
  characterConfig: {
    version: "1.0.0",
    lastUpdated: "",
    config_type: "character",
    personality_tags: { categories: [] },
    outfit_styles: { categories: [] },
    appearance_options: {
      hair_styles: [],
      eye_colors: [],
      body_types: [],
    },
    accessories: { categories: [] },
  },
  animeGallery: [],
  ocGallery: {
    version: "1.0.0",
    lastUpdated: "",
    description: "",
    characters: [],
  },
  videoGallery: {},
};

// Helper functions for common operations - Now uses ConfigManager
export const getActiveModels = async () => {
  return await ConfigManager.getActiveModels();
};

export const getDefaultModel = async () => {
  return await ConfigManager.getDefaultModel();
};

export const getVideoModels = async () => {
  const models = await ConfigManager.getModels();
  return models.filter((m) => m.model_type === "text2video" && m.status === "active");
};

// Anime configuration helper functions
export const getAnimeConfig = async () => {
  return await ConfigManager.getAnimeConfig();
};

export const getAnimeStyles = async () => {
  return await ConfigManager.getStyles();
};

export const getAnimeScenes = async () => {
  return await ConfigManager.getScenes();
};

export const getAnimeOutfits = async () => {
  return await ConfigManager.getOutfits();
};

export const getAnimeActions = async () => {
  return await ConfigManager.getActions();
};

// Video configuration helper functions
export const getCameraMotions = async () => {
  return await ConfigManager.getCameraMotions();
};

// Character configuration helper functions
export const getCharacterConfig = async () => {
  return await ConfigManager.getCharacterConfig();
};

export const getPersonalityTags = async () => {
  const config = await ConfigManager.getCharacterConfig();
  return config.personality_tags.categories.reduce(
    (acc: PersonalityTag[], category) => [...acc, ...category.tags],
    []
  );
};

export const getBodyTypes = async () => {
  const config = await ConfigManager.getCharacterConfig();
  return config.appearance_options.body_types;
};

export const getHairStyles = async () => {
  const config = await ConfigManager.getCharacterConfig();
  return config.appearance_options.hair_styles;
};

export const getEyeColors = async () => {
  const config = await ConfigManager.getCharacterConfig();
  return config.appearance_options.eye_colors;
};

export const getAccessoryOptions = async () => {
  const config = await ConfigManager.getCharacterConfig();
  return config.accessories.categories.reduce(
    (acc: AccessoryItem[], category) => [...acc, ...category.items],
    []
  );
};

export const getOutfitStyles = async () => {
  const config = await ConfigManager.getCharacterConfig();
  return config.outfit_styles.categories.reduce(
    (acc: OutfitStyle[], category) => [...acc, ...category.styles],
    []
  );
};

// Anime gallery helper functions
export const getAnimeGallery = async () => {
  return await ConfigManager.getAnimeGallery();
};

export const getOCGalleryConfig = async () => {
  const ocGallery = await ConfigManager.getOCGallery();
  return {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    description: "",
    characters: ocGallery,
  };
};

export const getOCGalleryCharacters = async () => {
  return await ConfigManager.getOCGallery();
};

export const getVideoExamples = async () => {
  // Load video gallery if it exists
  try {
    const data = await import(/* @vite-ignore */ "@/configs/gallery/video-example-gallery.json");
    return data.examples || [];
  } catch (error) {
    console.error("Failed to load video examples:", error);
    return [];
  }
};

// Prompt length helper functions
/**
 * Get the maximum prompt length for a model
 * @param model - The model configuration
 * @returns Maximum length, or default value if not configured
 */
export const getPromptMaxLength = (model?: AIModel | null): number => {
  return model?.config?.prompt_max_length ?? DEFAULT_PROMPT_MAX_LENGTH;
};

/**
 * Get the minimum prompt length for a model
 * @param model - The model configuration
 * @returns Minimum length, or default value if not configured
 */
export const getPromptMinLength = (model?: AIModel | null): number => {
  return model?.config?.prompt_min_length ?? DEFAULT_PROMPT_MIN_LENGTH;
};

export default configData;
