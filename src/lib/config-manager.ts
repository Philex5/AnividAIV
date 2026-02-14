/**
 * 配置管理器 - 支持按需加载和缓存
 * 解决原有配置系统的性能问题和字段不一致问题
 */

import type {
  AIModel,
  ConfigParameter,
  CharacterConfig,
  AnimeGalleryImage,
  AnimeConfig,
  OCGalleryCharacter,
} from "@/lib/configs";

// Prompt template types
interface PromptTemplate {
  version: string;
  lastUpdated: string;
  config_type: string;
  templates: {
    base_template: string;
    style_template: string;
    quality_enhancement: string;
  };
  prompt_structure: {
    integration_order: string[];
    separator: string;
    add_quality_terms: boolean;
  };
  settings: {
    max_length: number;
    sanitize_prompt: boolean;
    remove_duplicate_commas: boolean;
    trim_trailing_comma: boolean;
  };
}

// Video prompt template types
interface VideoPromptTemplate {
  version: string;
  description: string;
  language: string;
  templates: {
    camera_motion_template?: string;
    quality_enhancement: string;
  };
  prompt_structure: {
    integration_order: string[];
    separator: string;
    add_quality_terms: boolean;
  };
  settings: {
    sanitize_prompt: boolean;
    max_length: number;
  };
}

// Character prompt template types
interface CharacterPromptTemplate {
  version: string;
  lastUpdated: string;
  config_type: string;
  templates: {
    character_data_template: string;
    theme_specifics_template: string;
    quality_enhancement: string;
  };
  prompt_structure: {
    integration_order: string[];
    separator: string;
    add_quality_terms: boolean;
  };
  field_naming_rules: {
    no_label_fields: string[];
    labeled_fields: { [key: string]: string };
    list_fields?: { [key: string]: string };
    suffix_fields: { [key: string]: string };
  };
  settings: {
    max_length: number;
    sanitize_prompt: boolean;
    remove_duplicate_commas: boolean;
    trim_trailing_comma: boolean;
  };
}

// Background prompt template types
interface BackgroundPromptTemplate {
  version: string;
  lastUpdated: string;
  config_type: string;
  templates: {
    base_template: string;
    style_template: string;
    quality_enhancement: string;
  };
  prompt_structure: {
    integration_order: string[];
    separator: string;
    add_quality_terms: boolean;
  };
  settings: {
    max_length: number;
    sanitize_prompt: boolean;
  };
}

// OC quick generation prompt types
interface OcQuickGenerationPromptTemplate {
  version: string;
  lastUpdated: string;
  config_type: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  user_prompt_template: string;
  output_schema?: Record<string, unknown>;
}

interface OcQuickGenerationPromptBundle {
  version: string;
  lastUpdated: string;
  config_type: string;
  model: string;
  temperature: number;
  max_tokens: number;
  templates: {
    base: Partial<OcQuickGenerationPromptTemplate>;
    background: Partial<OcQuickGenerationPromptTemplate>;
    personality_skills: Partial<OcQuickGenerationPromptTemplate>;
  };
}

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  backoffMultiplier: 2,
};

// 重试工具函数
async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `Operation failed, retrying... (${retries} attempts left)`,
        error
      );
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_CONFIG.retryDelay)
      );
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
}

interface ConfigCache {
  models?: AIModel[];
  animeConfig?: AnimeConfig;
  characterConfig?: CharacterConfig;
  animeGallery?: AnimeGalleryImage[];
  ocGallery?: OCGalleryCharacter[];
  promptTemplate?: PromptTemplate;
  characterPromptTemplate?: CharacterPromptTemplate;
  backgroundPromptTemplate?: BackgroundPromptTemplate;
  ocQuickGenerationPromptTemplate?: OcQuickGenerationPromptTemplate;
  ocQuickGenerationPromptBundle?: OcQuickGenerationPromptBundle;
  videoPromptTemplate?: VideoPromptTemplate;
  characterStyles?: ConfigParameter[];
  species?: ConfigParameter[];
  roles?: ConfigParameter[];
  cameraMotions?: ConfigParameter[];
}

class ConfigManager {
  private static cache: ConfigCache = {};
  private static loadPromises: { [key: string]: Promise<any> } = {};

  /**
   * 懒加载AI模型配置
   */
  static async getModels(): Promise<AIModel[]> {
    if (this.cache.models) {
      return this.cache.models;
    }

    if (!this.loadPromises.models) {
      this.loadPromises.models = this.loadModels();
    }

    return this.loadPromises.models;
  }

  /**
   * 懒加载动漫配置（包含 styles, scenes, outfits, actions）
   */
  static async getAnimeConfig(): Promise<AnimeConfig> {
    if (this.cache.animeConfig) {
      return this.cache.animeConfig;
    }

    if (!this.loadPromises.animeConfig) {
      this.loadPromises.animeConfig = this.loadAnimeConfig();
    }

    return this.loadPromises.animeConfig;
  }

  /**
   * 获取样式配置
   */
  static async getStyles(): Promise<ConfigParameter[]> {
    const animeConfig = await this.getAnimeConfig();
    return animeConfig.styles;
  }

  /**
   * 获取场景配置
   */
  static async getScenes(): Promise<ConfigParameter[]> {
    const animeConfig = await this.getAnimeConfig();
    return animeConfig.scenes;
  }

  /**
   * 获取服装配置
   */
  static async getOutfits(): Promise<ConfigParameter[]> {
    const animeConfig = await this.getAnimeConfig();
    return animeConfig.outfits;
  }

  /**
   * 获取动作配置
   */
  static async getActions(): Promise<ConfigParameter[]> {
    const animeConfig = await this.getAnimeConfig();
    return animeConfig.actions;
  }

  /**
   * 懒加载角色详细配置
   */
  static async getCharacterConfig(): Promise<CharacterConfig> {
    if (this.cache.characterConfig) {
      return this.cache.characterConfig;
    }

    if (!this.loadPromises.characterConfig) {
      this.loadPromises.characterConfig = this.loadCharacterConfig();
    }

    return this.loadPromises.characterConfig;
  }

  /**
   * 懒加载动漫画廊
   */
  static async getAnimeGallery(): Promise<AnimeGalleryImage[]> {
    if (this.cache.animeGallery) {
      return this.cache.animeGallery;
    }

    if (!this.loadPromises.animeGallery) {
      this.loadPromises.animeGallery = this.loadAnimeGallery();
    }

    return this.loadPromises.animeGallery;
  }

  /**
   * 懒加载 OC 画廊
   */
  static async getOCGallery(): Promise<OCGalleryCharacter[]> {
    if (this.cache.ocGallery) {
      return this.cache.ocGallery;
    }

    if (!this.loadPromises.ocGallery) {
      this.loadPromises.ocGallery = this.loadOCGallery();
    }

    return this.loadPromises.ocGallery;
  }

  // 高效查找方法

  /**
   * 根据UUID查找样式配置
   */
  static async getStyleById(
    uuid: string
  ): Promise<ConfigParameter | undefined> {
    const styles = await this.getStyles();
    return styles.find((s) => s.uuid === uuid);
  }

  /**
   * 根据UUID查找场景配置
   */
  static async getSceneById(
    uuid: string
  ): Promise<ConfigParameter | undefined> {
    const scenes = await this.getScenes();
    return scenes.find((s) => s.uuid === uuid);
  }

  /**
   * 根据UUID查找服装配置
   */
  static async getOutfitById(
    uuid: string
  ): Promise<ConfigParameter | undefined> {
    const outfits = await this.getOutfits();
    return outfits.find((o) => o.uuid === uuid);
  }

  /**
   * 根据UUID查找动作配置
   */
  static async getActionById(
    uuid: string
  ): Promise<ConfigParameter | undefined> {
    const actions = await this.getActions();
    return actions.find((a) => a.uuid === uuid);
  }

  /**
   * 懒加载 Prompt 模板配置
   */
  static async getPromptTemplate(): Promise<PromptTemplate> {
    if (this.cache.promptTemplate) {
      return this.cache.promptTemplate;
    }

    if (!this.loadPromises.promptTemplate) {
      this.loadPromises.promptTemplate = this.loadPromptTemplate();
    }

    return this.loadPromises.promptTemplate;
  }

  /**
   * 懒加载角色 Prompt 模板配置
   */
  static async getCharacterPromptTemplate(): Promise<CharacterPromptTemplate> {
    if (this.cache.characterPromptTemplate) {
      return this.cache.characterPromptTemplate;
    }

    if (!this.loadPromises.characterPromptTemplate) {
      this.loadPromises.characterPromptTemplate =
        this.loadCharacterPromptTemplate();
    }

    return this.loadPromises.characterPromptTemplate;
  }

  /**
   * 懒加载背景生成 Prompt 模板配置
   */
  static async getBackgroundPromptTemplate(): Promise<BackgroundPromptTemplate> {
    if (this.cache.backgroundPromptTemplate) {
      return this.cache.backgroundPromptTemplate;
    }

    if (!this.loadPromises.backgroundPromptTemplate) {
      this.loadPromises.backgroundPromptTemplate =
        this.loadBackgroundPromptTemplate();
    }

    return this.loadPromises.backgroundPromptTemplate;
  }

  /**
   * 懒加载 OC 快速生成 Prompt 配置
   */
  static async getOcQuickGenerationPrompt(): Promise<OcQuickGenerationPromptTemplate> {
    return this.getOcQuickGenerationStepPrompt("base");
  }

  /**
   * Backward-compatible alias for docs/specs naming.
   */
  static async getQuickGenerationPrompt(): Promise<OcQuickGenerationPromptTemplate> {
    return this.getOcQuickGenerationPrompt();
  }

  static async getOcQuickGenerationBasePrompt(): Promise<OcQuickGenerationPromptTemplate> {
    return this.getOcQuickGenerationStepPrompt("base");
  }

  static async getOcQuickGenerationBackgroundPrompt(): Promise<OcQuickGenerationPromptTemplate> {
    return this.getOcQuickGenerationStepPrompt("background");
  }

  static async getOcQuickGenerationPersonalitySkillsPrompt(): Promise<OcQuickGenerationPromptTemplate> {
    return this.getOcQuickGenerationStepPrompt("personality_skills");
  }

  /**
   * 懒加载角色风格配置
   */
  static async getCharacterStyles(): Promise<ConfigParameter[]> {
    if (this.cache.characterStyles) {
      return this.cache.characterStyles;
    }

    if (!this.loadPromises.characterStyles) {
      this.loadPromises.characterStyles = this.loadCharacterStyles();
    }

    return this.loadPromises.characterStyles;
  }

  /**
   * 懒加载物种配置
   */
  static async getSpecies(): Promise<ConfigParameter[]> {
    if (this.cache.species) {
      return this.cache.species;
    }

    if (!this.loadPromises.species) {
      this.loadPromises.species = this.loadSpecies();
    }

    return this.loadPromises.species;
  }

  /**
   * 懒加载角色配置
   */
  static async getRoles(): Promise<ConfigParameter[]> {
    if (this.cache.roles) {
      return this.cache.roles;
    }

    if (!this.loadPromises.roles) {
      this.loadPromises.roles = this.loadRoles();
    }

    return this.loadPromises.roles;
  }

  /**
   * 懒加载视频 Prompt 模板配置
   */
  static async getVideoPromptTemplate(): Promise<VideoPromptTemplate> {
    if (this.cache.videoPromptTemplate) {
      return this.cache.videoPromptTemplate;
    }

    if (!this.loadPromises.videoPromptTemplate) {
      this.loadPromises.videoPromptTemplate = this.loadVideoPromptTemplate();
    }

    return this.loadPromises.videoPromptTemplate;
  }

  /**
   * 懒加载运镜配置
   */
  static async getCameraMotions(): Promise<ConfigParameter[]> {
    if (this.cache.cameraMotions) {
      return this.cache.cameraMotions;
    }

    if (!this.loadPromises.cameraMotions) {
      this.loadPromises.cameraMotions = this.loadCameraMotions();
    }

    return this.loadPromises.cameraMotions;
  }

  /**
   * 根据key查找运镜配置
   */
  static async getCameraMotionByKey(
    key: string
  ): Promise<ConfigParameter | undefined> {
    const cameraMotions = await this.getCameraMotions();
    return cameraMotions.find((c) => c.key === key);
  }

  /**
   * 获取激活的模型
   */
  static async getActiveModels(): Promise<AIModel[]> {
    const models = await this.getModels();
    return models.filter((m) => m.status === "active");
  }

  /**
   * 获取默认模型
   */
  static async getDefaultModel(): Promise<AIModel | undefined> {
    const models = await this.getActiveModels();
    return models.find((m) => m.is_default) || models[0];
  }

  // 私有加载方法

  private static async loadModels(): Promise<AIModel[]> {
    return withRetry(async () => {
      const data = await import("@/configs/models/ai-models.json");
      this.cache.models = data.models as AIModel[];
      return this.cache.models;
    }).catch((error) => {
      console.error("Failed to load models config after retries:", error);
      this.cache.models = [];
      return this.cache.models;
    });
  }

  private static async loadAnimeConfig(): Promise<AnimeConfig> {
    return withRetry(async () => {
      const [stylesData, scenesData, outfitsData, actionsData] =
        await Promise.all([
          import("@/configs/styles/anime_styles.json"),
          import("@/configs/parameters/scenes.json"),
          import("@/configs/parameters/outfits.json"),
          import("@/configs/parameters/actions.json"),
        ]);

      this.cache.animeConfig = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        config_type: "anime_generation",
        styles: (stylesData as any).items as ConfigParameter[],
        scenes: (scenesData as any).items as ConfigParameter[],
        outfits: (outfitsData as any).items as ConfigParameter[],
        actions: (actionsData as any).items as ConfigParameter[],
      };

      const totalItems =
        this.cache.animeConfig.styles.length +
        this.cache.animeConfig.scenes.length +
        this.cache.animeConfig.outfits.length +
        this.cache.animeConfig.actions.length;
      return this.cache.animeConfig;
    }).catch((error) => {
      console.error("Failed to load anime config after retries:", error);
      this.cache.animeConfig = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        config_type: "anime_generation",
        styles: [],
        scenes: [],
        outfits: [],
        actions: [],
      };
      return this.cache.animeConfig;
    });
  }

  private static async loadCharacterConfig(): Promise<CharacterConfig> {
    return withRetry(async () => {
      const data = await import("@/configs/characters/characters.json");
      this.cache.characterConfig = data as CharacterConfig;
      return this.cache.characterConfig;
    }).catch((error) => {
      console.error("Failed to load character config after retries:", error);
      this.cache.characterConfig = {
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
      };
      return this.cache.characterConfig;
    });
  }

  private static async loadAnimeGallery(): Promise<AnimeGalleryImage[]> {
    return withRetry(async () => {
      const data = await import("@/configs/gallery/anime-example-gallery.json");
      this.cache.animeGallery = (data as any).examples as AnimeGalleryImage[];
      return this.cache.animeGallery;
    }).catch((error) => {
      console.error(
        "Failed to load anime gallery config after retries:",
        error
      );
      this.cache.animeGallery = [];
      return this.cache.animeGallery;
    });
  }

  private static async loadOCGallery(): Promise<OCGalleryCharacter[]> {
    return withRetry(async () => {
      const data = await import("@/configs/gallery/oc-example-gallery.json");
      this.cache.ocGallery = (data as any).characters as OCGalleryCharacter[];
      return this.cache.ocGallery;
    }).catch((error) => {
      console.error("Failed to load OC gallery config after retries:", error);
      this.cache.ocGallery = [];
      return this.cache.ocGallery;
    });
  }

  private static async loadPromptTemplate(): Promise<PromptTemplate> {
    return withRetry(async () => {
      const data = await import("@/configs/prompts/base-generation.json");
      this.cache.promptTemplate = data as PromptTemplate;
      return this.cache.promptTemplate;
    }).catch((error) => {
      console.error(
        "Failed to load prompt template config after retries:",
        error
      );
      // 返回默认配置
      this.cache.promptTemplate = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        config_type: "anime_generation",
        templates: {
          base_template: "{user_prompt}",
          style_template: "{style_prompt}",
          quality_enhancement:
            "masterpiece, best quality, highres, detailed, anime style",
        },
        prompt_structure: {
          integration_order: [
            "user_prompt",
            "style_prompt",
            "quality_enhancement",
          ],
          separator: ", ",
          add_quality_terms: true,
        },
        settings: {
          max_length: 2000,
          sanitize_prompt: true,
          remove_duplicate_commas: true,
          trim_trailing_comma: true,
        },
      };
      return this.cache.promptTemplate;
    });
  }

  private static async loadCharacterPromptTemplate(): Promise<CharacterPromptTemplate> {
    return withRetry(async () => {
      const data = await import("@/configs/prompts/character-generation.json");
      this.cache.characterPromptTemplate = data as CharacterPromptTemplate;
      return this.cache.characterPromptTemplate;
    }).catch((error) => {
      console.error(
        "Failed to load character prompt template config after retries:",
        error
      );
      // 返回默认配置
      this.cache.characterPromptTemplate = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        config_type: "character_generation",
        templates: {
          character_data_template: "{character_data}",
          theme_specifics_template: "{theme_specifics}",
          quality_enhancement:
            "masterpiece, best quality, highres, detailed character design, anime style",
        },
        prompt_structure: {
          integration_order: [
            "character_data",
            "quality_enhancement",
          ],
          separator: ". ",
          add_quality_terms: true,
        },
        field_naming_rules: {
          no_label_fields: ["name", "gender"],
          labeled_fields: {
            hair_color: "hair color",
            eye_color: "eye color",
            body_type: "body type",
            outfit_style: "outfit style",
            art_style: "art style",
          },
          list_fields: {},
          suffix_fields: {
            age: "years old",
          },
        },
        settings: {
          max_length: 2000,
          sanitize_prompt: true,
          remove_duplicate_commas: true,
          trim_trailing_comma: true,
        },
      };
      return this.cache.characterPromptTemplate;
    });
  }

  private static async loadBackgroundPromptTemplate(): Promise<BackgroundPromptTemplate> {
    return withRetry(async () => {
      const data = await import("@/configs/prompts/background-generation.json");
      this.cache.backgroundPromptTemplate = data as BackgroundPromptTemplate;
      return this.cache.backgroundPromptTemplate;
    }).catch((error) => {
      console.error(
        "Failed to load background prompt template config after retries:",
        error
      );
      // fallback
      this.cache.backgroundPromptTemplate = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        config_type: "background_generation",
        templates: {
          base_template: "{scene_description}",
          quality_enhancement:
            "masterpiece, best quality, highres, extremely detailed background, 8k wallpaper, no character, scenery only",
          style_template: "{style}",
        },
        prompt_structure: {
          integration_order: [
            "base_template",
            "style_template",
            "quality_enhancement",
          ],
          separator: ", ",
          add_quality_terms: true,
        },
        settings: {
          max_length: 1000,
          sanitize_prompt: true,
        },
      };
      return this.cache.backgroundPromptTemplate;
    });
  }

  private static async loadOcQuickGenerationPromptTemplate(): Promise<OcQuickGenerationPromptTemplate> {
    return this.getOcQuickGenerationStepPrompt("base");
  }

  private static async loadOcQuickGenerationPromptBundle(): Promise<OcQuickGenerationPromptBundle> {
    return withRetry(async () => {
      const data = await import("@/configs/prompts/oc-quick-generation.json");
      this.cache.ocQuickGenerationPromptBundle =
        data as OcQuickGenerationPromptBundle;
      return this.cache.ocQuickGenerationPromptBundle;
    }).catch((error) => {
      console.error(
        "Failed to load oc quick generation prompt bundle config after retries:",
        error
      );
      this.cache.ocQuickGenerationPromptBundle = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        config_type: "oc_quick_generation",
        model: "gpt-4.1",
        temperature: 0.7,
        max_tokens: 1200,
        templates: {
          base: {
            config_type: "oc_quick_generation_base",
            temperature: 0.6,
            max_tokens: 900,
            system_prompt:
              "You are a professional anime OC designer. Output MUST be valid JSON only, no markdown. Focus only on appearance and identity fields.",
            user_prompt_template:
              "User description: \"{user_description}\"\n\nReturn a single JSON object:\n{\n  \"name\": string,\n  \"gender\": \"male\"|\"female\"|\"other\",\n  \"age\": number|null,\n  \"role\": string,\n  \"species\": string,\n  \"body_type\": string,\n  \"hair_color\": string,\n  \"hair_style\": string,\n  \"eye_color\": string,\n  \"outfit_style\": string,\n  \"accessories\": string[],\n  \"appearance_features\": string[],\n  \"reasoning\": {\n    \"extracted_features\": string[],\n    \"suggestions\": string[]\n  }\n}\n",
          },
          background: {
            config_type: "oc_quick_generation_background",
            temperature: 0.7,
            max_tokens: 1200,
            system_prompt:
              "You are a professional anime OC storyteller. Output MUST be valid JSON only, no markdown. Focus only on background and story fields.",
            user_prompt_template:
              "User description: \"{user_description}\"\nAppearance JSON: {appearance_json}\n\nReturn a single JSON object:\n{\n  \"brief_introduction\": string,\n  \"background_story\": string,\n  \"background_segments\": [\n    {\"title\": string, \"content\": string}\n  ]\n}\n",
          },
          personality_skills: {
            config_type: "oc_quick_generation_personality_skills",
            temperature: 0.7,
            max_tokens: 1400,
            system_prompt:
              "You are a professional anime OC designer. Output MUST be valid JSON only, no markdown. Focus only on personality and skills fields.",
            user_prompt_template:
              "User description: \"{user_description}\"\nAppearance JSON: {appearance_json}\nBackground JSON: {background_json}\n\nReturn a single JSON object:\n{\n  \"personality_tags\": string[],\n  \"extended_attributes\": {\"key\": \"value\"},\n  \"greeting\": string,\n  \"quotes\": string[],\n  \"skills\": {\n    \"stats\": [\n      {\"label\": \"STR\", \"value\": number},\n      {\"label\": \"INT\", \"value\": number},\n      {\"label\": \"AGI\", \"value\": number},\n      {\"label\": \"VIT\", \"value\": number},\n      {\"label\": \"DEX\", \"value\": number},\n      {\"label\": \"LUK\", \"value\": number}\n    ],\n    \"abilities\": [\n      {\"name\": string, \"type\": \"Default\"|\"Magic\"|\"Elemental\"|\"Physical\"|\"Psychic\"|\"Spatial\"|\"Buff\"|\"Summoning\"|\"Shapeshifting\"|\"Technological\"|\"Potion\"|\"Unique\", \"level\": number, \"description\": string, \"icon\": \"Default\"|\"Magic\"|\"Elemental\"|\"Physical\"|\"Psychic\"|\"Spatial\"|\"Buff\"|\"Summoning\"|\"Shapeshifting\"|\"Technological\"|\"Potion\"|\"Unique\"}\n    ]\n  }\n}\nRules:\n- personality_tags should be 3-8 unique items.\n- greeting should be 1 short line.\n- quotes should be 2-3 short lines.\n- stats values are integers from 1 to 10.\n- abilities should be 3-5 items with distinct names.\n- abilities[].type must be one of: Default, Magic, Elemental, Physical, Psychic, Spatial, Buff, Summoning, Shapeshifting, Technological, Potion, Unique.\n- abilities[].icon must match abilities[].type and use the same value.\n",
          },
        },
      };
      return this.cache.ocQuickGenerationPromptBundle;
    });
  }

  private static async getOcQuickGenerationStepPrompt(
    step: keyof OcQuickGenerationPromptBundle["templates"]
  ): Promise<OcQuickGenerationPromptTemplate> {
    if (!this.cache.ocQuickGenerationPromptBundle) {
      if (!this.loadPromises.ocQuickGenerationPromptBundle) {
        this.loadPromises.ocQuickGenerationPromptBundle =
          this.loadOcQuickGenerationPromptBundle();
      }
      this.cache.ocQuickGenerationPromptBundle =
        await this.loadPromises.ocQuickGenerationPromptBundle;
    }

    const bundle = this.cache.ocQuickGenerationPromptBundle;
    if (!bundle) {
      throw new Error("OC quick generation prompt bundle is missing");
    }
    const stepConfig = bundle.templates[step] || {};

    return {
      version: bundle.version,
      lastUpdated: bundle.lastUpdated,
      config_type: stepConfig.config_type || `oc_quick_generation_${step}`,
      model: stepConfig.model || bundle.model,
      temperature: stepConfig.temperature ?? bundle.temperature,
      max_tokens: stepConfig.max_tokens ?? bundle.max_tokens,
      system_prompt: stepConfig.system_prompt || "",
      user_prompt_template: stepConfig.user_prompt_template || "",
      output_schema: stepConfig.output_schema,
    };
  }

  private static async loadCharacterStyles(): Promise<ConfigParameter[]> {
    return withRetry(async () => {
      const data = await import("@/configs/styles/character_styles.json");
      this.cache.characterStyles = (data as any).items as ConfigParameter[];
      return this.cache.characterStyles;
    }).catch((error) => {
      console.error(
        "Failed to load character styles config after retries:",
        error
      );
      this.cache.characterStyles = [];
      return this.cache.characterStyles;
    });
  }

  private static async loadSpecies(): Promise<ConfigParameter[]> {
    return withRetry(async () => {
      const data = await import("@/configs/characters/species.json");
      this.cache.species = (data as any).items as ConfigParameter[];
      return this.cache.species;
    }).catch((error) => {
      console.error("Failed to load species config after retries:", error);
      this.cache.species = [];
      return this.cache.species;
    });
  }

  private static async loadRoles(): Promise<ConfigParameter[]> {
    return withRetry(async () => {
      const data = await import("@/configs/characters/roles.json");
      this.cache.roles = (data as any).items as ConfigParameter[];
      return this.cache.roles;
    }).catch((error) => {
      console.error("Failed to load roles config after retries:", error);
      this.cache.roles = [];
      return this.cache.roles;
    });
  }

  private static async loadVideoPromptTemplate(): Promise<VideoPromptTemplate> {
    return withRetry(async () => {
      const data = await import("@/configs/prompts/video/base-video.json");
      this.cache.videoPromptTemplate = data as VideoPromptTemplate;
      return this.cache.videoPromptTemplate;
    }).catch((error) => {
      console.error(
        "Failed to load video prompt template config after retries:",
        error
      );
      // 返回默认配置
      this.cache.videoPromptTemplate = {
        version: "1.0.0",
        description: "Base template for anime-style video generation",
        language: "en",
        templates: {
          quality_enhancement: "anime cinematic, high quality, detailed lighting, vivid colors",
        },
        prompt_structure: {
          integration_order: [
            "user_prompt",
            "character_prompt",
            "camera_motion",
            "style_prompt",
            "quality_enhancement",
          ],
          separator: ". ",
          add_quality_terms: true,
        },
        settings: {
          sanitize_prompt: true,
          max_length: 2000,
        },
      };
      return this.cache.videoPromptTemplate;
    });
  }

  private static async loadCameraMotions(): Promise<ConfigParameter[]> {
    return withRetry(async () => {
      const data = await import("@/configs/parameters/camera-motions.json");
      this.cache.cameraMotions = (data as any).items as ConfigParameter[];
      return this.cache.cameraMotions;
    }).catch((error) => {
      console.error("Failed to load camera motions config after retries:", error);
      this.cache.cameraMotions = [];
      return this.cache.cameraMotions;
    });
  }

  /**
   * 清空缓存（用于测试或重新加载配置）
   */
  static clearCache(): void {
    this.cache = {};
    this.loadPromises = {};
  }

  /**
   * 预加载所有配置（可选的性能优化）
   */
  static async preloadAll(): Promise<void> {
    await Promise.all([
      this.getModels(),
      this.getAnimeConfig(),
      this.getCharacterConfig(),
      this.getAnimeGallery(),
      this.getOCGallery(),
      this.getPromptTemplate(),
      this.getCharacterPromptTemplate(),
      this.getVideoPromptTemplate(),
      this.getCharacterStyles(),
      this.getSpecies(),
      this.getRoles(),
      this.getCameraMotions(),
    ]);
  }
}

export type { CharacterPromptTemplate, VideoPromptTemplate, BackgroundPromptTemplate };

export default ConfigManager;
