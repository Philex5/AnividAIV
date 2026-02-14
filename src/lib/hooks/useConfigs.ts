import { useState, useEffect, useMemo } from 'react';
import ConfigManager from '@/lib/config-manager';
import { toImageUrl } from '@/lib/r2-utils';
import type { 
  AIModel, 
  ConfigParameter, 
  AspectRatio, 
  CharacterConfig, 
  PersonalityTag, 
  AppearanceOption, 
  AccessoryItem, 
  OutfitStyle, 
  AnimeGalleryImage,
  AnimeConfig,
  OCGalleryCharacter
} from '@/lib/configs';

// 通用Hook状态接口
interface UseConfigState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

// 批量配置状态接口
interface UseAllConfigsState {
  models: AIModel[];
  defaultModel: AIModel | undefined;
  styles: ConfigParameter[];
  scenes: ConfigParameter[];
  outfits: ConfigParameter[];
  actions: ConfigParameter[];
  ratios: AspectRatio[];
  defaultRatio: AspectRatio | undefined;
  gallery: AnimeGalleryImage[];
  ocGallery: OCGalleryCharacter[];
  characterConfig: CharacterConfig;
  personalityTags: PersonalityTag[];
  bodyTypes: AppearanceOption[];
  hairStyles: AppearanceOption[];
  eyeColors: AppearanceOption[];
  accessoryOptions: AccessoryItem[];
  outfitStyles: OutfitStyle[];
  loading: boolean;
  error: string | null;
}

// 兼容性接口 - 保持向后兼容
export interface RawAIModel extends AIModel {}
export interface RawConfigParameter extends ConfigParameter {}
export interface RawAspectRatio extends AspectRatio {
  value: string; // Easy access to config_data.ratio
}

/**
 * Hook to get AI models (async)
 */
export function useModels() {
  const [state, setState] = useState<UseConfigState<{ models: AIModel[], defaultModel?: AIModel }>>({
    data: { models: [], defaultModel: undefined },
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadModels = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const models = await ConfigManager.getActiveModels();
        const defaultModel = await ConfigManager.getDefaultModel();

        if (mounted) {
          setState({
            data: { models, defaultModel },
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load models'
          }));
        }
      }
    };

    loadModels();
    
    return () => {
      mounted = false;
    };
  }, []);

  return {
    models: state.data.models as RawAIModel[],
    defaultModel: state.data.defaultModel,
    isLoading: state.loading, // 保持向后兼容的字段名
    loading: state.loading,
    error: state.error
  };
}

/**
 * Hook to get style parameters (async)
 */
export function useStyles(featuredOnly: boolean = false) {
  const result = useConfigParameters('styles', featuredOnly);
  
  return {
    styles: result.data,
    isLoading: result.loading,
    loading: result.loading,
    error: result.error
  };
}

/**
 * 通用配置Hook - 内部使用
 */
function useConfigParameters(
  configType: 'styles' | 'scenes' | 'outfits' | 'actions',
  featuredOnly: boolean = false
) {
  const [state, setState] = useState<UseConfigState<ConfigParameter[]>>({
    data: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        let configData: ConfigParameter[];
        
        switch (configType) {
          case 'styles':
            configData = await ConfigManager.getStyles();
            break;
          case 'scenes':
            configData = await ConfigManager.getScenes();
            break;
          case 'outfits':
            configData = await ConfigManager.getOutfits();
            break;
          case 'actions':
            configData = await ConfigManager.getActions();
            break;
          default:
            throw new Error(`Unknown config type: ${configType}`);
        }

        let filteredData = configData;
        if (featuredOnly) {
          filteredData = configData.filter(item => item.status === 'active');
        }

        if (mounted) {
          setState({
            data: filteredData.sort((a, b) => a.sort_order - b.sort_order),
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : `Failed to load ${configType}`
          }));
        }
      }
    };

    loadConfig();
    
    return () => {
      mounted = false;
    };
  }, [configType, featuredOnly]);

  return {
    data: state.data as RawConfigParameter[],
    loading: state.loading,
    error: state.error
  };
}

/**
 * Hook to get scene parameters (async)
 */
export function useScenes(featuredOnly: boolean = false) {
  const result = useConfigParameters('scenes', featuredOnly);
  
  return {
    scenes: result.data,
    isLoading: result.loading,
    loading: result.loading,
    error: result.error
  };
}

/**
 * Hook to get outfit parameters (async)
 */
export function useOutfits(featuredOnly: boolean = false) {
  const result = useConfigParameters('outfits', featuredOnly);
  
  return {
    outfits: result.data,
    isLoading: result.loading,
    loading: result.loading,
    error: result.error
  };
}

/**
 * Hook to get character parameters (deprecated)
 * Note: 这个Hook已弃用，角色配置现在通过 useCharacterConfig 获取
 */
export function useCharacters(featuredOnly: boolean = false) {
  return useMemo(() => {
    return {
      characters: [] as RawConfigParameter[],
      isLoading: false,
      loading: false,
      error: null
    };
  }, [featuredOnly]);
}

/**
 * Hook to get action parameters (async)
 */
export function useActions(featuredOnly: boolean = false) {
  const result = useConfigParameters('actions', featuredOnly);
  
  return {
    actions: result.data,
    isLoading: result.loading,
    loading: result.loading,
    error: result.error
  };
}

/**
 * Hook to get aspect ratios
 */
export function useRatios() {
  return useMemo(() => {
    // 返回空数组，因为现在直接使用模型的supported_ratios
    const ratios: RawAspectRatio[] = [];
    const defaultRatio = undefined;

    return {
      ratios,
      defaultRatio,
      isLoading: false,
      loading: false,
      error: null
    };
  }, []);
}

/**
 * Hook to get anime gallery images (async)
 */
export function useAnimeGallery(featuredOnly: boolean = false) {
  const [state, setState] = useState<UseConfigState<AnimeGalleryImage[]>>({
    data: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadGallery = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const images = await ConfigManager.getAnimeGallery();
        let filteredImages = images;
        
        if (featuredOnly) {
          // 如果需要featured过滤，可以在这里添加逻辑
          filteredImages = images;
        }

        if (mounted) {
          setState({
            data: filteredImages.sort((a, b) => a.sort_order - b.sort_order),
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load gallery'
          }));
        }
      }
    };

    loadGallery();
    
    return () => {
      mounted = false;
    };
  }, [featuredOnly]);

  return {
    images: state.data,
    isLoading: state.loading,
    loading: state.loading,
    error: state.error
  };
}

/**
 * Hook to get OC gallery characters
 */
export function useOCGallery() {
  const [state, setState] = useState<UseConfigState<OCGalleryCharacter[]>>({
    data: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadGallery = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const characters = await ConfigManager.getOCGallery();

        if (mounted) {
          setState({
            data: [...characters].sort((a, b) => a.sort_order - b.sort_order),
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load OC gallery'
          }));
        }
      }
    };

    loadGallery();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    characters: state.data,
    isLoading: state.loading,
    loading: state.loading,
    error: state.error
  };
}

/**
 * Hook to get a specific character by UUID
 */
export function useCharacterByUuid(characterUuid?: string) {
  const { characters, loading, error } = useOCGallery();
  const [character, setCharacter] = useState<OCGalleryCharacter | undefined>(undefined);

  useEffect(() => {
    if (!characterUuid || loading) {
      setCharacter(undefined);
      return;
    }

    const found = characters.find((char) => char.uuid === characterUuid);
    setCharacter(found);
  }, [characterUuid, characters, loading]);

  return {
    character,
    loading,
    error: character === undefined && !loading && characterUuid ? 'Character not found' : error
  };
}

/**
 * Hook to get character configuration data (async)
 */
export function useCharacterConfig() {
  const [state, setState] = useState<UseConfigState<{
    characterConfig: CharacterConfig;
    personalityTags: PersonalityTag[];
    bodyTypes: AppearanceOption[];
    hairStyles: AppearanceOption[];
    eyeColors: AppearanceOption[];
    accessoryOptions: AccessoryItem[];
    outfitStyles: OutfitStyle[];
    characterStyles: ConfigParameter[];
    species: ConfigParameter[];
    roles: ConfigParameter[];
  }>>({
    data: {
      characterConfig: {} as CharacterConfig,
      personalityTags: [],
      bodyTypes: [],
      hairStyles: [],
      eyeColors: [],
      accessoryOptions: [],
      outfitStyles: [],
      characterStyles: [],
      species: [],
      roles: []
    },
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadCharacterConfig = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // 并行加载所有角色相关配置
        const [characterConfig, characterStyles, species, roles] = await Promise.all([
          ConfigManager.getCharacterConfig(),
          ConfigManager.getCharacterStyles(),
          ConfigManager.getSpecies(),
          ConfigManager.getRoles()
        ]);
        
        // 从角色配置中提取各种数据
        const personalityTags = characterConfig.personality_tags.categories.reduce(
          (acc: PersonalityTag[], category) => [...acc, ...category.tags], 
          []
        );
        const bodyTypes = characterConfig.appearance_options.body_types;
        const hairStyles = characterConfig.appearance_options.hair_styles;
        const eyeColors = characterConfig.appearance_options.eye_colors;
        const accessoryOptions = characterConfig.accessories.categories.reduce(
          (acc: AccessoryItem[], category) => [...acc, ...category.items], 
          []
        );
        const outfitStyles = characterConfig.outfit_styles.categories.reduce(
          (acc: OutfitStyle[], category) => [...acc, ...category.styles], 
          []
        );

        if (mounted) {
          setState({
            data: {
              characterConfig,
              personalityTags,
              bodyTypes,
              hairStyles,
              eyeColors,
              accessoryOptions,
              outfitStyles,
              characterStyles,
              species,
              roles
            },
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load character config'
          }));
        }
      }
    };

    loadCharacterConfig();
    
    return () => {
      mounted = false;
    };
  }, []);

  return {
    ...state.data,
    isLoading: state.loading,
    loading: state.loading,
    error: state.error
  };
}

/**
 * Hook to get public characters from database (async)
 */
export function usePublicCharactersFromDB(options?: {
  uuids?: string[];
  limit?: number;
  enabled?: boolean;
}) {
  const [state, setState] = useState<UseConfigState<any[]>>({
    data: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    const enabled = options?.enabled ?? true;
    const uuids = options?.uuids ?? [];
    const limit = options?.limit ?? 100;
    const uuidsParam = uuids.map((uuid) => uuid.trim()).filter(Boolean);

    if (!enabled) {
      setState(prev => ({ ...prev, loading: true, error: null }));
      return () => {
        mounted = false;
      };
    }

    if (options?.uuids && uuidsParam.length === 0) {
      setState({
        data: [],
        loading: false,
        error: null
      });
      return () => {
        mounted = false;
      };
    }

    const loadCharacters = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const params = new URLSearchParams();
        if (uuidsParam.length) {
          params.set("uuids", uuidsParam.join(","));
        } else {
          params.set("limit", String(limit));
        }

        const response = await fetch(
          `/api/oc-maker/public/characters?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }

        const data = await response.json();

        if (mounted) {
          // API 返回结构: { code, message, data: { characters: [...] } }
          // 后端已经解析了图像 URL，所以直接使用
          const characters = (data?.data?.characters || []).map((char: any) => ({
            uuid: char.uuid,
            name: char.name,
            role: char.role || undefined,
            brief_description: char.brief_introduction,
            description: char.brief_introduction, // Legacy field
            profile_url: char.profile_image_url || "",
            avatar_url: char.avatar_url || "",
            thumbnail_path: char.profile_image_url || "",
            modules: char.modules,
            character_data: {
              species: char.species || "human",
              gender: char.gender || "other",
              age: char.age || 0,
              personality_tags: Array.isArray(char.personality_tags)
                ? char.personality_tags
                : [],
              art_style: char.art_style || "anime",
              body_type: char.body_type || "average",
              hair_color: char.hair_color || "#000000",
              hair_style: char.hair_style || "short",
              eye_color: char.eye_color || "#000000",
              outfit_style: char.outfit_style || "",
              accessories: Array.isArray(char.accessories) ? char.accessories : [],
              appearance_features: char.appearance_features || "",
              role: char.role || undefined,
              brief_introduction: char.brief_introduction || "",
              background_story: char.background_story || "",
              extended_attributes: Array.isArray(char.extended_attributes)
                ? char.extended_attributes
                : [],
            },
            sort_order: 0,
          }));

          setState({
            data: characters,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load characters'
          }));
        }
      }
    };

    loadCharacters();

    return () => {
      mounted = false;
    };
  }, [
    options?.enabled,
    options?.limit,
    options?.uuids ? options.uuids.join(",") : ""
  ]);

  return {
    characters: state.data,
    isLoading: state.loading,
    loading: state.loading,
    error: state.error
  };
}

/**
 * Unified hook to get all configurations at once (optimized async version)
 */
export function useAllConfigs() {
  const [state, setState] = useState<UseAllConfigsState>({
    models: [],
    defaultModel: undefined,
    styles: [],
    scenes: [],
    outfits: [],
    actions: [],
    ratios: [],
    defaultRatio: undefined,
    gallery: [],
    ocGallery: [],
    characterConfig: {} as CharacterConfig,
    personalityTags: [],
    bodyTypes: [],
    hairStyles: [],
    eyeColors: [],
    accessoryOptions: [],
    outfitStyles: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadAllConfigs = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // 并行加载所有配置以提高性能
        const [
          models,
          defaultModel,
          animeConfig,
          characterConfig,
          gallery,
          ocGallery
        ] = await Promise.all([
          ConfigManager.getActiveModels(),
          ConfigManager.getDefaultModel(),
          ConfigManager.getAnimeConfig(),
          ConfigManager.getCharacterConfig(),
          ConfigManager.getAnimeGallery(),
          ConfigManager.getOCGallery()
        ]);

        // 处理角色配置数据
        const personalityTags = characterConfig.personality_tags.categories.reduce(
          (acc: PersonalityTag[], category) => [...acc, ...category.tags], 
          []
        );
        const bodyTypes = characterConfig.appearance_options.body_types;
        const hairStyles = characterConfig.appearance_options.hair_styles;
        const eyeColors = characterConfig.appearance_options.eye_colors;
        const accessoryOptions = characterConfig.accessories.categories.reduce(
          (acc: AccessoryItem[], category) => [...acc, ...category.items], 
          []
        );
        const outfitStyles = characterConfig.outfit_styles.categories.reduce(
          (acc: OutfitStyle[], category) => [...acc, ...category.styles], 
          []
        );

        if (mounted) {
          setState({
            models,
            defaultModel,
            styles: animeConfig.styles.sort((a, b) => a.sort_order - b.sort_order),
            scenes: animeConfig.scenes.sort((a, b) => a.sort_order - b.sort_order),
            outfits: animeConfig.outfits.sort((a, b) => a.sort_order - b.sort_order),
            actions: animeConfig.actions.sort((a, b) => a.sort_order - b.sort_order),
            ratios: [], // 仍然返回空数组
            defaultRatio: undefined,
            gallery: gallery.sort((a, b) => a.sort_order - b.sort_order),
            ocGallery: [...ocGallery].sort((a, b) => a.sort_order - b.sort_order),
            characterConfig,
            personalityTags,
            bodyTypes,
            hairStyles,
            eyeColors,
            accessoryOptions,
            outfitStyles,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load configurations'
          }));
        }
      }
    };

    loadAllConfigs();
    
    return () => {
      mounted = false;
    };
  }, []);

  return {
    ...state,
    isLoading: state.loading, // 保持向后兼容的字段名
    characters: [] // 保持向后兼容，但返回空数组
  };
}
