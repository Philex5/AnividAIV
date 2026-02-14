"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  getCreamyCharacterUrl,
  getMemberBadgeUrl,
  getModelIconUrl,
  getRatioIconUrl,
} from "@/lib/asset-loader";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useGenerationPolling,
  type GenerationResult,
} from "@/hooks/useGenerationPolling";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2Icon,
  AlertCircleIcon,
  ChevronDownIcon,
  RefreshCwIcon,
} from "lucide-react";
import {
  validateGenerationType,
  IMAGE_GEN_TYPES,
  getGeneratorName,
} from "@/lib/generation-type-validator";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAllConfigs } from "@/lib/hooks/useConfigs";
import { useAppContext } from "@/contexts/app";
import { getPromptMaxLength, getPromptMinLength, type AnimeGalleryImage } from "@/lib/configs";
import { useTranslations } from "next-intl";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import { toast } from "sonner";

// 缓存相关常量
const CACHE_KEY_PREFIX = "anime_generator_";
const CACHE_KEYS = {
  PROMPT: `${CACHE_KEY_PREFIX}prompt`,
  PARAMETERS: `${CACHE_KEY_PREFIX}parameters`,
  REFERENCE_IMAGES: `${CACHE_KEY_PREFIX}reference_images`,
  PENDING_OPERATION: `${CACHE_KEY_PREFIX}pending_operation`,
} as const;

// 缓存工具函数
const saveToCache = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save to cache:", error);
  }
};

const getFromCache = (key: string, defaultValue: any): any => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;

    const parsed = JSON.parse(cached);
    // 额外的空值检查，确保不返回 null 或 undefined
    if (parsed === null || parsed === undefined) {
      return defaultValue;
    }

    return parsed;
  } catch (error) {
    console.warn("Failed to get from cache:", error);
    return defaultValue;
  }
};

const clearCache = () => {
  try {
    Object.values(CACHE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
};

const getApiPayload = <T,>(result: unknown): T | null => {
  if (!result || typeof result !== "object") {
    return null;
  }

  const maybeResult = result as {
    code?: number;
    success?: boolean;
    data?: T;
  };

  if (typeof maybeResult.code === "number") {
    return maybeResult.code === 0 && maybeResult.data
      ? maybeResult.data
      : null;
  }

  if (typeof maybeResult.success === "boolean") {
    return maybeResult.success && maybeResult.data ? maybeResult.data : null;
  }

  return maybeResult.data ?? null;
};

// 401错误检测函数
const isAuthError = (error: any): boolean => {
  if (typeof error === "object" && error !== null) {
    // 检查HTTP状态码
    if (error.status === 401) return true;
    // 检查错误消息
    if (
      typeof error.message === "string" &&
      (error.message.includes("User not authenticated") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("401"))
    ) {
      return true;
    }
  }
  // 检查字符串错误消息
  if (
    typeof error === "string" &&
    (error.includes("User not authenticated") ||
      error.includes("Unauthorized") ||
      error.includes("401"))
  ) {
    return true;
  }
  return false;
};

// 导入新的子组件
import { PromptInputSection } from "./PromptInputSection";
import { StyleSelectorCompact } from "./StyleSelectorCompact";
import { CharacterSelector } from "./CharacterSelector";
import { ModelSelectorWithIcon } from "./ModelSelectorWithIcon";
import { ReferenceImageUpload } from "./ReferenceImageUpload";
import { CollapsibleQuickPrompt } from "./CollapsibleQuickPrompt";
import { ResultsDisplayPanel } from "./ResultsDisplayPanel";
import { WaterfallGallery } from "./WaterfallGallery";
import { ImagePreviewDialog } from "./ImagePreviewDialog";

// 直接从模型的supported_ratios创建比例选项
const getAvailableRatios = (supportedRatios: string[]) => {
  if (!supportedRatios || supportedRatios.length === 0) {
    // 默认比例选项
    return [
      { value: "1:1", label: "1:1" },
      { value: "2:3", label: "2:3" },
      { value: "3:2", label: "3:2" },
      { value: "16:9", label: "16:9" },
    ];
  }

  // 直接将supported_ratios转换为选项
  return supportedRatios.map((ratio) => ({
    value: ratio,
    label: ratio,
  }));
};

// 类型定义
interface GenerationTask {
  generation_uuid: string;
  task_uuid: string;
  status: string;
  created_at: string;
  batch_size: number;
  credits_used: number;
  message?: string;
  error_message?: string;
}

// 使用从 hook 导入的 GenerationResult 类型
type GenerationImage = GenerationResult;

interface ExampleImageBase {
  uuid: string;
  r2_path: string;
  alt: string;
  aspect_ratio: string;
  title?: string;
  parameters?: {
    model_id?: string;
    prompt?: string;
    style?: string;
    scene?: string;
    outfit?: string;
    character?: string;
    action?: string;
    aspect_ratio?: string;
  };
  sort_order?: number;
}

interface ExampleImage extends ExampleImageBase {
  width: number;
  height: number;
}

interface AnimeGeneratorProps {
  className?: string;
  pageData: AnimeGeneratorPage;
  genImageId?: string; // 新增：用于复用的图片ID
  refImageUrl?: string; // 新增：直接传入的参考图片URL
  characterUuid?: string; // 新增：角色UUID，用于预选角色
  isLoggedIn?: boolean; // 新增：从页面传递的登录状态
  initialCanUsePrivate?: boolean;
  initialPrompt?: string;
  initialPreset?: string;
  initialModelId?: string; // 新增：预选模型ID
  examples?: AnimeGalleryImage[]; // 新增：模型专用示例配置（可选）
}

// AspectRatioSelector内联组件
interface RatioOption {
  value: string;
  label: string;
}

interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
  availableRatios: RatioOption[];
  disabled?: boolean;
  label: string;
}

const AspectRatioSelector = ({
  value,
  onChange,
  availableRatios,
  disabled,
  label,
}: AspectRatioSelectorProps) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-medium text-foreground flex-shrink-0">
        {label}:
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[120px] h-9 text-sm">
          <SelectValue placeholder="Select">
            {value && (
              <div className="flex items-center gap-2">
                <img
                  src={getRatioIconUrl(value)}
                  alt={value}
                  className="w-3 h-3"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="text-xs">{value}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableRatios.map((ratio) => {
            const iconPath = getRatioIconUrl(ratio.value);
            return (
              <SelectItem key={ratio.value} value={ratio.value}>
                <div className="flex items-center gap-2">
                  <img
                    src={iconPath}
                    alt={ratio.value}
                    className="w-4 h-4"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="text-sm">{ratio.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export function AnimeGenerator({
  className = "",
  pageData,
  genImageId,
  refImageUrl,
  characterUuid,
  isLoggedIn = false,
  initialCanUsePrivate = false,
  initialPrompt,
  initialPreset,
  initialModelId, // 新增：预选模型ID
  examples, // 新增：模型专用示例配置（可选）
}: AnimeGeneratorProps) {
  // 使用配置系统
  const configsData = useAllConfigs();
  const {
    defaultModel,
    gallery,
    loading: configsLoading,
    error: configsError,
  } = configsData;

  // 使用传入的 examples 或默认的 gallery
  const activeGallery = examples || gallery;

  // 使用Context中的积分管理
  const {
    credits,
    refreshCredits,
    setShowSignModal,
    setSignModalMessage,
    user,
    isLoadingUser,
  } = useAppContext();

  const router = useRouter();
  const searchParams = useSearchParams();

  // 使用useRef跟踪已处理的参数，防止重复加载
  const processedParamsRef = useRef<{
    genImageId?: string;
    refImageUrl?: string;
    characterUuid?: string;
    initialPrompt?: string;
    initialPreset?: string;
  }>({});
  const hasInitializedVisibilityRef = useRef(false);

  // 检查用户是否可以使用私密可见性
  const canUsePrivate = useMemo(() => {
    if (user) {
      if (!user.is_sub) return false;
      if (!user.sub_expired_at) return false;
      return new Date(user.sub_expired_at) > new Date();
    }

    if (isLoggedIn) {
      return initialCanUsePrivate;
    }

    return false;
  }, [user, isLoggedIn, initialCanUsePrivate]);

  // 使用翻译系统
  const t = useTranslations("anime_styles");
  const tParams = useTranslations("parameters");

  // 状态管理 - 使用默认值初始化，避免hydration问题
  const [prompt, setPrompt] = useState("");
  const [parameters, setParameters] = useState({
    style: "",
    scene: "",
    outfit: "",
    characters: [] as string[], // 改为数组支持多个角色
    action: "",
    aspect_ratio: "1:1", // 默认值，会根据模型动态调整
    batch_size: 1,
    model_uuid: "", // 会在配置加载后设置
    visibility_level: "private", // 默认为private
    image_resolution: "2K", // 🔥 新增：图片分辨率默认值（用于Seedream等模型）
  });

  // 当配置加载完成时,设置默认模型和aspect_ratio
  useEffect(() => {
    if (!configsLoading && !parameters.model_uuid) {
      // 优先使用 initialModelId，否则使用默认模型
      const targetModelId = initialModelId || defaultModel?.model_id;
      const targetModel = configsData.models.find(m => m.model_id === targetModelId);

      if (targetModel && targetModelId) {
        // 获取第一个支持的比例作为默认值
        const firstRatio = targetModel.supported_ratios?.[0] || "1:1";

        // 获取默认分辨率（从模型配置中读取）
        const defaultResolution =
          (targetModel.config as any)?.default_resolution || "2K";

        // 当有预设模型时，风格默认为 "no_presets"
        const defaultStyle = initialModelId ? "no_presets" : "";

        setParameters((prev) => ({
          ...prev,
          model_uuid: targetModelId,
          aspect_ratio: firstRatio,
          image_resolution: defaultResolution,
          style: defaultStyle,
        }));
      }
    }
  }, [configsLoading, defaultModel, parameters.model_uuid, initialModelId, configsData.models]);

  // 根据用户订阅状态设置默认 visibility（仅初始化一次）
  useEffect(() => {
    if (isLoadingUser || hasInitializedVisibilityRef.current) {
      return;
    }

    hasInitializedVisibilityRef.current = true;

    setParameters((prev) => ({
      ...prev,
      visibility_level: canUsePrivate ? "private" : "public",
    }));
  }, [canUsePrivate, isLoadingUser]);

  // 非订阅用户强制 Public
  useEffect(() => {
    if (isLoadingUser || canUsePrivate) {
      return;
    }

    if (parameters.visibility_level !== "public") {
      setParameters((prev) => ({
        ...prev,
        visibility_level: "public",
      }));
    }
  }, [canUsePrivate, isLoadingUser, parameters.visibility_level]);

  const [currentTask, setCurrentTask] = useState<GenerationTask | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [completedResults, setCompletedResults] = useState<GenerationImage[]>(
    []
  );
  const generateClickLockRef = useRef(false);

  // 使用 useCallback 包装回调函数，避免在每次渲染时重新创建
  // 这样可以防止 useGenerationPolling 内部的 useEffect 频繁重新执行
  const handleCompletedCallback = useCallback(
    (results: GenerationImage[]) => {
      console.log(
        "[AnimeGenerator] Generation completed with results:",
        results.length
      );
      setCompletedResults(results);
      setIsGenerating(false);
      setCurrentTask(null);
      // 生成完成后强制刷新积分，因为积分已被消费
      refreshCredits(true);
    },
    [refreshCredits]
  );

  const handleFailedCallback = useCallback((errorMsg: string) => {
    console.log("[AnimeGenerator] Generation failed:", errorMsg);
    setError(errorMsg);
    setIsGenerating(false);
    setCurrentTask(null);
  }, []);

  const handleTimeoutCallback = useCallback(() => {
    console.log("[AnimeGenerator] Generation timeout");
    setError("Generation timeout after 5 minutes. Please try again.");
    setIsGenerating(false);
    setCurrentTask(null);
  }, []);

  const handleStatusUpdateCallback = useCallback((statusData: any) => {
    // 使用函数式更新，避免依赖 currentTask
    setCurrentTask((prev) => {
      if (prev) {
        return {
          ...prev,
          status: statusData.status,
          credits_used: statusData.credits_used,
          message: statusData.message,
          error_message: statusData.error_message,
        };
      }
      return prev;
    });
  }, []);

  // 使用通用轮询Hook
  const {
    isPolling,
    timeElapsed,
    error: pollingError,
  } = useGenerationPolling({
    generationId: currentTask?.generation_uuid || null,
    generationType: "anime",
    onCompleted: handleCompletedCallback,
    onFailed: handleFailedCallback,
    onTimeout: handleTimeoutCallback,
    onStatusUpdate: handleStatusUpdateCallback,
  });

  // 待执行操作缓存状态
  const [pendingOperation, setPendingOperation] = useState<string | null>(null);

  // 合并轮询错误和组件错误
  const finalError = pollingError || error;

  // Hydration保护状态
  const [isMounted, setIsMounted] = useState(false);

  // 模态框状态
  const [previewImageUuid, setPreviewImageUuid] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 复用相关状态
  const [isLoadingReuseData, setIsLoadingReuseData] = useState(false);
  const [reuseError, setReuseError] = useState<string | null>(null);

  // 获取当前模型和可用比例
  const currentModel = configsData.models.find(
    (m) => m.model_id === parameters.model_uuid
  );
  const availableRatios = getAvailableRatios(
    currentModel?.supported_ratios || []
  );

  const modelResolutions =
    ((currentModel?.config as any)?.image_resolution as string[] | undefined) ||
    [];

  const creditsPerImage = useMemo(() => {
    if (!currentModel) return 0;

    const fallbackCredits = currentModel.credits_per_generation || 0;
    const resolutionCredits = (currentModel.config as any)?.resolution_credits as
      | Record<string, number>
      | undefined;

    if (!resolutionCredits || typeof resolutionCredits !== "object") {
      return fallbackCredits;
    }

    const normalizedResolution =
      typeof parameters.image_resolution === "string"
        ? parameters.image_resolution.trim().toUpperCase()
        : "";

    const matchedCredits = Object.entries(resolutionCredits).find(
      ([resolution]) => resolution.trim().toUpperCase() === normalizedResolution
    )?.[1];

    if (
      typeof matchedCredits === "number" &&
      Number.isFinite(matchedCredits) &&
      matchedCredits > 0
    ) {
      return matchedCredits;
    }

    return fallbackCredits;
  }, [currentModel, parameters.image_resolution]);

  const totalCredits = creditsPerImage * parameters.batch_size;

  // Prompt length limits from model configuration
  const promptMaxLength = useMemo(() => {
    return getPromptMaxLength(currentModel);
  }, [currentModel]);

  const promptMinLength = useMemo(() => {
    return getPromptMinLength(currentModel);
  }, [currentModel]);

  const formatPromptMessage = (
    template: string | undefined,
    values: Record<string, number>
  ) => {
    if (!template) return "";
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        return String(values[key]);
      }
      return match;
    });
  };

  // 检查当前模型是否支持参考图片
  const supportsReferenceImage = useMemo(() => {
    if (!currentModel) return false;
    // 如果配置中明确设置 supports_reference_image，使用该值
    if ((currentModel.config as any)?.supports_reference_image !== undefined) {
      return (currentModel.config as any)?.supports_reference_image;
    }
    // 如果没有配置，默认根据 model_type 判断
    // img2img 模型默认支持，text2img 模型需要进一步检查
    if (currentModel.model_type === "img2img") {
      return true;
    }
    // 某些 text2img 模型可能也支持参考图，通过 auto_switch_mode 判断
    if ((currentModel.config as any)?.auto_switch_mode) {
      return true;
    }
    return false;
  }, [currentModel]);

  // 检查当前模型是否支持角色选择
  const supportsCharacter = useMemo(() => {
    if (!currentModel) return false;
    // 优先使用配置中的 supports_character
    if ((currentModel.config as any)?.supports_character !== undefined) {
      return (currentModel.config as any)?.supports_character;
    }
    // text2img 模型默认不支持 character
    if (currentModel.model_type === "text2img") {
      return false;
    }
    // img2img 模型默认支持
    return true;
  }, [currentModel]);

  // 初始化挂载状态和缓存恢复
  useEffect(() => {
    setIsMounted(true);

    // 只有在客户端且未登录时才从缓存恢复
    if (typeof window !== "undefined" && !isLoggedIn) {
      const cachedPrompt = getFromCache(CACHE_KEYS.PROMPT, "");
      const cachedParameters = getFromCache(CACHE_KEYS.PARAMETERS, null);
      const cachedReferenceImages = getFromCache(
        CACHE_KEYS.REFERENCE_IMAGES,
        []
      );
      const cachedPendingOperation = getFromCache(
        CACHE_KEYS.PENDING_OPERATION,
        null
      );

      if (cachedPrompt) {
        setPrompt(cachedPrompt);
      }

      if (cachedParameters) {
        setParameters((prev) => ({
          ...prev,
          ...cachedParameters,
          // 确保 model_uuid 有默认值
          model_uuid:
            cachedParameters.model_uuid || defaultModel?.model_id || "",
        }));
      }

      if (cachedReferenceImages && cachedReferenceImages.length > 0) {
        setReferenceImages(cachedReferenceImages);
      }

      if (cachedPendingOperation) {
        setPendingOperation(cachedPendingOperation);
      }
    }
  }, [isLoggedIn, defaultModel?.model_id]);

  // 缓存同步 - 保存用户输入到缓存
  useEffect(() => {
    // 只有在客户端挂载后才进行缓存操作
    if (!isMounted) return;

    if (isLoggedIn) {
      // 用户已登录，清理缓存
      clearCache();
    } else {
      // 未登录用户，保存到缓存
      saveToCache(CACHE_KEYS.PROMPT, prompt);
    }
  }, [prompt, isLoggedIn, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    if (isLoggedIn) {
      clearCache();
    } else {
      saveToCache(CACHE_KEYS.PARAMETERS, parameters);
    }
  }, [parameters, isLoggedIn, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    if (isLoggedIn) {
      clearCache();
    } else {
      saveToCache(CACHE_KEYS.REFERENCE_IMAGES, referenceImages);
    }
  }, [referenceImages, isLoggedIn, isMounted]);

  // 当模型切换时，确保aspect_ratio同步到新模型的第一个支持比例
  useEffect(() => {
    if (currentModel && availableRatios.length > 0) {
      const currentRatioExists = availableRatios.some(
        (ratio) => ratio.value === parameters.aspect_ratio
      );

      // 🔥 新增：获取模型的image_resolution配置
      const modelResolutions =
        (currentModel.config as any)?.image_resolution || [];
      const defaultResolution =
        (currentModel.config as any)?.default_resolution || "2K";
      const currentResolutionExists = modelResolutions.includes(
        parameters.image_resolution
      );

      // 只有当切换模型时才更新参数
      const updates: any = {};

      if (!currentRatioExists) {
        // 如果当前比例不在新模型的可用选项中，选择第一个可用的
        const firstRatio = availableRatios[0];
        updates.aspect_ratio = firstRatio.value;
      }

      // 如果新模型支持image_resolution，但当前值为空或无效，则设置默认值
      if (modelResolutions.length > 0) {
        if (
          !parameters.image_resolution ||
          parameters.image_resolution.trim() === ""
        ) {
          // 当前值为空，设置默认值
          updates.image_resolution = defaultResolution;
        } else if (!currentResolutionExists) {
          // 当前值不在新模型的支持列表中，设置默认值
          updates.image_resolution = defaultResolution;
        }
      }

      if (Object.keys(updates).length > 0) {
        setParameters((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [
    currentModel,
    availableRatios,
    parameters.aspect_ratio,
    parameters.image_resolution,
  ]);

  // 当模型切换时，如果新模型不支持参考图片，清空参考图片列表
  useEffect(() => {
    if (!supportsReferenceImage && referenceImages.length > 0) {
      setReferenceImages([]);
    }
  }, [supportsReferenceImage, referenceImages.length]);

  // 当模型切换时，如果新模型不支持 character，清空已选角色
  useEffect(() => {
    if (!supportsCharacter && parameters.characters.length > 0) {
      setParameters((prev) => ({
        ...prev,
        characters: [],
      }));
    }
  }, [supportsCharacter, parameters.characters.length]);

  // 🔥 新增：当选择角色时，自动切换style为"No Presets"
  useEffect(() => {
    const hasCharactersSelected =
      parameters.characters && parameters.characters.length > 0;

    if (hasCharactersSelected) {
      // 用户选择了OC，自动切换到"No Presets"
      setParameters((prev) => {
        // 如果当前style不是"No Presets"，则切换
        if (prev.style !== "no_presets") {
          return { ...prev, style: "no_presets" };
        }
        return prev;
      });
    } else {
      // 用户没有选择OC，检查当前style是否为"No Presets"
      // 如果是"No Presets"，建议但不强制切换到默认风格（可选实现）
      // 这里保持"No Presets"的选择，让用户自主决定
      if (parameters.style === "no_presets") {
        // 可以选择是否自动切换回默认风格，这里保持用户选择
        // setParameters((prev) => {
        //   // 如果之前有默认风格，可以恢复
        //   // 这里选择不自动恢复，保持用户选择
        //   return prev;
        // });
      }
    }
  }, [parameters.characters]);

  // 401错误处理函数
  const handleAuthError = useCallback(
    (error: any, operation?: string) => {
      console.log("Auth error detected:", error);

      // 保存当前操作上下文
      if (operation) {
        setPendingOperation(operation);
        saveToCache(CACHE_KEYS.PENDING_OPERATION, operation);
      }

      // 设置登录弹窗消息
      setSignModalMessage(
        pageData.auth_required?.reuse_params ||
          "Please log in to continue with your anime generation. Your current settings will be preserved."
      );

      // 弹出登录弹窗
      setShowSignModal(true);

      // 清除当前错误状态
      setError(null);
    },
    [
      setShowSignModal,
      setSignModalMessage,
      pageData.auth_required?.reuse_params,
    ]
  );

  // 登录后恢复操作
  useEffect(() => {
    if (isLoggedIn && pendingOperation) {
      console.log("User logged in, resuming operation:", pendingOperation);

      // 恢复缓存的数据
      const cachedPrompt = getFromCache(CACHE_KEYS.PROMPT, "");
      const cachedParameters = getFromCache(CACHE_KEYS.PARAMETERS, parameters);
      const cachedReferenceImages = getFromCache(
        CACHE_KEYS.REFERENCE_IMAGES,
        []
      );

      if (cachedPrompt && typeof cachedPrompt === "string")
        setPrompt(cachedPrompt);
      if (cachedParameters && typeof cachedParameters === "object")
        setParameters(cachedParameters);
      if (
        cachedReferenceImages &&
        Array.isArray(cachedReferenceImages) &&
        cachedReferenceImages.length > 0
      )
        setReferenceImages(cachedReferenceImages);

      // 根据操作类型继续执行
      if (pendingOperation === "generate") {
        // 延迟执行生成操作，确保状态已更新
        setTimeout(() => {
          handleGenerate();
        }, 100);
      }
      // 注意：reuse 操作由 genImageId useEffect 自动处理，登录后会重新触发

      // 清理待执行操作和消息
      setPendingOperation(null);
      setSignModalMessage("");
      localStorage.removeItem(CACHE_KEYS.PENDING_OPERATION);
    }
  }, [isLoggedIn, pendingOperation, setSignModalMessage]);

  // 加载复用数据
  const loadReuseData = useCallback(
    async (imageId: string) => {
      if (!imageId) return;

      setIsLoadingReuseData(true);
      setReuseError(null);

      try {
        const response = await fetch(`/api/generation/image/${imageId}`);

        if (!response.ok) {
          if (response.status === 401) {
            // 未登录，触发登录流程
            handleAuthError(response, "reuse");
            return;
          }
          if (response.status === 403) {
            // 已登录但无权访问（他人的私有图片）
            setError(
              pageData.errors?.["no-permission"] ||
                "You don't have permission to access this image"
            );
            setIsLoadingReuseData(false);
            return;
          }
          if (response.status === 404) {
            // 图片不存在
            setError(pageData.errors?.["image-not-found"] || "Image not found");
            setIsLoadingReuseData(false);
            return;
          }
          throw new Error(`Failed to load image data: ${response.status}`);
        }

        const result = await response.json();
        const imageData = getApiPayload<any>(result);

        if (!imageData) {
          throw new Error("Invalid response format");
        }
        const generation = imageData.generation;

        // 验证 gen_type 是否匹配
        if (
          !validateGenerationType(imageData.gen_type, IMAGE_GEN_TYPES.ANIME)
        ) {
          const actualGenType = imageData.gen_type || "unknown";
          const correctGeneratorName = getGeneratorName(actualGenType);

          toast.error(
            `This image was generated in ${correctGeneratorName}. Please use the correct generator to reuse its parameters.`
          );

          // 清空 URL 参数
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("gen_image_id");
          router.replace(currentUrl.pathname + currentUrl.search, {
            scroll: false,
          });

          setIsLoadingReuseData(false);
          return;
        }

        // 填充生成参数
        if (generation) {
          // 从图片详情的 generation_params 中解析参数
          let generationParams = {};
          try {
            if (typeof imageData.generation_params === "string") {
              generationParams = JSON.parse(imageData.generation_params);
            } else if (typeof imageData.generation_params === "object") {
              generationParams = imageData.generation_params;
            }
          } catch (error) {
            console.warn("Failed to parse generation_params:", error);
          }

          // 更新提示词
          if (imageData.original_prompt) {
            setPrompt(imageData.original_prompt);
          }

          // 更新参数（只使用schema中存在的字段）
          setParameters((prev) => ({
            ...prev,
            model_uuid:
              (generationParams as any).model_id ||
              generation.model_id ||
              prev.model_uuid,
            // 优先从generation_params中获取aspect_ratio，其次从width/height计算
            aspect_ratio:
              (generationParams as any).aspect_ratio ||
              (generation.width && generation.height
                ? `${generation.width}:${generation.height}`
                : prev.aspect_ratio),
            batch_size:
              (generationParams as any).counts ||
              generation.counts ||
              prev.batch_size,
            // 🔥 新增：从generation_params中获取image_resolution（如果存在）
            image_resolution:
              (generationParams as any).image_resolution ||
              prev.image_resolution,
            // 从 generation_images 表中获取风格参数
            style: imageData.style || "",
            // 注意：scene, outfit, character, action 字段在schema中不存在，已移除
          }));

          // 设置参考图片（如果有）
          if ((generationParams as any).reference_image_url) {
            setReferenceImages([(generationParams as any).reference_image_url]);
          }
        }

        // 在右侧显示复用的图片（使用schema中存在的字段）
        const imageResult: GenerationImage = {
          image_uuid: imageData.uuid,
          image_url: imageData.image_url, // 使用原图地址
          thumbnail_url:
            imageData.thumbnail_desktop || imageData.thumbnail_mobile, // 兼容性处理
          created_at: imageData.created_at || new Date().toISOString(),
          generation_uuid: generation.uuid, // 补全缺失字段
          image_index: 1, // 默认设为1，因为是单张复用
        };

        setCompletedResults([imageResult]);
      } catch (error: any) {
        console.error("Failed to load reuse data:", error);
        // 显示错误提示
        setError(
          pageData.errors?.["load-image-failed"] ||
            error.message ||
            "Failed to load image data"
        );
      } finally {
        setIsLoadingReuseData(false);
      }
    },
    [handleAuthError]
  );

  // 自动选中传入的角色
  const selectCharacter = useCallback(
    (uuid: string) => {
      if (!uuid) return;

      console.log("Auto-selecting character:", uuid);

      // 将角色UUID添加到parameters.characters数组中
      setParameters((prev) => {
        // 避免重复添加同一个UUID
        if (prev.characters.includes(uuid)) {
          return prev;
        }
        return {
          ...prev,
          characters: [...prev.characters, uuid],
        };
      });

      // 清理URL中的character_uuid参数
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has("character_uuid")) {
        currentUrl.searchParams.delete("character_uuid");
        router.replace(currentUrl.pathname + currentUrl.search, {
          scroll: false,
        });
      }
    },
    [router]
  );

  // 处理 genImageId 参数
  useEffect(() => {
    if (!isMounted || !genImageId) return;

    // 检查是否已处理过该参数
    if (processedParamsRef.current.genImageId === genImageId) {
      console.log("genImageId already processed, skipping:", genImageId);
      return;
    }

    console.log("Loading reuse data for genImageId:", genImageId);

    // 标记为已处理
    processedParamsRef.current.genImageId = genImageId;

    // 如果未登录，先触发登录流程
    if (!isLoggedIn) {
      setPendingOperation("reuse");
      saveToCache(CACHE_KEYS.PENDING_OPERATION, "reuse");
      setSignModalMessage(
        pageData.auth_required?.reuse_params ||
          "Please log in to reuse generation parameters. Your current settings will be preserved."
      );
      setShowSignModal(true);
      return; // 不立即加载数据，等登录后再加载
    }

    // 已登录，加载复用数据
    loadReuseData(genImageId);
  }, [
    genImageId,
    isMounted,
    isLoggedIn,
    loadReuseData,
    pageData.auth_required,
    setShowSignModal,
    setSignModalMessage,
  ]);

  // 处理 refImageUrl 参数
  useEffect(() => {
    if (!isMounted || !refImageUrl) return;

    const rawUrl = refImageUrl.trim();
    if (!rawUrl) return;

    let normalizedUrl: string | null = null;
    const candidates: string[] = [rawUrl];
    try {
      const decodedUrl = decodeURIComponent(rawUrl);
      if (decodedUrl && decodedUrl !== rawUrl) {
        candidates.push(decodedUrl);
      }
    } catch {
      // ignore decode errors and keep original value
    }

    for (const candidate of candidates) {
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          normalizedUrl = candidate;
          break;
        }
      } catch {
        // try next candidate
      }
    }

    if (!normalizedUrl) {
      console.warn("Invalid reference image URL:", refImageUrl);
      return;
    }

    const supportsReference = (model: any): boolean => {
      if (model?.config?.supports_reference_image !== undefined) {
        return Boolean(model.config.supports_reference_image);
      }
      if (model?.model_type === "img2img") {
        return true;
      }
      return Boolean(model?.config?.auto_switch_mode);
    };

    // 当前模型不支持参考图时，先切到支持参考图的模型，再在下一轮 effect 注入参考图
    if (!supportsReferenceImage) {
      const fallbackModel = configsData.models.find((model) =>
        supportsReference(model)
      );

      if (fallbackModel?.model_id && fallbackModel.model_id !== parameters.model_uuid) {
        setParameters((prev) => ({
          ...prev,
          model_uuid: fallbackModel.model_id,
        }));
        return;
      }

      console.warn(
        "No reference-capable model found, skip refImageUrl:",
        normalizedUrl
      );
      return;
    }

    // 检查是否已处理过该参数
    if (processedParamsRef.current.refImageUrl === normalizedUrl) {
      console.log("refImageUrl already processed, skipping:", normalizedUrl);
      return;
    }

    console.log("Adding reference image from URL:", normalizedUrl);

    // 标记为已处理
    processedParamsRef.current.refImageUrl = normalizedUrl;

    // 先添加到参考图片列表（无论是否登录）
    setReferenceImages((prev) => {
      // 避免重复添加
      if (prev.includes(normalizedUrl)) {
        return prev;
      }
      const newImages = [...prev, normalizedUrl];
      // 如果未登录，缓存到localStorage
      if (!isLoggedIn) {
        saveToCache(CACHE_KEYS.REFERENCE_IMAGES, newImages);
      }
      return newImages;
    });

    // 如果未登录，触发登录流程
    if (!isLoggedIn) {
      setPendingOperation("reuse");
      saveToCache(CACHE_KEYS.PENDING_OPERATION, "reuse");
      setSignModalMessage(
        pageData.auth_required?.ref_image ||
          "Please log in to use reference images for generation."
      );
      setShowSignModal(true);
    }
  }, [
    refImageUrl,
    isMounted,
    isLoggedIn,
    configsData.models,
    parameters.model_uuid,
    supportsReferenceImage,
    pageData.auth_required,
    setShowSignModal,
    setSignModalMessage,
  ]);

  // 处理 characterUuid 参数
  useEffect(() => {
    if (!isMounted || !characterUuid) return;

    // 如果未登录，先触发登录流程
    if (!isLoggedIn) {
      setPendingOperation("character");
      saveToCache(CACHE_KEYS.PENDING_OPERATION, "character");
      setSignModalMessage(
        pageData.auth_required?.character ||
          "Please log in to use character data for generation. Your current settings will be preserved."
      );
      setShowSignModal(true);
      return; // 不立即加载数据，等登录后再加载
    }

    // 检查是否已处理过该参数
    if (processedParamsRef.current.characterUuid === characterUuid) {
      console.log("characterUuid already processed, skipping:", characterUuid);
      return;
    }

    console.log("Loading character data for characterUuid:", characterUuid);

    // 已登录，自动选中角色
    selectCharacter(characterUuid);

    // 标记为已处理（仅在实际执行选中后标记）
    processedParamsRef.current.characterUuid = characterUuid;
  }, [
    characterUuid,
    isMounted,
    isLoggedIn,
    selectCharacter,
    pageData.auth_required,
    setShowSignModal,
    setSignModalMessage,
  ]);

  useEffect(() => {
    if (!isMounted) return;
    if (!initialPrompt || !initialPrompt.trim()) return;

    if (processedParamsRef.current.initialPrompt === initialPrompt) {
      return;
    }

    processedParamsRef.current.initialPrompt = initialPrompt;
    const sanitizedPrompt = initialPrompt.trim();
    setPrompt(sanitizedPrompt);

    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has("prompt")) {
        currentUrl.searchParams.delete("prompt");
        router.replace(currentUrl.pathname + currentUrl.search, {
          scroll: false,
        });
      }
    }
  }, [initialPrompt, isMounted, router]);

  useEffect(() => {
    if (!isMounted) return;
    if (!initialPreset) return;

    if (processedParamsRef.current.initialPreset === initialPreset) {
      return;
    }

    processedParamsRef.current.initialPreset = initialPreset;
    setParameters((prev) => ({
      ...prev,
      style: initialPreset === "none" ? "no_presets" : initialPreset,
    }));

    if (typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has("preset")) {
        currentUrl.searchParams.delete("preset");
        router.replace(currentUrl.pathname + currentUrl.search, {
          scroll: false,
        });
      }
    }
  }, [initialPreset, isMounted, router]);

  // 积分相关的数据现在通过Context管理，无需单独获取
  // 轮询逻辑已移至 useGenerationPolling Hook

  // AI优化提示词
  const optimizePrompt = useCallback(
    async (inputPrompt: string): Promise<string> => {
      try {
        const response = await fetch("/api/anime-generation/optimize-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: inputPrompt }),
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.data && result.data.optimized_prompt) {
            const optimizedPrompt = result.data.optimized_prompt;
            return optimizedPrompt;
          } else {
            throw new Error("Invalid API response format");
          }
        } else {
          const errorData = await response.json();
          console.error("❌ API请求失败:", response.status, errorData);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
      } catch (error) {
        console.error("❌ 优化prompt失败:", error);
        throw error; // 重新抛出错误，让UI组件处理
      }
    },
    []
  );

  // 重置所有参数
  const handleReset = useCallback(() => {
    // 重置提示词
    setPrompt("");

    // 获取默认分辨率
    const defaultResolution =
      (defaultModel?.config as any)?.default_resolution || "2K";

    // 重置参数到默认值
    setParameters({
      style: "",
      scene: "",
      outfit: "",
      characters: [],
      action: "",
      aspect_ratio: "1:1",
      batch_size: 1,
      model_uuid: defaultModel?.model_id || "",
      visibility_level: canUsePrivate ? "private" : "public",
      image_resolution: defaultResolution, // 🔥 新增：重置分辨率
    });

    // 清空参考图片
    setReferenceImages([]);

    // 清除结果和错误
    setCompletedResults([]);
    setError(null);
    setCurrentTask(null);

    // 如果有正在进行的生成，停止它
    if (isGenerating) {
      setIsGenerating(false);
    }
  }, [canUsePrivate, defaultModel?.model_id, isGenerating]);

  // 开始生成
  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt?.trim() || "";
    if (!trimmedPrompt) return;
    if (promptMaxLength && trimmedPrompt.length > promptMaxLength) {
      setError(
        formatPromptMessage(pageData?.prompt?.counter_too_long, {
          current: trimmedPrompt.length,
          max: promptMaxLength,
          min: promptMinLength,
        })
      );
      return;
    }
    if (promptMinLength && trimmedPrompt.length < promptMinLength) {
      setError(
        formatPromptMessage(pageData?.prompt?.counter_too_short, {
          current: trimmedPrompt.length,
          max: promptMaxLength,
          min: promptMinLength,
        })
      );
      return;
    }
    if (isGenerating || generateClickLockRef.current) return;

    console.log(
      "[AnimeGenerator] Starting new generation, clearing previous state"
    );

    // 设置锁定标志，防止重复点击
    generateClickLockRef.current = true;

    // 检查并重置URL中的search params（如果存在）
    const currentUrl = new URL(window.location.href);
    const paramsToReset = [
      "gen_image_id",
      "ref_image_url",
      "character_uuid",
      "prompt",
      "preset",
    ];
    let hasParamsToReset = false;
    paramsToReset.forEach((param) => {
      if (currentUrl.searchParams.has(param)) {
        currentUrl.searchParams.delete(param);
        hasParamsToReset = true;
      }
    });
    if (hasParamsToReset) {
      console.log("Resetting URL search params after generate button click");
      router.replace(currentUrl.pathname + currentUrl.search, {
        scroll: false,
      });
    }

    // 立即清空之前的结果和状态，避免显示旧数据
    setCompletedResults([]);
    setIsGenerating(true);
    setError(null);
    setCurrentTask(null);

    try {
      const response = await fetch("/api/anime-generation/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gen_type: "anime",
          prompt: trimmedPrompt,
          style_preset: parameters.style,
          scene_preset: parameters.scene,
          outfit_preset: parameters.outfit,
          character_uuids:
            parameters.characters.length > 0
              ? parameters.characters
              : undefined,
          aspect_ratio: parameters.aspect_ratio,
          model_uuid: parameters.model_uuid,
          batch_size: parameters.batch_size,
          reference_image_urls:
            referenceImages.length > 0 ? referenceImages : undefined,
          visibility_level: parameters.visibility_level,
          // 🔥 新增：图片分辨率参数（用于Seedream等模型）
          image_resolution: parameters.image_resolution,
        }),
      });

      if (response.status === 401) {
        // 401 错误处理
        setIsGenerating(false);
        handleAuthError(response, "generate");
        return;
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log(
            "[AnimeGenerator] Task created successfully:",
            result.data.generation_uuid
          );
          setCurrentTask({
            generation_uuid: result.data.generation_uuid,
            task_uuid: result.data.generation_uuid, // 使用 generation_uuid 作为 task_uuid
            status: result.data.status || "pending",
            created_at: new Date().toISOString(),
            batch_size: parameters.batch_size,
            credits_used: result.data.credits_cost,
            message: result.data.message,
          });
        } else {
          // 检查是否是认证错误
          if (isAuthError(result.error)) {
            setIsGenerating(false);
            handleAuthError(result.error, "generate");
            return;
          }
          setError(result.error || "Generation failed");
          setIsGenerating(false);
        }
      } else {
        const errorData = await response.json();
        // 检查是否是认证错误
        if (isAuthError(errorData.error)) {
          setIsGenerating(false);
          handleAuthError(errorData.error, "generate");
          return;
        }
        setError(errorData.error || "Generation failed");
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      // 检查是否是认证错误
      if (isAuthError(error)) {
        setIsGenerating(false);
        handleAuthError(error, "generate");
        return;
      }
      setError("Network error occurred");
      setIsGenerating(false);
    }
  }, [
    prompt,
    parameters,
    isGenerating,
    handleAuthError,
    referenceImages,
    pageData,
    promptMaxLength,
    promptMinLength,
    formatPromptMessage,
  ]);

  useEffect(() => {
    if (!isGenerating) {
      generateClickLockRef.current = false;
    }
  }, [isGenerating]);

  // 参数更新处理
  const handleParameterChange = useCallback((type: string, value: string) => {
    setParameters((prev) => {
      // 🔥 新增：当选择角色时，自动切换style为"No Presets"
      if (type === "style") {
        // 如果新值是 "no_presets"，直接设置
        if (value === "no_presets") {
          return { ...prev, style: value };
        }
        // 如果新值是其他值，且当前有选择角色，保持角色选择但允许用户更改
        // 注意：不强制切换，保持用户选择的自主性
      }
      return { ...prev, [type]: value };
    });
  }, []);

  // prompt追加处理
  const handlePromptAppend = useCallback((value: string) => {
    setPrompt((prev) => {
      // 确保 prev 是有效的字符串
      const safePrev = prev || "";
      const trimmedPrev = safePrev.trim();
      const trimmedValue = (value || "").trim();

      if (!trimmedValue) return prev;
      if (!trimmedPrev) return trimmedValue;

      // 智能添加逗号分隔符
      const separator = trimmedPrev.endsWith(",") ? " " : ", ";
      return trimmedPrev + separator + trimmedValue;
    });
  }, []);

  // 示例点击处理
  const handleExampleClick = useCallback((example: ExampleImageBase) => {
    if (!example.parameters) return;

    // 直接使用 model_id
    const modelUuid = example.parameters.model_id || "";

    // 更新参数
    setParameters((prev) => ({
      ...prev,
      style: example.parameters?.style || "",
      scene: example.parameters?.scene || "",
      outfit: example.parameters?.outfit || "",
      characters: example.parameters?.character
        ? [example.parameters.character]
        : [],
      action: example.parameters?.action || "",
      aspect_ratio:
        example.parameters?.aspect_ratio ||
        example.aspect_ratio ||
        prev.aspect_ratio,
      model_uuid: modelUuid || prev.model_uuid,
      // 🔥 新增：保持当前的image_resolution（示例图片不包含此参数）
      image_resolution: prev.image_resolution,
    }));

    // 设置提示词 - 确保 prompt 是有效的字符串
    if (
      example.parameters?.prompt &&
      typeof example.parameters.prompt === "string" &&
      example.parameters.prompt.trim()
    ) {
      setPrompt(example.parameters.prompt);
    }
  }, []);

  // 获取示例图片数据 - 使用配置系统，并添加默认尺寸
  const exampleImages: ExampleImage[] = activeGallery.map((image) => {
    // 根据 aspect_ratio 计算默认尺寸
    let width = 512;
    let height = 512;

    if (image.aspect_ratio) {
      const [w, h] = image.aspect_ratio.split(":").map(Number);
      if (w && h) {
        const ratio = w / h;
        if (ratio > 1) {
          // 横向
          width = 512;
          height = Math.round(512 / ratio);
        } else {
          // 纵向
          height = 512;
          width = Math.round(512 * ratio);
        }
      }
    }

    return {
      uuid: image.uuid,
      r2_path: image.r2_path,
      alt: image.alt,
      aspect_ratio: image.aspect_ratio,
      width: width,
      height: height,
      title: image.title,
      parameters: image.parameters,
      sort_order: image.sort_order,
    } as ExampleImage;
  });

  const openPreviewDialog = useCallback(
    async (imageUuid: string | null) => {
      if (!imageUuid) {
        return;
      }

      // 查找结果对应的 generation_uuid
      const imageResult = completedResults.find(
        (r) => r.image_uuid === imageUuid
      );
      if (!imageResult) {
        return;
      }

      // 验证是否为 owner
      try {
        const response = await fetch(`/api/generation/image/${imageUuid}`);
        const data = await response.json();

        // 未登录直接拒绝
        if (!isLoggedIn || !user?.uuid) {
          return;
        }

        // 通过 generation 获取 user_uuid 对比
        if (data.data?.generation?.user_uuid !== user.uuid) {
          return; // 非 owner 直接返回，不打开弹窗
        }

        // owner 或无 user_uuid 信息则打开弹窗
        setPreviewImageUuid(imageUuid);
        setIsPreviewOpen(true);
      } catch (error) {
        console.error("Failed to verify ownership:", error);
      }
    },
    [completedResults, isLoggedIn, user?.uuid]
  );

  // 渲染右侧内容
  const renderRightContent = () => {
    // 复用数据加载中状态
    if (isLoadingReuseData) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">
              Loading reuse data...
            </p>
            <p className="text-sm text-muted-foreground">
              Preparing the selected artwork for reuse...
            </p>
          </div>
        </div>
      );
    }

    // 复用数据加载错误状态已移除，静默处理无效的gen_image_id

    // 生成中状态 - 显示简单的加载动画
    if (isGenerating) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">
              {pageData.generating || "Generating..."}
            </p>
            <p className="text-sm text-muted-foreground">
              {pageData.generating_description ||
                "Creating your anime artwork, please wait..."}
            </p>
          </div>
        </div>
      );
    }

    // 生成完成 - 显示结果图片
    if (completedResults.length > 0) {
      return (
        <div className="flex-1 flex items-center justify-center p-1 min-h-0 overflow-y-auto">
          {completedResults.length === 1 ? (
            // 单张图片响应式居中显示
            <div className="flex items-center justify-center w-full h-full min-h-0">
              <img
                src={completedResults[0].image_url}
                alt="Generated anime artwork"
                className="max-w-[80%] max-h-[80%] lg:max-w-[520px] lg:max-h-[520px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  openPreviewDialog(completedResults[0].image_uuid);
                }}
              />
            </div>
          ) : completedResults.length === 2 ? (
            // 2张图片响应式布局
            <div className="flex flex-col sm:flex-row gap-3 w-full h-full items-center justify-center">
              {completedResults.slice(0, 2).map((image, index) => (
                <div
                  key={image.image_uuid}
                  className="flex-1 flex items-center justify-center min-h-0"
                >
                  <img
                    src={image.image_url}
                    alt={`Generated anime artwork ${index + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      openPreviewDialog(image.image_uuid);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : completedResults.length === 3 ? (
            // 3张图片响应式布局
            <div className="flex flex-col lg:flex-row gap-3 w-full h-full">
              {/* 主图 */}
              <div className="flex-1 lg:flex-[2] flex items-center justify-center min-h-0">
                <img
                  src={completedResults[0].image_url}
                  alt="Generated anime artwork 1"
                  className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    openPreviewDialog(completedResults[0].image_uuid);
                  }}
                />
              </div>
              {/* 副图区域 */}
              <div className="flex-1 flex flex-row lg:flex-col gap-3">
                {completedResults.slice(1, 3).map((image, index) => (
                  <div
                    key={image.image_uuid}
                    className="flex-1 flex items-center justify-center min-h-0"
                  >
                    <img
                      src={image.image_url}
                      alt={`Generated anime artwork ${index + 2}`}
                      className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        openPreviewDialog(image.image_uuid);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 4张图片响应式网格显示
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full h-full place-items-center">
              {completedResults.slice(0, 4).map((image, index) => (
                <div
                  key={image.image_uuid}
                  className="flex items-center justify-center min-h-0"
                >
                  <img
                    src={image.image_url}
                    alt={`Generated anime artwork ${index + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      openPreviewDialog(image.image_uuid);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 空状态 - 登录与未登录都展示示例画廊，点击即可复用示例参数
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <WaterfallGallery
          examples={exampleImages}
          onExampleClick={handleExampleClick}
          pageData={pageData}
          className="flex-1 min-h-0"
        />
      </div>
    );
  };

  // 动态计算高度 - 如果在flex容器中使用h-full，否则使用固定视口高度
  // const isInFlexContainer = className?.includes('flex-1');
  // const heightClass = "h-full";

  // 处理配置加载状态
  if (configsLoading) {
    return (
      <div className={cn("generator-ambient h-full w-full", className)}>
        <div className="generator-ambient__content flex flex-col lg:flex-row h-full overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading configurations...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 处理配置加载错误
  if (configsError) {
    return (
      <div className={cn("generator-ambient h-full w-full", className)}>
        <div className="generator-ambient__content flex flex-col lg:flex-row h-full overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircleIcon className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Failed to load configurations
              </p>
              <p className="text-xs text-muted-foreground">{configsError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("generator-ambient h-full w-full", className)}>
        <div
          id="anime-generator"
          className="generator-ambient__content flex flex-col lg:flex-row h-full w-full max-w-[100vw] overflow-x-hidden prompt"
        >
        <h2 className="sr-only">
          {pageData?.generator_title ?? "AI Anime Generator"}
        </h2>
        {/* 左侧：参数控制面板 */}
        <div className="w-full max-w-full lg:w-96 xl:w-[28rem] 2xl:w-[32rem] lg:flex-shrink-0 p-3 lg:pr-2 overflow-x-hidden">
          <div className="glass-card flex flex-col h-full rounded-xl overflow-hidden">
            {/* 滚动内容区域 - 移除滚动条，允许内容自适应高度 */}
            <div className="flex-1 min-h-0 px-3 pt-3 pb-2 space-y-1.5 text-sm overflow-y-auto scrollbar-hide">
              {/* AI Model - 移动到第一排 */}
              {/* AI Model - 移动到第一排 */}
              <div className="py-1">
                <ModelSelectorWithIcon
                  value={parameters.model_uuid}
                  onChange={(value) => {
                    const newModel = configsData.models.find(
                      (m) => m.model_id === value
                    );
                    const maxCount = newModel?.max_counts || 4;

                    setParameters((prev) => ({
                      ...prev,
                      model_uuid: value,
                      batch_size: Math.min(prev.batch_size, maxCount),
                    }));
                  }}
                  disabled={isGenerating}
                  pageData={pageData}
                  modelType="text2img"
                />
              </div>

              {/* Prompt输入区域 */}
              <div className="py-1">
                <PromptInputSection
                  value={prompt}
                  onChange={setPrompt}
                  onOptimize={optimizePrompt}
                  disabled={isGenerating}
                  pageData={pageData}
                  maxLength={promptMaxLength}
                  minLength={promptMinLength}
                />
              </div>

              {/* Style选择区域 - 使用紧凑版本，当有预设模型时隐藏 */}
              {!initialModelId && (
                <div className="py-1">
                  <StyleSelectorCompact
                    value={parameters.style}
                    onChange={(value) => handleParameterChange("style", value)}
                    disabled={isGenerating}
                    pageData={pageData}
                  />
                </div>
              )}

              {/* Character选择区域 */}
              <div className="py-1">
                <CharacterSelector
                  value={parameters.characters}
                  onChange={(value) =>
                    setParameters((prev) => ({
                      ...prev,
                      characters: Array.isArray(value) ? value : [value],
                    }))
                  }
                  disabled={isGenerating || !supportsCharacter}
                  disabledReason={
                    !supportsCharacter
                      ? (pageData?.parameters?.characterNotSupported ||
                         "Characters are not supported with text2img models")
                      : undefined
                  }
                  pageData={pageData}
                  multiSelect={true}
                  maxSelection={1}
                />
              </div>

              {/* Reference区域 */}
              <div className="py-1">
                <ReferenceImageUpload
                  value={referenceImages}
                  onChange={setReferenceImages}
                  disabled={isGenerating || !supportsReferenceImage}
                  disabledReason={
                    !supportsReferenceImage
                      ? (pageData?.parameters?.referenceImageNotSupported ||
                        tParams("referenceImageNotSupported"))
                      : undefined
                  }
                  pageData={pageData}
                  onAuthError={() =>
                    handleAuthError(
                      { message: "Authentication required" },
                      "upload-reference"
                    )
                  }
                />
              </div>

              {/* Quick Prompt区域 - 可折叠 */}
              <div className="py-1">
                <CollapsibleQuickPrompt
                  onSelect={handlePromptAppend}
                  disabled={isGenerating}
                  pageData={pageData}
                />
              </div>

              {/* 基础参数控制 */}
              <div className="py-1">
                <div className="space-y-2">
                  {/* Aspect Ratio - 支持图标显示 */}
                  <AspectRatioSelector
                    value={parameters.aspect_ratio}
                    onChange={(value) =>
                      setParameters((prev) => ({
                        ...prev,
                        aspect_ratio: value,
                      }))
                    }
                    availableRatios={availableRatios}
                    disabled={isGenerating}
                    label={
                      pageData.parameters?.["aspect-ratio"] || "Aspect Ratio"
                    }
                  />

                  {/* 🔥 Image Resolution - 仅对支持的模型显示 */}
                  {modelResolutions.length > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-foreground flex-shrink-0">
                        {pageData.parameters?.["image-resolution"] ||
                          "Image Resolution"}
                        :
                      </label>
                      <Select
                        value={parameters.image_resolution}
                        onValueChange={(value) =>
                          setParameters((prev) => ({
                            ...prev,
                            image_resolution: value,
                          }))
                        }
                        disabled={isGenerating}
                      >
                        <SelectTrigger className="w-[120px] h-9 text-sm">
                          <SelectValue placeholder="Select">
                            <span className="text-sm">
                              {parameters.image_resolution}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {modelResolutions.map((resolution: string) => (
                            <SelectItem key={resolution} value={resolution}>
                              <span className="text-sm">{resolution}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Visibility Level */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">
                        {pageData.parameters?.visibility || "Visibility"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {pageData.parameters?.visibility_description ||
                          "Set generation visibility level"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {parameters.visibility_level === "public"
                          ? pageData?.image_detail?.visibility?.public || "Public"
                          : pageData?.image_detail?.visibility?.private || "Private"}
                      </span>
                      <Switch
                        checked={parameters.visibility_level === "public"}
                        onCheckedChange={(checked) => {
                          if (!canUsePrivate && !checked) {
                            toast.info(
                              pageData?.upgrade_prompts?.private_visibility ||
                                "Upgrade to a subscription plan to use private visibility"
                            );
                            return;
                          }
                          setParameters((prev) => ({
                            ...prev,
                            visibility_level: checked ? "public" : "private",
                          }));
                        }}
                        disabled={
                          isGenerating ||
                          (!canUsePrivate &&
                            parameters.visibility_level === "public")
                        }
                      />
                      {!canUsePrivate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <img
                                src={getMemberBadgeUrl("sub_only")}
                                alt="Subscription Only"
                                className="w-5 h-5 cursor-help"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                                  <p>
                                    {pageData?.parameters?.subscriptionTooltip ||
                                      tParams("subscriptionTooltip")}
                                  </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Number of Images - 输入框右对齐，说明文字在参数名下方 */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        {pageData.parameters?.["batch-size"] ||
                          "Number of Images"}
                        :
                      </label>
                      <p className="text-xs text-muted-foreground">
                        max:{" "}
                        {(() => {
                          const currentModel = configsData.models.find(
                            (m) => m.model_id === parameters.model_uuid
                          );
                          return currentModel?.max_counts || 4;
                        })()}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={(() => {
                        const currentModel = configsData.models.find(
                          (m) => m.model_id === parameters.model_uuid
                        );
                        return currentModel?.max_counts || 4;
                      })()}
                      value={parameters.batch_size}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        const currentModel = configsData.models.find(
                          (m) => m.model_id === parameters.model_uuid
                        );
                        const maxCount = currentModel?.max_counts || 4;
                        if (value >= 1 && value <= maxCount) {
                          setParameters((prev) => ({
                            ...prev,
                            batch_size: value,
                          }));
                        }
                      }}
                      className="w-20 px-3 py-2 bg-background border border-input rounded-md text-sm text-center"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 按钮区域 - 固定在底部 */}
            <div className="p-3 flex-shrink-0">
              <div className="flex gap-3">
                {/* 重置按钮 */}
                <Button
                  onClick={handleReset}
                  disabled={isGenerating}
                  variant="secondary"
                  className="w-10 h-9 flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors flex-shrink-0"
                >
                  <RefreshCwIcon className="h-4 w-4" />
                </Button>

                {/* 生成按钮 */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt?.trim()}
                  className="flex-1 h-10 text-base font-medium"
                >
                  {/* 消耗积分显示 */}
                  <img
                    src={getCreamyCharacterUrl("meow_coin")}
                    alt="Credits icon for generation cost"
                    className="w-5 h-5 mr-0"
                  />
                  <span>
                    {`${totalCredits}`}{" "}
                    ·{"  "}
                  </span>
                  {isGenerating ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      {pageData.generating || "Generating..."}
                    </>
                  ) : (
                    pageData.generate || "Generate"
                  )}
                </Button>
              </div>

              {/* 错误提示 */}
              {finalError && (
                <div className="flex items-center gap-2 p-3 mt-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircleIcon className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{finalError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：结果展示区 */}
        <div className="flex-1 flex flex-col min-h-0 max-w-full">
          {/* 主要结果展示区域 */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-3 flex flex-col">
              <div className="glass-card rounded-xl h-full flex flex-col overflow-hidden">
                <ResultsDisplayPanel>
                  {renderRightContent()}
                </ResultsDisplayPanel>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <ImagePreviewDialog
        open={isPreviewOpen}
        generationImageUuid={previewImageUuid}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPreviewImageUuid(null);
          }
          setIsPreviewOpen(nextOpen);
        }}
        pageData={pageData}
        onReuseParameters={async (uuid) => {
          await loadReuseData(uuid);
        }}
        onCreateNew={handleReset}
      />
    </>
  );
}
