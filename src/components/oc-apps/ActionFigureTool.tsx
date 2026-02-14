"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCreamyCharacterUrl,
  getMemberBadgeUrl,
  getModelIconUrl,
} from "@/lib/asset-loader";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import {
  validateGenerationType,
  IMAGE_GEN_TYPES,
  getGeneratorName,
} from "@/lib/generation-type-validator";
import { type Template, processTemplatesResponse } from "@/lib/template-utils";
import { TemplateSelectorCompact } from "@/components/oc-apps/TemplateSelectorCompact";
import { ActionFigureExamplesGallery } from "@/components/oc-apps/action-figure/ExamplesGallery";
import { CharacterSelector } from "@/components/anime-generator/CharacterSelector";
import { ReferenceImageUpload } from "@/components/anime-generator/ReferenceImageUpload";
import { ModelSelectorWithIcon } from "@/components/anime-generator/ModelSelectorWithIcon";
import { ResultsDisplayPanel } from "@/components/anime-generator/ResultsDisplayPanel";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { useAllConfigs } from "@/lib/hooks/useConfigs";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/app";
import { ImagePreviewDialog } from "@/components/anime-generator/ImagePreviewDialog";
import { toImageUrl } from "@/lib/r2-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 缓存相关常量
const CACHE_KEY_PREFIX = "action_figure_generator_";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时过期时间（毫秒）
const CACHE_KEYS = {
  TEMPLATE: `${CACHE_KEY_PREFIX}template`,
  INPUT_MODE: `${CACHE_KEY_PREFIX}input_mode`,
  USER_PROMPT: `${CACHE_KEY_PREFIX}user_prompt`,
  REFERENCE_SOURCE: `${CACHE_KEY_PREFIX}reference_source`,
  UPLOADED_IMAGE_URL: `${CACHE_KEY_PREFIX}uploaded_image_url`,
  SELECTED_OC_UUID: `${CACHE_KEY_PREFIX}selected_oc_uuid`,
  SELECTED_MODEL: `${CACHE_KEY_PREFIX}selected_model`,
  BATCH_SIZE: `${CACHE_KEY_PREFIX}batch_size`,
  IS_PUBLIC: `${CACHE_KEY_PREFIX}is_public`,
  PENDING_OPERATION: `${CACHE_KEY_PREFIX}pending_operation`,
} as const;

// 缓存工具函数
const saveToCache = (key: string, value: any) => {
  try {
    if (typeof window !== "undefined") {
      const cacheData = {
        value,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    }
  } catch (error) {
    console.warn("Failed to save to cache:", error);
  }
};

const getFromCache = (key: string, defaultValue: any): any => {
  try {
    if (typeof window === "undefined") return defaultValue;

    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;

    const parsed = JSON.parse(cached);
    if (!parsed || parsed.value === undefined) {
      return defaultValue;
    }

    // 检查缓存是否过期
    const { value, timestamp } = parsed;
    if (timestamp && Date.now() - timestamp > CACHE_TTL) {
      // 缓存过期，清理并返回默认值
      localStorage.removeItem(key);
      return defaultValue;
    }

    return value;
  } catch (error) {
    console.warn("Failed to get from cache:", error);
    return defaultValue;
  }
};

const clearCache = () => {
  try {
    if (typeof window !== "undefined") {
      Object.values(CACHE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
    }
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
};

interface GeneratedImage {
  uuid: string;
  image_url: string;
  thumbnail_url?: string;
  width: number;
  height: number;
  final_prompt?: string;
}

type ReferenceSource = "upload" | "oc";

type RightPanelState =
  | { type: "examples" }
  | { type: "idle" }
  | { type: "processing"; uuid: string }
  | { type: "completed"; results: GeneratedImage[] };

interface ActionFigureToolProps {
  className?: string;
  pageData: any;
  genImageId?: string; // 用于参数复用的图片ID
  characterUuid?: string; // 角色UUID，用于预选角色
  isLoggedIn?: boolean; // 从页面传递的登录状态
  initialCanUsePrivate?: boolean;
}

/**
 * ActionFigureTool - AI 手办生成器主工具组件
 *
 * 左右分栏布局，集成所有生成参数控制和结果展示
 *
 * Related: docs/2-implementation/frontend/page-ai-action-figure-generator.md
 */
export function ActionFigureTool({
  className,
  pageData,
  genImageId,
  characterUuid,
  isLoggedIn = false,
  initialCanUsePrivate = false,
}: ActionFigureToolProps) {
  const t = useTranslations();
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user: appUser,
    isLoadingUser,
    setShowSignModal,
    setSignModalMessage,
  } = useAppContext();

  // 获取配置数据
  const configsData = useAllConfigs();
  const { models: allModels, loading: configsLoading } = configsData;

  // 使用useRef跟踪已处理的genImageId，防止重复加载
  const processedGenImageIdRef = useRef<string | null>(null);

  // 模板选择
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  // 输入模式状态管理
  const [inputMode, setInputMode] = useState<
    "oc_character" | "text_with_reference"
  >("text_with_reference");
  const [referenceSource, setReferenceSource] = useState<ReferenceSource>("oc");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [selectedOCUuid, setSelectedOCUuid] = useState<string>("");

  // 用户补充描述
  const [userPrompt, setUserPrompt] = useState("");

  // 生成参数
  const [selectedModel, setSelectedModel] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const [isPublic, setIsPublic] = useState(false);
  // 风格参数不需要
  const [leftError, setLeftError] = useState<string | null>(null);

  // 参数复用相关状态
  const [isLoadingReuseData, setIsLoadingReuseData] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<string | null>(null);
  const hasInitializedVisibilityRef = useRef(false);

  // 订阅 gating：是否可使用私密可见
  const canUsePrivate = (() => {
    if (appUser) {
      if (!appUser.is_sub) return false;
      if (!appUser.sub_expired_at) return false;
      return new Date(appUser.sub_expired_at) > new Date();
    }

    if (isLoggedIn) {
      return initialCanUsePrivate;
    }

    return false;
  })();

  // 根据用户订阅状态设置默认 visibility（仅初始化一次）
  useEffect(() => {
    if (isLoadingUser || hasInitializedVisibilityRef.current) {
      return;
    }

    hasInitializedVisibilityRef.current = true;
    setIsPublic(!canUsePrivate);
  }, [canUsePrivate, isLoadingUser]);

  // 非订阅用户强制 Public
  useEffect(() => {
    if (isLoadingUser || canUsePrivate) {
      return;
    }

    if (!isPublic) {
      setIsPublic(true);
    }
  }, [canUsePrivate, isLoadingUser, isPublic]);

  // 模板当前选中项（用于紧凑选择器显示）
  const selectedTplForCompact = selectedTemplate;

  // 获取当前选中的模型信息
  const currentModel = allModels?.find((m) => m.model_id === selectedModel);
  const creditsPerImage = currentModel?.credits_per_generation || 10;
  const totalCredits = creditsPerImage * batchSize;
  const maxBatchSize = currentModel?.max_counts || 4;

  // 检查当前模型是否支持参考图片
  const supportsReferenceImage = (() => {
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
  })();

  // 生成状态
  const [generationUuid, setGenerationUuid] = useState<string>("");
  const [rightPanelState, setRightPanelState] = useState<RightPanelState>(
    isLoggedIn ? { type: "idle" } : { type: "examples" }
  );
  // 复用结果展示 - 用于显示复用的图片
  const [reuseResults, setReuseResults] = useState<GeneratedImage[]>([]);

  const handleReferenceUploadAuthError = useCallback(() => {
    const message =
      pageData?.tool?.loginRequiredForUpload ||
      pageData?.tool?.errorSignIn ||
      "Please sign in to use";
    setLeftError(message);
    setSignModalMessage(message);
    setShowSignModal(true);
  }, [
    pageData?.tool?.loginRequiredForUpload,
    pageData?.tool?.errorSignIn,
    setLeftError,
    setShowSignModal,
    setSignModalMessage,
  ]);

  // 加载复用数据的函数
  const loadReuseData = useCallback(
    async (imageId: string) => {
      if (!imageId) return;

      setIsLoadingReuseData(true);
      setLeftError(null);

      try {
        // 调用 API 获取图片详情
        const response = await fetch(`/api/generation/image/${imageId}`);

        if (!response.ok) {
          if (response.status === 401) {
            // 未登录，触发登录流程
            const message =
              pageData?.tool?.loginToReuse ||
              "Please log in to reuse parameters";
            setLeftError(message);
            setSignModalMessage(message);
            setShowSignModal(true);
            return;
          }
          if (response.status === 403) {
            // 已登录但无权访问（他人的私有图片）
            const message =
              pageData?.tool?.noPermission ||
              "You don't have permission to access this image";
            setLeftError(message);
            return;
          }
          if (response.status === 404) {
            // 图片不存在
            const message = pageData?.tool?.imageNotFound || "Image not found";
            setLeftError(message);
            return;
          }
          throw new Error("Failed to load image data");
        }

        const result = await response.json();
        const imageData = result.data;
        const generation = imageData.generation;

        // 验证 gen_type 是否匹配
        if (
          !validateGenerationType(
            imageData.gen_type,
            IMAGE_GEN_TYPES.ACTION_FIGURE
          )
        ) {
          const actualGenType = imageData.gen_type || "unknown";
          const correctGeneratorName = getGeneratorName(actualGenType);

          const message = `This image was generated in ${correctGeneratorName}. Please use the correct generator to reuse its parameters.`;
          setLeftError(message);

          // 清空 URL 参数
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("gen_image_id");
          router.replace(currentUrl.pathname + currentUrl.search, {
            scroll: false,
          });

          return;
        }

        // 从 templates API 获取模板列表用于匹配
        const templatesResponse = await fetch(
          "/api/oc-apps/action-figure/templates"
        );
        let templates: Template[] = [];
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          templates = processTemplatesResponse(templatesData);
        }

        // 1. 填充模板（从 generation.template_id，后端已解析）
        const templateId = generation.template_id;
        if (templateId && templates.length > 0) {
          const matchedTemplate = templates.find((t) => t.id === templateId);
          if (matchedTemplate) {
            setSelectedTemplate(matchedTemplate);
          } else {
            console.warn(`Template ${templateId} not found, using default`);
            // 可选：使用第一个模板作为降级
            if (templates.length > 0) {
              setSelectedTemplate(templates[0]);
            }
          }
        }

        // 2. 填充用户补充描述（从 generation.user_prompt，后端已解析）
        const userPromptValue = generation.user_prompt;
        if (userPromptValue) {
          setUserPrompt(userPromptValue);
        }

        // 3. 填充模型
        if (generation.model_id) {
          setSelectedModel(generation.model_id);
        }

        // 注意：不填充 OC 和参考图
        // 即使原图有关联的 character_uuids 或 reference_image_url，也不自动填充

        // 标记该genImageId已被处理，避免重复执行
        processedGenImageIdRef.current = imageId;

        // 在右侧显示复用的图片（和AnimeGenerator一样的处理方式）
        const reuseImage: GeneratedImage = {
          uuid: imageData.uuid,
          image_url: imageData.image_url,
          thumbnail_url:
            imageData.thumbnail_desktop || imageData.thumbnail_mobile,
          width: 1024,
          height: 1024,
        };
        setReuseResults([reuseImage]);
      } catch (error: any) {
        console.error("Load reuse data failed:", error);
        const message =
          error.message ||
          pageData?.tool?.loadFailed ||
          "Failed to load parameters";
        setLeftError(message);
      } finally {
        setIsLoadingReuseData(false);
      }
    },
    [pageData, router, setLeftError, setShowSignModal, setSignModalMessage]
  );

  // 自动选中传入的角色
  const selectCharacter = useCallback(
    (uuid: string) => {
      if (!uuid) return;

      console.log("Auto-selecting character:", uuid);
      setSelectedOCUuid(uuid);
      // 使用 OC 作为参考图来源
      setReferenceSource("oc");

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

  // 状态轮询
  useGenerationPolling({
    generationId: generationUuid,
    generationType: "anime",
    onCompleted: (results) => {
      // 立即清除 generationUuid 停止轮询，防止重复触发
      setGenerationUuid("");

      const mappedResults: GeneratedImage[] = results.map((r) => ({
        uuid: r.image_uuid,
        image_url: r.image_url,
        thumbnail_url: r.thumbnail_url,
        width: 1024,
        height: 1024,
      }));
      setRightPanelState({ type: "completed", results: mappedResults });
    },
    onFailed: (error) => {
      // 立即清除 generationUuid 停止轮询
      setGenerationUuid("");
      setRightPanelState(
        isLoggedIn ? { type: "idle" } : { type: "examples" }
      );
      setLeftError(error);
    },
  });

  // 设置默认值：当配置加载完成时，选择默认模型和模板
  useEffect(() => {
    // 仅在配置加载完成且未选择模型时设置默认值
    if (
      !configsLoading &&
      allModels &&
      allModels.length > 0 &&
      !selectedModel
    ) {
      // 过滤出图像生成模型（img2img 和 text2img）
      const imageModels = allModels.filter((m) => m.model_type === "img2img");

      // 优先选择第一个 img2img 模型（img2img 已包含 text2img 能力）
      const firstImg2ImgModel = imageModels.find(
        (m) => m.model_type === "img2img"
      );
      if (firstImg2ImgModel) {
        setSelectedModel(firstImg2ImgModel.model_id);
        return;
      }
    }
  }, [configsLoading, allModels, selectedModel]);

  // 组件挂载检测
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 初始化挂载状态和缓存恢复
  useEffect(() => {
    setIsMounted(true);

    // 始终从缓存恢复数据（处理首次访问和刷新页面的情况）
    if (typeof window !== "undefined") {
      const cachedInputMode = getFromCache(CACHE_KEYS.INPUT_MODE, "text_with_reference");
      const cachedUserPrompt = getFromCache(CACHE_KEYS.USER_PROMPT, "");
      const cachedReferenceSource = getFromCache(CACHE_KEYS.REFERENCE_SOURCE, "oc");
      const cachedUploadedImageUrl = getFromCache(CACHE_KEYS.UPLOADED_IMAGE_URL, "");
      const cachedSelectedOCUuid = getFromCache(CACHE_KEYS.SELECTED_OC_UUID, "");
      const cachedSelectedModel = getFromCache(CACHE_KEYS.SELECTED_MODEL, "");
      const cachedBatchSize = getFromCache(CACHE_KEYS.BATCH_SIZE, 1);
      const cachedIsPublic = getFromCache(CACHE_KEYS.IS_PUBLIC, false);
      const cachedPendingOperation = getFromCache(CACHE_KEYS.PENDING_OPERATION, null);

      setInputMode(cachedInputMode);
      setUserPrompt(cachedUserPrompt);
      setReferenceSource(cachedReferenceSource);
      setUploadedImageUrl(cachedUploadedImageUrl);
      setSelectedOCUuid(cachedSelectedOCUuid);
      setSelectedModel(cachedSelectedModel);
      setBatchSize(cachedBatchSize);
      setIsPublic(cachedIsPublic);

      if (cachedPendingOperation) {
        setPendingOperation(cachedPendingOperation);
      }
    }
  }, [isLoggedIn]);

  // 预览弹窗状态管理
  const [previewImageUuid, setPreviewImageUuid] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 打开预览弹窗函数
  const openPreviewDialog = useCallback(
    async (imageUuid: string | null) => {
      if (!imageUuid) return;

      // 验证是否为 owner
      try {
        const response = await fetch(`/api/generation/image/${imageUuid}`);
        const data = await response.json();

        // 未登录或无用户信息直接拒绝
        if (!user?.uuid) {
          return;
        }

        // 对比 user_uuid
        if (data.data?.generation?.user_uuid !== user.uuid) {
          return; // 非 owner 直接返回，不打开弹窗
        }

        setPreviewImageUuid(imageUuid);
        setIsPreviewOpen(true);
      } catch (error) {
        console.error("Failed to verify ownership:", error);
      }
    },
    [user?.uuid]
  );

  // 监听 genImageId 参数，加载复用数据
  useEffect(() => {
    if (genImageId && isMounted) {
      console.log("Loading reuse data for genImageId:", genImageId);

      // 检查是否已经处理过该genImageId，避免重复执行
      if (processedGenImageIdRef.current === genImageId) {
        console.log("genImageId already processed, skipping:", genImageId);
        return;
      }

      // 如果未登录，先触发登录流程
      if (!isLoggedIn) {
        // 保存待执行操作
        setPendingOperation("reuse");
        saveToCache(CACHE_KEYS.PENDING_OPERATION, "reuse");

        const message =
          pageData?.tool?.loginToReuse || "Please log in to reuse parameters";
        setLeftError(message);
        setSignModalMessage(message);
        setShowSignModal(true);
        return;
      }

      // 已登录，直接加载复用数据
      loadReuseData(genImageId);
    }
  }, [
    genImageId,
    isMounted,
    isLoggedIn,
    loadReuseData,
    pageData?.tool?.loginToReuse,
    setLeftError,
    setSignModalMessage,
    setShowSignModal,
  ]);

  // 监听 characterUuid 参数，自动选中角色
  useEffect(() => {
    if (characterUuid && isMounted) {
      console.log("Auto-selecting character for characterUuid:", characterUuid);

      // 如果未登录，先触发登录流程
      if (!isLoggedIn) {
        // 保存待执行操作
        setPendingOperation("character");
        saveToCache(CACHE_KEYS.PENDING_OPERATION, "character");

        const message =
          pageData?.tool?.loginToReuse || "Please log in to use character data";
        setLeftError(message);
        setSignModalMessage(message);
        setShowSignModal(true);
        return;
      }

      // 已登录，自动选中角色
      selectCharacter(characterUuid);
    }
  }, [
    characterUuid,
    isMounted,
    isLoggedIn,
    selectCharacter,
    pageData?.tool?.loginToReuse,
    setLeftError,
    setSignModalMessage,
    setShowSignModal,
  ]);

  // 当模型改变时，自动调整批量大小不超过最大值
  useEffect(() => {
    if (currentModel && batchSize > maxBatchSize) {
      setBatchSize(maxBatchSize);
    }
  }, [currentModel, maxBatchSize, batchSize]);

  // 当用户登录状态改变时，更新右侧面板状态
  useEffect(() => {
    if (!isLoggedIn && rightPanelState.type !== "examples") {
      setRightPanelState({ type: "examples" });
    } else if (isLoggedIn && rightPanelState.type === "examples") {
      setRightPanelState({ type: "idle" });
    }
  }, [isLoggedIn]);

  // 缓存同步 - 保存用户输入到缓存
  useEffect(() => {
    if (!isMounted) return;

    // 始终保存数据，不管是否登录（这样刷新页面后数据不会丢失）
    saveToCache(CACHE_KEYS.INPUT_MODE, inputMode);
  }, [inputMode, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    saveToCache(CACHE_KEYS.USER_PROMPT, userPrompt);
  }, [userPrompt, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    saveToCache(CACHE_KEYS.REFERENCE_SOURCE, referenceSource);
  }, [referenceSource, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    saveToCache(CACHE_KEYS.UPLOADED_IMAGE_URL, uploadedImageUrl);
  }, [uploadedImageUrl, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    saveToCache(CACHE_KEYS.SELECTED_OC_UUID, selectedOCUuid);
  }, [selectedOCUuid, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    saveToCache(CACHE_KEYS.SELECTED_MODEL, selectedModel);
  }, [selectedModel, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    saveToCache(CACHE_KEYS.BATCH_SIZE, batchSize);
  }, [batchSize, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    saveToCache(CACHE_KEYS.IS_PUBLIC, isPublic);
  }, [isPublic, isMounted]);

  // 登录后恢复操作
  useEffect(() => {
    if (isLoggedIn && pendingOperation) {
      console.log("User logged in, resuming operation:", pendingOperation);

      // 恢复缓存的数据
      const cachedUserPrompt = getFromCache(CACHE_KEYS.USER_PROMPT, "");
      const cachedReferenceSource = getFromCache(CACHE_KEYS.REFERENCE_SOURCE, "oc");
      const cachedUploadedImageUrl = getFromCache(CACHE_KEYS.UPLOADED_IMAGE_URL, "");
      const cachedSelectedOCUuid = getFromCache(CACHE_KEYS.SELECTED_OC_UUID, "");
      const cachedSelectedModel = getFromCache(CACHE_KEYS.SELECTED_MODEL, "");
      const cachedBatchSize = getFromCache(CACHE_KEYS.BATCH_SIZE, 1);
      const cachedIsPublic = getFromCache(CACHE_KEYS.IS_PUBLIC, false);

      setUserPrompt(cachedUserPrompt);
      setReferenceSource(cachedReferenceSource);
      setUploadedImageUrl(cachedUploadedImageUrl);
      setSelectedOCUuid(cachedSelectedOCUuid);
      setSelectedModel(cachedSelectedModel);
      setBatchSize(cachedBatchSize);
      setIsPublic(cachedIsPublic);

      // 清理待执行操作和消息
      setPendingOperation(null);
      setSignModalMessage("");
      localStorage.removeItem(CACHE_KEYS.PENDING_OPERATION);
    }
  }, [isLoggedIn, pendingOperation, setSignModalMessage]);

  // 处理生成
  async function handleGenerate() {
    // 检查并重置URL中的search params（如果存在）
    const currentUrl = new URL(window.location.href);
    const paramsToReset = ["gen_image_id", "character_uuid"];
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

    // 校验登录状态 - 未登录时触发登录弹窗并保存待执行操作
    if (!isLoggedIn || !user) {
      // 保存待执行操作
      setPendingOperation("generate");
      saveToCache(CACHE_KEYS.PENDING_OPERATION, "generate");

      const msg = pageData?.tool?.errorSignIn || "Please sign in to generate";
      setLeftError(msg);
      return;
    }

    if (!selectedTemplate) {
      const msg =
        pageData?.tool?.errorSelectTemplate || "Please select a template";
      setLeftError(msg);
      return;
    }

    // 校验输入模式下的必要参数
    if (inputMode === "text_with_reference" && !uploadedImageUrl) {
      const msg =
        pageData?.tool?.errorUploadImage || "Please upload a reference image";
      setLeftError(msg);
      return;
    }

    if (inputMode === "oc_character" && !selectedOCUuid) {
      const msg =
        pageData?.tool?.errorSelectOC || "Please select an OC character";
      setLeftError(msg);
      return;
    }

    if (!selectedModel) {
      const msg = pageData?.tool?.errorSelectModel || "Please select a model";
      setLeftError(msg);
      return;
    }

    // 设置处理中状态
    setRightPanelState({ type: "processing", uuid: "" });

    try {
      setLeftError(null);
      const response = await fetch("/api/anime-generation/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 根据新的架构，传递模板和用户输入，由后端统一处理
          gen_type: "action_figure",
          template_id: selectedTemplate.id,
          template_prompt: selectedTemplate.prompt,
          user_prompt: userPrompt.trim() || undefined,
          model_uuid: selectedModel,
          aspect_ratio: selectedTemplate.aspect_ratio,
          batch_size: batchSize,
          reference_image_urls:
            inputMode === "text_with_reference" && uploadedImageUrl
              ? [uploadedImageUrl]
              : undefined,
          character_uuids:
            inputMode === "oc_character" && selectedOCUuid
              ? [selectedOCUuid]
              : undefined,
          visibility_level: isPublic ? "public" : "private",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle insufficient credits (402) without throwing error to console
        if (response.status === 402) {
          const msg = data.error || "Insufficient credits";
          setLeftError(msg);
          // Reset right panel state to prevent infinite processing animation
          setRightPanelState(
            isLoggedIn ? { type: "idle" } : { type: "examples" }
          );
          return;
        }
        // Other errors - throw to be caught by catch block
        throw new Error(data.error || "Failed to create generation task");
      }

      const uuid = data.data.generation_uuid;
      setGenerationUuid(uuid);
      setRightPanelState({ type: "processing", uuid });
    } catch (error: any) {
      console.error("Generate failed:", error);
      const msg =
        error.message ||
        pageData?.tool?.generationFailed ||
        "Generation failed";
      setLeftError(msg);
      setRightPanelState(
        isLoggedIn ? { type: "idle" } : { type: "examples" }
      );
    }
  }

  // 重置参数
  function handleReset() {
    setSelectedTemplate(null);
    setInputMode("text_with_reference");
    setReferenceSource("upload");
    setUploadedImageUrl("");
    setSelectedOCUuid("");
    setUserPrompt("");
    setSelectedModel("");
    setBatchSize(1);
    setIsPublic(false);
    // 风格参数已移除
    setGenerationUuid("");
    setRightPanelState(isLoggedIn ? { type: "idle" } : { type: "examples" });
    setLeftError(null);
    setReuseResults([]); // 清空复用结果
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 处理示例点击（一键复用参数）
  async function handleExampleClick(example: any) {
    // 填充模板
    if (example.template_id) {
      try {
        // 从 templates API 获取模板列表用于匹配
        const templatesResponse = await fetch(
          "/api/oc-apps/action-figure/templates"
        );
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          const templates = processTemplatesResponse(templatesData);
          const matchedTemplate = templates.find(
            (t: Template) => t.id === example.template_id
          );
          if (matchedTemplate) {
            setSelectedTemplate(matchedTemplate);
          } else {
            console.warn(
              `Template ${example.template_id} not found for example`
            );
          }
        }
      } catch (error) {
        console.error("Failed to load templates for example:", error);
      }
    }

    // 填充参考图
    if (example.reference_image_url) {
      setReferenceSource("upload");
      // 使用 toImageUrl 处理相对路径，toImageUrl 会自动处理完整URL
      setUploadedImageUrl(toImageUrl(example.reference_image_url));
    }

    // 填充用户提示词
    if (example.user_prompt) {
      setUserPrompt(example.user_prompt);
    }

    // 填充模型
    if (example.model_id) {
      setSelectedModel(example.model_id);
    }

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 渲染右侧面板
  function renderRightPanel() {
    if (!isLoggedIn) {
      return (
        <ActionFigureExamplesGallery onExampleClick={handleExampleClick} />
      );
    }

    // 显示生成结果（优先级最高）
    if (
      rightPanelState.type === "completed" &&
      rightPanelState.results.length > 0
    ) {
      const resultCount = rightPanelState.results.length;

      return (
        <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-y-auto">
          {resultCount === 1 ? (
            // 单张图片响应式居中显示
            <div className="flex items-center justify-center w-full h-full min-h-0">
              <img
                src={rightPanelState.results[0].image_url}
                alt="Generated action figure"
                className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  openPreviewDialog(rightPanelState.results[0].uuid);
                }}
              />
            </div>
          ) : rightPanelState.results.length === 2 ? (
            // 2张图片响应式布局
            <div className="flex flex-col sm:flex-row gap-3 w-full h-full items-center justify-center">
              {rightPanelState.results.slice(0, 2).map((image, index) => (
                <div
                  key={image.uuid}
                  className="flex-1 flex items-center justify-center min-h-0"
                >
                  <img
                    src={image.image_url}
                    alt={`Generated action figure ${index + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      openPreviewDialog(image.uuid);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : rightPanelState.results.length === 3 ? (
            // 3张图片响应式布局
            <div className="flex flex-col lg:flex-row gap-3 w-full h-full">
              {/* 主图 */}
              <div className="flex-1 lg:flex-2 flex items-center justify-center min-h-0">
                <img
                  src={rightPanelState.results[0].image_url}
                  alt="Generated action figure 1"
                  className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    openPreviewDialog(rightPanelState.results[0].uuid);
                  }}
                />
              </div>
              {/* 副图区域 */}
              <div className="flex-1 flex flex-row lg:flex-col gap-3">
                {rightPanelState.results.slice(1, 3).map((image, index) => (
                  <div
                    key={image.uuid}
                    className="flex-1 flex items-center justify-center min-h-0"
                  >
                    <img
                      src={image.image_url}
                      alt={`Generated action figure ${index + 2}`}
                      className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        openPreviewDialog(image.uuid);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 4张图片响应式网格显示
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full h-full place-items-center">
              {rightPanelState.results.slice(0, 4).map((image, index) => (
                <div
                  key={image.uuid}
                  className="flex items-center justify-center min-h-0"
                >
                  <img
                    src={image.image_url}
                    alt={`Generated action figure ${index + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      openPreviewDialog(image.uuid);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 显示复用结果（如果没有生成结果）
    if (reuseResults.length > 0 && rightPanelState.type !== "processing") {
      return (
        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
          <div className="flex items-center justify-center w-full h-full">
            <img
              src={reuseResults[0].image_url}
              alt="Reused reference image"
              className="w-full h-full max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                openPreviewDialog(reuseResults[0].uuid);
              }}
            />
          </div>
        </div>
      );
    }

    // 其他状态
    switch (rightPanelState.type) {
      case "idle":
        return (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <h3 className="mb-2 text-xl font-semibold">
                {pageData?.tool?.readyTitle || "Ready to Create"}
              </h3>
              <p className="text-muted-foreground">
                {pageData?.tool?.readyDescription ||
                  "Select a template and provide reference to generate your action figure"}
              </p>
            </div>
          </div>
        );

      case "processing":
        return (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-lg font-medium">Generating...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we create your action figure
              </p>
            </div>
          </div>
        );

      case "completed":
        const resultCount = rightPanelState.results.length;

        return (
          <div className="flex-1 flex items-center justify-center p-2 min-h-0">
            {resultCount === 1 ? (
              // 单张图片响应式居中显示
              <div className="flex items-center justify-center w-full h-full">
                <img
                  src={rightPanelState.results[0].image_url}
                  alt="Generated action figure"
                  className="w-full h-full max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    openPreviewDialog(rightPanelState.results[0].uuid);
                  }}
                />
              </div>
            ) : rightPanelState.results.length === 2 ? (
              // 2张图片响应式布局
              <div className="flex flex-col sm:flex-row gap-3 w-full h-full items-center justify-center">
                {rightPanelState.results.slice(0, 2).map((image, index) => (
                  <div
                    key={image.uuid}
                    className="flex-1 flex items-center justify-center"
                  >
                    <img
                      src={image.image_url}
                      alt={`Generated action figure ${index + 1}`}
                      className="max-w-full max-h-[45vh] sm:max-h-[60vh] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        openPreviewDialog(image.uuid);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : rightPanelState.results.length === 3 ? (
              // 3张图片响应式布局
              <div className="flex flex-col lg:flex-row gap-3 w-full h-full">
                {/* 主图 */}
                <div className="flex-1 lg:flex-[2] flex items-center justify-center">
                  <img
                    src={rightPanelState.results[0].image_url}
                    alt="Generated action figure 1"
                    className="max-w-full max-h-[40vh] lg:max-h-[60vh] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      openPreviewDialog(rightPanelState.results[0].uuid);
                    }}
                  />
                </div>
                {/* 副图区域 */}
                <div className="flex-1 flex flex-row lg:flex-col gap-3">
                  {rightPanelState.results.slice(1, 3).map((image, index) => (
                    <div
                      key={image.uuid}
                      className="flex-1 flex items-center justify-center"
                    >
                      <img
                        src={image.image_url}
                        alt={`Generated action figure ${index + 2}`}
                        className="max-w-full max-h-[25vh] lg:max-h-[28vh] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          openPreviewDialog(image.uuid);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // 4张图片响应式网格显示
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full h-full">
                {rightPanelState.results.slice(0, 4).map((image, index) => (
                  <div
                    key={image.uuid}
                    className="flex items-center justify-center"
                  >
                    <img
                      src={image.image_url}
                      alt={`Generated action figure ${index + 1}`}
                      className="max-w-full max-h-[35vh] sm:max-h-[40vh] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        openPreviewDialog(image.uuid);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <>
      <div className={cn("generator-ambient h-full w-full", className)}>
        <div className="generator-ambient__content flex flex-col lg:flex-row lg:h-full lg:overflow-x-hidden">
        <h2 className="sr-only">{pageData?.tool?.title}</h2>
        {/* 左侧参数面板 - 响应式布局 */}
        <div className="w-full lg:w-96 xl:w-[28rem] 2xl:w-[32rem] lg:flex-shrink-0 p-3 lg:pr-2 overflow-x-hidden">
          <div className="glass-card flex flex-col lg:h-full rounded-xl overflow-hidden">
            {/* 参数滚动区 - 可滚动 */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pt-3 pb-2 space-y-1.5 text-sm">
              {/* 参数复用加载提示 - 移到滚动区内部 */}
              {isLoadingReuseData && (
                <div className="bg-primary/10 border border-primary/20 px-3 py-3 rounded-lg flex items-center justify-center gap-2 mb-3">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="text-sm text-primary">
                    {pageData?.tool?.loadingReuse || "Loading parameters..."}
                  </span>
                </div>
              )}

              {/* 配置加载状态 */}
              {configsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Loading configurations...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* 1. Model 选择器 - 移到最上面 */}
                  <div className="py-1">
                    <ModelSelectorWithIcon
                      value={selectedModel}
                      onChange={setSelectedModel}
                      disabled={rightPanelState.type === "processing"}
                      pageData={pageData}
                      modelType="img2img"
                    />
                  </div>

                  {/* 2. 模板选择 - 紧凑选择器 */}
                  <div className="py-1">
                    <TemplateSelectorCompact
                      selected={selectedTplForCompact || null}
                      onSelect={setSelectedTemplate}
                      title={
                        pageData?.tool?.selectTemplate ||
                        "Select Figure Template"
                      }
                      pageData={pageData}
                    />
                    {selectedTemplate &&
                      (selectedTemplate.i18n_description_key ||
                        selectedTemplate.description) && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {selectedTemplate.i18n_description_key
                            ? t(selectedTemplate.i18n_description_key)
                            : selectedTemplate.description}
                        </p>
                      )}
                  </div>

                  {/* 3. 参考图输入模式切换 - Toggle Switcher 样式 */}
                  <div className="py-1">
                    <Label className="text-sm font-medium mb-3 block">
                      {pageData?.tool?.inputMode?.title || "Input Mode"}
                    </Label>
                    {/* Toggle Switcher */}
                    <div className="relative mb-3 bg-muted rounded-lg p-1">
                      <div
                        className="absolute top-1 bottom-1 bg-primary rounded-md transition-all duration-300 ease-in-out"
                        style={{
                          width: "calc(50% - 4px)",
                          left:
                            inputMode === "text_with_reference"
                              ? "4px"
                              : "calc(50% + 4px)",
                        }}
                      />
                      <div className="relative grid grid-cols-2 gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInputMode("text_with_reference");
                            setReferenceSource("upload");
                            setSelectedOCUuid("");
                            setUploadedImageUrl(""); // 🔥 切换到描述模式时清空上传的图片
                          }}
                          className={cn(
                            "px-2 py-2 text-xs font-medium rounded-md transition-colors z-10",
                            inputMode === "text_with_reference"
                              ? "text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {pageData?.tool?.inputMode?.textWithReference ||
                            "Describe&Ref"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInputMode("oc_character");
                            setReferenceSource("oc");
                            setUploadedImageUrl("");
                          }}
                          className={cn(
                            "px-2 py-2 text-xs font-medium rounded-md transition-colors z-10",
                            inputMode === "oc_character"
                              ? "text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {pageData?.tool?.inputMode?.ocCharacter || "OC"}
                        </button>
                      </div>
                    </div>

                    {/* 模式说明 */}
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 mb-4">
                      {inputMode === "text_with_reference" && (
                        <p>
                          {pageData?.tool?.inputMode?.textWithReferenceDesc ||
                            "Describe your action figure with text and upload a reference image for more detailed results."}
                        </p>
                      )}
                      {inputMode === "oc_character" && (
                        <p>
                          {pageData?.tool?.inputMode?.ocCharacterDesc ||
                            "Select your OC character to create personalized action figures."}
                        </p>
                      )}
                    </div>

                    {/* 文字描述 + 参考图模式 */}
                    {inputMode === "text_with_reference" && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Text Description
                          </Label>
                          <Textarea
                            placeholder={
                              pageData?.tool?.inputMode
                                ?.textWithReferencePlaceholder ||
                              "Describe your action figure in detail with pose, accessories, colors..."
                            }
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            rows={3}
                            className="resize-none"
                            disabled={rightPanelState.type === "processing"}
                          />
                        </div>
                        <div>
                          <ReferenceImageUpload
                            value={uploadedImageUrl ? [uploadedImageUrl] : []}
                            onChange={(urls) =>
                              setUploadedImageUrl(urls[0] || "")
                            }
                            disabled={
                              rightPanelState.type === "processing" ||
                              !supportsReferenceImage
                            }
                            disabledReason={
                              !supportsReferenceImage
                                ? pageData?.tool?.referenceImageNotSupported ||
                                  "This model does not support reference images"
                                : undefined
                            }
                            pageData={pageData}
                            maxImages={1}
                            onAuthError={handleReferenceUploadAuthError}
                          />
                        </div>
                      </div>
                    )}

                    {/* OC角色模式 */}
                    {inputMode === "oc_character" && (
                      <div className="space-y-3">
                        <CharacterSelector
                          value={selectedOCUuid}
                          onChange={(value) => {
                            const uuid = Array.isArray(value)
                              ? value[0]
                              : value;
                            setSelectedOCUuid(uuid || "");
                          }}
                          disabled={rightPanelState.type === "processing"}
                          pageData={pageData}
                          multiSelect={false}
                          maxSelection={1}
                        />
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Additional Details (Optional)
                          </Label>
                          <Textarea
                            placeholder={
                              pageData?.tool?.inputMode
                                ?.ocCharacterPlaceholder ||
                              "Add specific details about pose, accessories, or scene..."
                            }
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            rows={2}
                            className="resize-none"
                            disabled={rightPanelState.type === "processing"}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. 生成参数 */}
                  <div className="py-1">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label
                            htmlFor="visibility"
                            className="text-sm font-medium"
                          >
                            {pageData?.tool?.publicVisibility || "Visibility"}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {isPublic ? "Public" : "Private"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="visibility"
                            checked={isPublic}
                            onCheckedChange={(checked) => {
                              // checked=true -> Public; checked=false -> Private
                              if (!canUsePrivate && !checked) {
                                setLeftError(
                                  "Upgrade to a subscription plan to use private visibility"
                                );
                                return;
                              }
                              setIsPublic(checked);
                            }}
                            disabled={
                              rightPanelState.type === "processing" ||
                              (!canUsePrivate && isPublic)
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
                                    {pageData?.tool?.subscriptionTooltip ||
                                      "Private visibility is available for subscription members. Upgrade to unlock."}
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
                          <Label className="text-sm font-medium text-foreground">
                            {pageData?.tool?.batchSize || "Number of Images"}:
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            max: {maxBatchSize}
                          </p>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max={maxBatchSize}
                          value={batchSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value >= 1 && value <= maxBatchSize) {
                              setBatchSize(value);
                            }
                          }}
                          className="w-20 px-3 py-2 bg-background border border-input rounded-md text-sm text-center"
                          disabled={rightPanelState.type === "processing"}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {/* 结束参数滚动区 */}
            </div>

            {/* 底部按钮固定区 - 独立滚动 */}
            <div className="border-t border-border p-3 shrink-0">
              <div className="flex gap-2.5">
                {/* 重置按钮 */}
                <Button
                  onClick={handleReset}
                  variant="secondary"
                  className="w-10 h-9 flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors flex-shrink-0"
                  disabled={rightPanelState.type === "processing"}
                >
                  <RefreshCwIcon className="h-4 w-4" />
                </Button>
                {/* 生成按钮 */}
                <Button
                  size="default"
                  className="flex-1 h-10 text-base font-medium"
                  onClick={handleGenerate}
                  disabled={
                    !isLoggedIn ||
                    !selectedTemplate ||
                    !selectedModel ||
                    rightPanelState.type === "processing"
                  }
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <img
                        src={getCreamyCharacterUrl("meow_coin")}
                        alt="Credits"
                        className="w-5 h-5"
                      />
                      <span>{totalCredits} · </span>
                    </span>
                    <span>
                      {rightPanelState.type === "processing"
                        ? pageData?.tool?.generating || "Generating..."
                        : pageData?.tool?.generate || "Generate Figure"}
                    </span>
                  </span>
                </Button>
              </div>
              {leftError && (
                <div className="flex items-center gap-2 p-3 mt-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{leftError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧展示面板 - 响应式布局 */}
        <div className="flex-1 flex flex-col min-h-0 max-w-full">
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-3 flex flex-col">
              <div className="glass-card rounded-xl h-full flex flex-col overflow-hidden">
                <ResultsDisplayPanel>
                  {renderRightPanel()}
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
        // ActionFigureTool 不需要复用参数功能，保持简单
      />
    </>
  );
}
