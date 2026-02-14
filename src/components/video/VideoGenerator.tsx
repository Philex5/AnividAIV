"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { getCreamyCharacterUrl, getMemberBadgeUrl } from "@/lib/asset-loader";
import { useRouter } from "next/navigation";
import type { AIModel } from "@/lib/configs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useGenerationPolling,
  GenerationStatusResponse,
} from "@/hooks/useGenerationPolling";
import { toast } from "sonner";
import {
  validateGenerationType,
  VIDEO_GEN_TYPES,
  getGeneratorName,
} from "@/lib/generation-type-validator";
import {
  getVideoModels,
  getPromptMaxLength,
  getPromptMinLength,
} from "@/lib/configs";
import { VideoPlayerCard } from "./VideoPlayerCard";
import { VideoPreviewDialog } from "./VideoPreviewDialog";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import { ModelSelectorWithIcon } from "@/components/anime-generator/ModelSelectorWithIcon";
import { StyleSelectorCompact } from "@/components/anime-generator/StyleSelectorCompact";
import { CharacterSelector } from "@/components/anime-generator/CharacterSelector";
import { PromptInputSection } from "@/components/anime-generator/PromptInputSection";
import { ResultsDisplayPanel } from "@/components/anime-generator/ResultsDisplayPanel";
import { VideoExamplesWaterfall } from "@/components/video/VideoExamplesWaterfall";
import { ReferenceImageUpload } from "@/components/anime-generator/ReferenceImageUpload";
import { DynamicVideoParams } from "@/components/video/DynamicVideoParams";
import { RefreshCwIcon, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVideoExamples } from "@/lib/configs";
import { useVideoQuote } from "@/hooks/useVideoQuote";
import { useAppContext } from "@/contexts/app";
import {
  Kling30Panel,
  type Kling30Segment,
} from "@/components/video/panels/Kling30Panel";

const DEFAULT_RATIO_OPTIONS = ["1:1", "9:16", "16:9"];
const KLING30_MULTI_SHOT_MAX_DURATION = 15;
const KLING30_MULTI_SHOT_MIN_SEGMENT_DURATION = 3;
const KLING30_MULTI_SHOT_MAX_SEGMENT_DURATION = 12;
const KLING30_NON_MULTI_MIN_DURATION = 3;
const KLING30_NON_MULTI_MAX_DURATION = 15;

type Kling30VideoMode = "start_end_frame" | "multi_shot";
type Kling30ExampleSegment = {
  prompt?: string;
  duration?: number | string;
  duraiton?: number | string; // backward compatibility for legacy typo
};

type VideoExampleParameters = {
  model_id?: string;
  prompt?: string;
  style?: string;
  motion?: string;
  ratio?: string;
  aspect_ratio?: string;
  resolution?: string;
  duration?: number | string;
  duration_seconds?: number | string;
  mode?: "std" | "pro";
  sound?: boolean;
  video_mode?: "standard" | Kling30VideoMode;
  multi_shots?: boolean;
  multi_prompt?: Kling30ExampleSegment[];
  reference_image_url?: string;
  reference_image_urls?: string[];
};
// 认证错误处理
const handleAuthError = () => {
  if (typeof window !== "undefined") {
    window.location.href =
      "/auth/signin?callbackUrl=" +
      encodeURIComponent(window.location.pathname);
  }
};

interface VideoGeneratorProps {
  className?: string;
  pageData: AnimeGeneratorPage;
  genVideoId?: string;
  characterUuid?: string;
  refImageUrl?: string;
  isLoggedIn?: boolean;
  initialCanUsePrivate?: boolean;
  initialModelId?: string;
  examples?: any[]; // 新增：模型专用示例配置（可选）
}

export function VideoGenerator({
  className,
  pageData,
  genVideoId,
  characterUuid: propCharacterUuid,
  refImageUrl: propRefImageUrl,
  isLoggedIn = false,
  initialCanUsePrivate = false,
  initialModelId,
  examples, // 新增：模型专用示例配置（可选）
}: VideoGeneratorProps) {
  const [videoModels, setVideoModels] = useState<AIModel[]>([]);
  const [videoExamples, setVideoExamples] = useState<any[]>([]);

  useEffect(() => {
    getVideoModels().then((models) => {
      setVideoModels(models);
      // 如果有 initialModelId，使用它；否则如果没有设置模型ID且有可用模型，则自动设置为第一个模型
      if (initialModelId) {
        setModelId(initialModelId);
        // 当有预设模型时，风格默认为 "no_presets"
        setStyle("no_presets");
      } else if (!modelId && models.length > 0) {
        setModelId(models[0].model_id);
      }
    });
    // 使用传入的 examples 或默认的视频示例
    if (examples) {
      setVideoExamples(examples);
    } else {
      getVideoExamples().then(setVideoExamples);
    }
  }, [initialModelId, examples]);

  const defaultVideoModel = videoModels[0];

  // 使用路由器进行URL管理
  const router = useRouter();

  // 使用 AppContext 获取用户信息
  const { user, isLoadingUser } = useAppContext();

  // 使用useRef跟踪已处理的参数，防止重复执行
  const processedParamsRef = useRef<{
    genVideoId?: string;
    characterUuid?: string;
    refImageUrl?: string;
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

  // 使用翻译系统 - VideoGenerator 主要使用 style 翻译
  // species, personality, accessories 在视频生成中不需要特殊翻译

  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(
    () => defaultVideoModel?.model_id || "",
  );
  const [ratio, setRatio] = useState(() => {
    if (defaultVideoModel?.supported_ratios?.length) {
      return defaultVideoModel.supported_ratios[0];
    }
    return DEFAULT_RATIO_OPTIONS[0];
  });
  const [modelParams, setModelParams] = useState<Record<string, any>>({});
  const [kling30Mode, setKling30Mode] =
    useState<Kling30VideoMode>("start_end_frame");
  const [startFrameImage, setStartFrameImage] = useState<string[]>([]);
  const [endFrameImage, setEndFrameImage] = useState<string[]>([]);
  const [multiShotSegments, setMultiShotSegments] = useState<Kling30Segment[]>([
    { prompt: "", duration: 5 },
  ]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [characterUuid, setCharacterUuid] = useState<string>("");
  const [motion, setMotion] = useState("");
  const [style, setStyle] = useState("");
  const [visibilityLevel, setVisibilityLevel] = useState<"public" | "private">(
    "private",
  );

  // 根据用户订阅状态设置默认 visibility（仅初始化一次）
  useEffect(() => {
    if (isLoadingUser || hasInitializedVisibilityRef.current) {
      return;
    }

    hasInitializedVisibilityRef.current = true;
    setVisibilityLevel(canUsePrivate ? "private" : "public");
  }, [canUsePrivate, isLoadingUser]);

  // 非订阅用户强制 Public
  useEffect(() => {
    if (isLoadingUser || canUsePrivate) {
      return;
    }

    if (visibilityLevel !== "public") {
      setVisibilityLevel("public");
    }
  }, [canUsePrivate, isLoadingUser, visibilityLevel]);

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [results, setResults] = useState<
    GenerationStatusResponse["results"] | undefined
  >(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  // Reuse data loading state
  const [isLoadingReuseData, setIsLoadingReuseData] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pendingExampleParamsRef = useRef<VideoExampleParameters | null>(null);
  const initializedModelIdRef = useRef<string>("");

  // Video preview dialog state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideoUuid, setSelectedVideoUuid] = useState<string | null>(
    null,
  );
  const [isVideoOwner, setIsVideoOwner] = useState<boolean>(false);

  const selectedModel = useMemo(
    () =>
      videoModels.find((model) => model.model_id === modelId) ||
      defaultVideoModel,
    [videoModels, modelId, defaultVideoModel],
  );

  // Prompt length limits from model configuration
  const promptMaxLength = useMemo(() => {
    return getPromptMaxLength(selectedModel);
  }, [selectedModel]);

  const promptMinLength = useMemo(() => {
    return getPromptMinLength(selectedModel);
  }, [selectedModel]);

  const formatPromptMessage = (
    template: string | undefined,
    values: Record<string, number>,
  ) => {
    if (!template) return "";
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        return String(values[key]);
      }
      return match;
    });
  };

  const isKling30Selected = useMemo(() => {
    return selectedModel?.model_id === "kling-3.0/video";
  }, [selectedModel]);

  const supportsMultiShotMode = isKling30Selected;

  const supportsOcAndReference = useMemo(() => {
    return (
      selectedModel?.config?.image_params?.supports_oc_and_reference ?? true
    );
  }, [selectedModel]);

  const maxReferenceImages = useMemo(() => {
    const configured = Number(
      selectedModel?.config?.image_params?.max_images ?? 1,
    );
    if (!Number.isFinite(configured) || configured < 0) {
      return 1;
    }
    return configured;
  }, [selectedModel]);

  const effectiveReferenceImages = useMemo(() => {
    if (!isKling30Selected) {
      return referenceImages;
    }
    if (kling30Mode === "multi_shot") {
      return [startFrameImage[0]].filter(Boolean) as string[];
    }
    return [startFrameImage[0], endFrameImage[0]].filter(Boolean) as string[];
  }, [
    isKling30Selected,
    kling30Mode,
    startFrameImage,
    endFrameImage,
    referenceImages,
  ]);

  const isMultiShotMode = supportsMultiShotMode && kling30Mode === "multi_shot";

  const isReferenceDisabled = useMemo(() => {
    if (isKling30Selected) {
      return false;
    }
    if (maxReferenceImages === 0) {
      return true;
    }
    return !supportsOcAndReference && !!characterUuid;
  }, [
    isKling30Selected,
    maxReferenceImages,
    supportsOcAndReference,
    characterUuid,
  ]);

  const referenceDisabledReason = useMemo(() => {
    if (!isReferenceDisabled) return undefined;
    return (
      pageData?.reference?.["disabled-oc-selected"] ||
      "Current model supports only one image. OC portrait is already selected, so reference image upload is disabled."
    );
  }, [isReferenceDisabled, pageData]);

  const ratioOptions =
    selectedModel?.supported_ratios && selectedModel.supported_ratios.length > 0
      ? selectedModel.supported_ratios
      : DEFAULT_RATIO_OPTIONS;

  const buildModelDefaultParams = useCallback((model?: AIModel) => {
    const defaults: Record<string, any> = {};
    model?.ui_config?.params?.forEach((param) => {
      defaults[param.key] = param.default;
    });
    return defaults;
  }, []);

  const toFiniteNumber = useCallback((value: unknown) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const normalizeExampleSegments = useCallback(
    (segments?: Kling30ExampleSegment[]) => {
      if (!Array.isArray(segments)) return [];
      return segments
        .map((segment) => {
          const promptText =
            typeof segment?.prompt === "string" ? segment.prompt.trim() : "";
          const durationValue = toFiniteNumber(
            segment?.duration ?? segment?.duraiton,
          );
          return {
            prompt: promptText,
            duration: durationValue ?? 5,
          };
        })
        .filter((segment) => segment.prompt.length > 0);
    },
    [toFiniteNumber],
  );

  const applyExampleParameters = useCallback(
    (rawParams: VideoExampleParameters, modelForDefaults?: AIModel) => {
      const params = rawParams || {};
      const promptText = typeof params.prompt === "string" ? params.prompt : "";
      const aspectRatio =
        typeof params.aspect_ratio === "string"
          ? params.aspect_ratio
          : typeof params.ratio === "string"
            ? params.ratio
            : undefined;
      const normalizedDuration = toFiniteNumber(
        params.duration_seconds ?? params.duration,
      );
      const normalizedSegments = normalizeExampleSegments(params.multi_prompt);
      const mergedReferenceImages = Array.from(
        new Set(
          [
            ...(Array.isArray(params.reference_image_urls)
              ? params.reference_image_urls
              : []),
            typeof params.reference_image_url === "string"
              ? params.reference_image_url
              : undefined,
          ].filter((url): url is string => Boolean(url)),
        ),
      );

      const targetModelId =
        params.model_id || modelForDefaults?.model_id || modelId;
      const isKling30Params = targetModelId === "kling-3.0/video";
      const shouldEnableMultiShot =
        params.multi_shots === true ||
        params.video_mode === "multi_shot" ||
        normalizedSegments.length > 1;

      setPrompt(promptText);
      if (aspectRatio) {
        setRatio(aspectRatio);
      }
      if (typeof params.motion === "string") {
        setMotion(params.motion);
      }
      if (typeof params.style === "string") {
        setStyle(params.style);
      }

      const nextModelParams = {
        ...buildModelDefaultParams(modelForDefaults || selectedModel),
      };

      if (aspectRatio) {
        nextModelParams.aspect_ratio = aspectRatio;
        nextModelParams.aspectRatio = aspectRatio;
      }
      if (typeof params.resolution === "string") {
        nextModelParams.resolution = params.resolution;
      }
      if (normalizedDuration !== undefined) {
        const durationAsString = String(normalizedDuration);
        nextModelParams.duration = durationAsString;
        nextModelParams.duration_seconds = durationAsString;
      }
      if (params.mode === "std" || params.mode === "pro") {
        nextModelParams.mode = params.mode;
      }
      if (typeof params.sound === "boolean") {
        nextModelParams.sound = params.sound;
      }
      if (isKling30Params) {
        nextModelParams.multi_shots = shouldEnableMultiShot;
        nextModelParams.video_mode = shouldEnableMultiShot
          ? "multi_shot"
          : "start_end_frame";
        if (shouldEnableMultiShot) {
          nextModelParams.sound = true;
        }
      }
      setModelParams(nextModelParams);

      if (isKling30Params) {
        setReferenceImages([]);
        setCharacterUuid("");

        if (shouldEnableMultiShot) {
          setKling30Mode("multi_shot");
          setStartFrameImage(
            mergedReferenceImages[0] ? [mergedReferenceImages[0]] : [],
          );
          setEndFrameImage([]);

          if (normalizedSegments.length > 0) {
            setMultiShotSegments(normalizedSegments);
            if (!promptText && normalizedSegments[0]?.prompt) {
              setPrompt(normalizedSegments[0].prompt);
            }
          } else {
            setMultiShotSegments([{ prompt: promptText, duration: 5 }]);
          }
          return;
        }

        setKling30Mode("start_end_frame");
        setStartFrameImage(
          mergedReferenceImages[0] ? [mergedReferenceImages[0]] : [],
        );
        setEndFrameImage(
          mergedReferenceImages[1] ? [mergedReferenceImages[1]] : [],
        );
        setMultiShotSegments([
          { prompt: promptText, duration: normalizedDuration ?? 5 },
        ]);
        return;
      }

      setKling30Mode("start_end_frame");
      setStartFrameImage([]);
      setEndFrameImage([]);
      setReferenceImages(mergedReferenceImages);
      setMultiShotSegments([
        { prompt: promptText, duration: normalizedDuration ?? 5 },
      ]);
    },
    [
      buildModelDefaultParams,
      modelId,
      normalizeExampleSegments,
      selectedModel,
      toFiniteNumber,
    ],
  );

  const { isPolling } = useGenerationPolling({
    generationId,
    generationType: "video",
    onCompleted: (r) => {
      console.log("[VideoGenerator] Generation completed", {
        generation_uuid: generationId,
        results_count: r.length,
        video_urls: r.map((item) => item.image_url),
      });
      // Stop polling immediately by clearing generationId
      setGenerationId(null);
      setResults(r);
      setIsVideoOwner(true); // New generation is always owned by current user
      setError(null);
      setIsSubmitting(false);
      submitLockRef.current = false;
    },
    onFailed: (msg) => {
      const err =
        msg || pageData?.errors?.generation_failed || "Generation failed";
      console.error("[VideoGenerator] Generation failed", {
        generation_uuid: generationId,
        error: err,
      });
      // Stop polling immediately by clearing generationId
      setGenerationId(null);
      setError(err);
      setIsSubmitting(false);
      submitLockRef.current = false;
      toast.error(err);
    },
    onTimeout: () => {
      const timeoutErr =
        pageData?.errors?.generation_timeout || "Generation timeout";
      console.error("[VideoGenerator] Generation timeout", {
        generation_uuid: generationId,
        error: timeoutErr,
      });
      // Stop polling immediately by clearing generationId
      setGenerationId(null);
      setError(timeoutErr);
      setIsSubmitting(false);
      submitLockRef.current = false;
      toast.error(timeoutErr);
    },
  });

  // 初始化模型参数
  useEffect(() => {
    if (!selectedModel) return;

    setRatio((prevRatio) => {
      if (ratioOptions.length > 0 && !ratioOptions.includes(prevRatio)) {
        return ratioOptions[0];
      }
      return prevRatio;
    });

    if (initializedModelIdRef.current === selectedModel.model_id) {
      return;
    }
    initializedModelIdRef.current = selectedModel.model_id;
    setModelParams(buildModelDefaultParams(selectedModel));
  }, [selectedModel, ratioOptions, buildModelDefaultParams]);

  useEffect(() => {
    const pendingParams = pendingExampleParamsRef.current;
    if (!pendingParams || !selectedModel) {
      return;
    }

    if (
      pendingParams.model_id &&
      pendingParams.model_id !== selectedModel.model_id
    ) {
      return;
    }

    applyExampleParameters(pendingParams, selectedModel);
    pendingExampleParamsRef.current = null;
  }, [selectedModel, applyExampleParameters]);

  useEffect(() => {
    if (!isKling30Selected) {
      setKling30Mode("start_end_frame");
    }
  }, [isKling30Selected]);

  useEffect(() => {
    if (isKling30Selected) return;
    if (isReferenceDisabled && referenceImages.length > 0) {
      setReferenceImages([]);
      toast.info(
        pageData?.reference?.["cleared-by-oc"] ||
          "Reference image cleared because OC was selected and current model supports only one image.",
      );
    }
  }, [
    isKling30Selected,
    isReferenceDisabled,
    referenceImages.length,
    pageData,
  ]);

  useEffect(() => {
    if (isKling30Selected) return;
    if (referenceImages.length <= maxReferenceImages) {
      return;
    }
    setReferenceImages(referenceImages.slice(0, maxReferenceImages));
    toast.info(
      pageData?.reference?.["trimmed-by-limit"] ||
        `Only ${maxReferenceImages} reference image(s) are supported by current settings.`,
    );
  }, [isKling30Selected, referenceImages, maxReferenceImages, pageData]);

  useEffect(() => {
    if (isKling30Selected) return;
    if (characterUuid && style !== "no_presets") {
      setStyle("no_presets");
    }
  }, [isKling30Selected, characterUuid, style]);

  useEffect(() => {
    if (!isKling30Selected) {
      return;
    }
    setModelParams((prev) => ({
      ...prev,
      multi_shots: kling30Mode === "multi_shot",
      ...(kling30Mode === "multi_shot" ? { sound: true } : {}),
    }));
  }, [isKling30Selected, kling30Mode]);

  // Mark component as mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleModelParamChange = useCallback((key: string, value: any) => {
    setModelParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resolveDurationSeconds = useCallback((params: Record<string, any>) => {
    const rawDuration = params.duration_seconds ?? params.duration;
    if (
      rawDuration === undefined ||
      rawDuration === null ||
      rawDuration === ""
    ) {
      return undefined;
    }

    const parsed = Number(rawDuration);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const submit = useCallback(async () => {
    const trimmedPrompt = prompt?.trim() || "";
    const sanitizedSegments = multiShotSegments
      .map((segment) => ({
        prompt: segment.prompt.trim(),
        duration: Number(segment.duration),
      }))
      .filter(
        (segment) =>
          segment.prompt.length > 0 && Number.isFinite(segment.duration),
      );
    const fallbackPrompt = sanitizedSegments[0]?.prompt || "";
    const finalPrompt = trimmedPrompt || fallbackPrompt;

    if (!finalPrompt) return;

    if (isMultiShotMode && sanitizedSegments.length < 1) {
      const message =
        pageData?.errors?.["multi-shot-min-segments"] ||
        "Multi-shot mode requires at least 1 prompt segment.";
      setError(message);
      toast.error(message);
      return;
    }

    if (isMultiShotMode) {
      if (effectiveReferenceImages.length < 1) {
        const message =
          pageData?.errors?.["multi-shot-start-frame-required"] ||
          "Multi-shot mode requires a start frame image.";
        setError(message);
        toast.error(message);
        return;
      }

      const hasInvalidSegmentDuration = sanitizedSegments.some(
        (segment) =>
          segment.duration < KLING30_MULTI_SHOT_MIN_SEGMENT_DURATION ||
          segment.duration > KLING30_MULTI_SHOT_MAX_SEGMENT_DURATION,
      );
      if (hasInvalidSegmentDuration) {
        const message =
          pageData?.errors?.["multi-shot-segment-duration-invalid"] ||
          `Each multi-shot segment duration must be between ${KLING30_MULTI_SHOT_MIN_SEGMENT_DURATION} and ${KLING30_MULTI_SHOT_MAX_SEGMENT_DURATION} seconds.`;
        setError(message);
        toast.error(message);
        return;
      }

      const totalDuration = sanitizedSegments.reduce(
        (sum, segment) => sum + segment.duration,
        0,
      );
      if (
        totalDuration < KLING30_MULTI_SHOT_MIN_SEGMENT_DURATION ||
        totalDuration > KLING30_MULTI_SHOT_MAX_DURATION
      ) {
        const message =
          pageData?.errors?.["multi-shot-duration-exceeded"] ||
          `Total multi-shot duration must be between ${KLING30_MULTI_SHOT_MIN_SEGMENT_DURATION} and ${KLING30_MULTI_SHOT_MAX_DURATION} seconds.`;
        setError(message);
        toast.error(message);
        return;
      }
    }

    if (promptMaxLength && finalPrompt.length > promptMaxLength) {
      const message = formatPromptMessage(pageData?.prompt?.counter_too_long, {
        current: finalPrompt.length,
        max: promptMaxLength,
        min: promptMinLength,
      });
      setError(message);
      toast.error(message);
      return;
    }
    if (promptMinLength && finalPrompt.length < promptMinLength) {
      const message = formatPromptMessage(pageData?.prompt?.counter_too_short, {
        current: finalPrompt.length,
        max: promptMaxLength,
        min: promptMinLength,
      });
      setError(message);
      toast.error(message);
      return;
    }
    if (isPolling || isSubmitting || submitLockRef.current) return;

    // 检查并重置URL中的search params（如果存在）
    const currentUrl = new URL(window.location.href);
    const paramsToReset = ["gen_video_id", "ref_image_url", "character_uuid"];
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

    setError(null);
    setResults(undefined);
    setIsVideoOwner(false); // Reset owner status for new generation
    setIsSubmitting(true);
    submitLockRef.current = true;

    // 动态确定任务子类型：有参考图或角色图时使用image_to_video
    const hasImages =
      effectiveReferenceImages.length > 0 ||
      (!isKling30Selected && !!characterUuid);
    const taskSubtype = hasImages ? "image_to_video" : "text_to_video";

    const singleCardDuration = Number(multiShotSegments[0]?.duration || 5);
    const durationSeconds =
      isKling30Selected && !isMultiShotMode
        ? singleCardDuration
        : resolveDurationSeconds(modelParams);

    if (
      isKling30Selected &&
      !isMultiShotMode &&
      (durationSeconds === undefined ||
        durationSeconds < KLING30_NON_MULTI_MIN_DURATION ||
        durationSeconds > KLING30_NON_MULTI_MAX_DURATION)
    ) {
      const message =
        pageData?.errors?.["kling-duration-invalid"] ||
        `Kling 3.0 duration must be between ${KLING30_NON_MULTI_MIN_DURATION} and ${KLING30_NON_MULTI_MAX_DURATION} seconds.`;
      setError(message);
      toast.error(message);
      return;
    }

    const requestParams = {
      prompt: finalPrompt,
      model_id: modelId,
      task_subtype: taskSubtype,
      video_mode: isKling30Selected ? kling30Mode : undefined,
      duration: durationSeconds,
      duration_seconds: durationSeconds,
      aspect_ratio:
        modelParams.aspect_ratio || modelParams.aspectRatio || ratio,
      resolution: modelParams.resolution,
      mode: modelParams.mode,
      multi_shots: isMultiShotMode,
      multi_prompt: isMultiShotMode ? sanitizedSegments : undefined,
      sound: isMultiShotMode
        ? true
        : typeof modelParams.sound === "boolean"
          ? modelParams.sound
          : undefined,
      motion,
      style_preset: style,
      reference_image_url:
        effectiveReferenceImages.length === 1
          ? effectiveReferenceImages[0]
          : undefined,
      reference_image_urls:
        effectiveReferenceImages.length > 0
          ? effectiveReferenceImages
          : undefined,
      character_uuid: isKling30Selected
        ? undefined
        : characterUuid || undefined,
      visibility_level: visibilityLevel,
      model_params: modelParams,
    };

    console.log("[VideoGenerator] Submit: Creating video task", {
      model: modelId,
      duration: requestParams.duration,
      ratio: requestParams.aspect_ratio,
      hasReference: !!requestParams.reference_image_url,
      promptLength: finalPrompt.length,
      video_mode: requestParams.video_mode,
    });

    try {
      const startTime = Date.now();
      const res = await fetch("/api/anime-video/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestParams),
      });

      const data = await res.json();
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        console.error("[VideoGenerator] Submit: API request failed", {
          status: res.status,
          error: data.error,
          duration: `${duration}ms`,
        });
        throw new Error(data.error || "Failed to create task");
      }

      const generationUuid = data.data.generation_uuid;
      console.log("[VideoGenerator] Submit: Task created successfully", {
        generation_uuid: generationUuid,
        credits_cost: data.data.credits_cost,
        estimated_time: data.data.estimated_time,
        duration: `${duration}ms`,
      });

      setGenerationId(generationUuid);
    } catch (e: any) {
      const errorMsg =
        e.message || pageData?.errors?.create_failed || "Failed to create task";
      console.error("[VideoGenerator] Submit: Exception occurred", {
        error: errorMsg,
        stack: e.stack,
      });
      setError(errorMsg);
      toast.error(errorMsg);
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  }, [
    prompt,
    modelId,
    modelParams,
    resolveDurationSeconds,
    ratio,
    motion,
    style,
    effectiveReferenceImages,
    multiShotSegments,
    isMultiShotMode,
    kling30Mode,
    isKling30Selected,
    characterUuid,
    visibilityLevel,
    isPolling,
    isSubmitting,
    pageData,
    promptMaxLength,
    promptMinLength,
    formatPromptMessage,
  ]);

  const handleReset = useCallback(() => {
    setPrompt("");
    const baseModel = videoModels[0];
    setModelId(baseModel?.model_id || "");
    if (baseModel?.supported_ratios?.length) {
      setRatio(baseModel.supported_ratios[0]);
    } else {
      setRatio(DEFAULT_RATIO_OPTIONS[0]);
    }

    // 重置模型参数
    if (baseModel?.ui_config?.params) {
      const initialParams: Record<string, any> = {};
      baseModel.ui_config.params.forEach((param) => {
        initialParams[param.key] = param.default;
      });
      setModelParams(initialParams);
    } else {
      setModelParams({});
    }

    setMotion("");
    setStyle("");
    setReferenceImages([]);
    setStartFrameImage([]);
    setEndFrameImage([]);
    setKling30Mode("start_end_frame");
    setMultiShotSegments([{ prompt: "", duration: 5 }]);
    setCharacterUuid("");
    setVisibilityLevel("private");
    setGenerationId(null); // Stop any active polling
    setResults(undefined);
    setError(null);
    setIsSubmitting(false);
    setIsVideoOwner(false); // Reset owner status
    submitLockRef.current = false;
  }, [videoModels]);

  // Handle video detail viewing
  const handleViewVideoDetails = useCallback(
    async (videoUuid: string) => {
      try {
        const response = await fetch(`/api/generation/video/${videoUuid}`);
        const data = await response.json();

        // 未登录或无用户信息直接拒绝
        if (!user?.uuid) {
          console.warn(
            "[VideoGenerator] User not logged in, cannot view video details",
          );
          toast.error(
            pageData?.errors?.auth_required ||
              "Please log in to view video details",
          );
          return;
        }

        // 对比 user_uuid
        if (data.data?.generation?.user_uuid !== user.uuid) {
          console.warn("[VideoGenerator] User is not the owner of this video");
          toast.error(
            pageData?.errors?.no_permission ||
              "You don't have permission to view this video",
          );
          return;
        }

        console.log(
          "[VideoGenerator] Opening video details dialog for:",
          videoUuid,
        );
        setSelectedVideoUuid(videoUuid);
        setVideoDialogOpen(true);
      } catch (error) {
        console.error("Failed to verify ownership:", error);
        toast.error(
          pageData?.errors?.load_video_failed || "Failed to load video details",
        );
      }
    },
    [user?.uuid, pageData?.errors],
  );

  // Handle video parameter reuse
  // Load reuse data from video UUID
  const loadReuseData = useCallback(
    async (videoId: string) => {
      if (!videoId) return;

      setIsLoadingReuseData(true);
      setError(null);

      try {
        const response = await fetch(`/api/generation/video/${videoId}`);

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated
            setError(
              pageData.errors?.["not-authenticated"] ||
                "Please log in to access this video",
            );
            return;
          }
          if (response.status === 403) {
            // No permission to access
            setError(
              pageData.errors?.["no-permission"] ||
                "You don't have permission to access this video",
            );
            return;
          }
          if (response.status === 404) {
            setError(pageData.errors?.["not-found"] || "Video not found");
            return;
          }
          throw new Error("Failed to load video data");
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error("Invalid video data");
        }

        const videoData = result.data;

        // 检查是否为 owner（用于控制 Detail 按钮显示）
        const isOwner = Boolean(
          user?.uuid && videoData.generation?.user_uuid === user.uuid,
        );
        setIsVideoOwner(isOwner);

        // 验证 gen_type 是否匹配
        if (
          !validateGenerationType(
            videoData.gen_type,
            VIDEO_GEN_TYPES.ANIME_VIDEO,
          )
        ) {
          const actualGenType = videoData.gen_type || "unknown";
          const correctGeneratorName = getGeneratorName(actualGenType);

          const message = `This video was generated in ${correctGeneratorName}. Please use the correct generator to reuse its parameters.`;
          toast.error(message);
          setError(message);

          // 清空 URL 参数
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("gen_video_id");
          router.replace(currentUrl.pathname + currentUrl.search, {
            scroll: false,
          });

          return;
        }

        console.log("[VideoGenerator] Loading reuse data:", {
          video_uuid: videoId,
          has_prompt: !!videoData.original_prompt,
          has_style: !!videoData.style,
          has_character: !!videoData.characters?.length,
          has_reference: !!videoData.generation?.reference_image_url,
        });

        // Restore prompt
        if (videoData.original_prompt) {
          setPrompt(videoData.original_prompt || "");
        }

        // Restore model
        if (videoData.generation?.model_id) {
          setModelId(videoData.generation.model_id);
        }
        const isReuseKling30 =
          videoData.generation?.model_id === "kling-3.0/video";

        // Restore style
        if (videoData.style) {
          setStyle(videoData.style);
        } else if (videoData.generation?.style_preset) {
          setStyle(videoData.generation.style_preset);
        }

        // Parse generation params for additional parameters
        if (videoData.generation_params) {
          try {
            const params = JSON.parse(videoData.generation_params);

            // Restore ratio
            if (params.aspect_ratio || params.ratio) {
              setRatio(params.aspect_ratio || params.ratio);
            }

            // Restore motion
            if (params.motion) {
              setMotion(params.motion);
            }

            // Restore reference image
            const restoredReferenceImages =
              Array.isArray(params.reference_image_urls) &&
              params.reference_image_urls.length > 0
                ? params.reference_image_urls
                : params.reference_image_url
                  ? [params.reference_image_url]
                  : videoData.generation?.reference_image_url
                    ? [videoData.generation.reference_image_url]
                    : [];

            if (isReuseKling30) {
              if (params.video_mode === "multi_shot" || params.multi_shots) {
                setKling30Mode("multi_shot");
                setStartFrameImage(
                  restoredReferenceImages[0]
                    ? [restoredReferenceImages[0]]
                    : [],
                );
                setEndFrameImage([]);
              } else {
                setKling30Mode("start_end_frame");
                setStartFrameImage(
                  restoredReferenceImages[0]
                    ? [restoredReferenceImages[0]]
                    : [],
                );
                setEndFrameImage(
                  restoredReferenceImages[1]
                    ? [restoredReferenceImages[1]]
                    : [],
                );
              }
            } else {
              setReferenceImages(restoredReferenceImages);
              if (params.character_uuid) {
                setCharacterUuid(params.character_uuid);
              } else if (videoData.characters?.length > 0) {
                setCharacterUuid(videoData.characters[0].uuid);
              }
            }

            // Restore visibility
            if (params.visibility_level) {
              setVisibilityLevel(params.visibility_level);
            }

            // Restore model-specific parameters
            const newModelParams: Record<string, any> = {};
            if (params.duration_seconds || params.duration) {
              const durationValue = (
                params.duration_seconds || params.duration
              ).toString();
              newModelParams.duration_seconds = durationValue;
              newModelParams.duration = durationValue;
            }
            if (params.resolution || videoData.resolution) {
              newModelParams.resolution =
                params.resolution || videoData.resolution;
            }
            if (params.mode) {
              newModelParams.mode = params.mode;
            }
            if (typeof params.multi_shots === "boolean") {
              newModelParams.multi_shots = params.multi_shots;
            }
            if (Array.isArray(params.multi_prompt)) {
              const restoredSegments = params.multi_prompt
                .map((segment: any) => ({
                  prompt:
                    typeof segment?.prompt === "string" ? segment.prompt : "",
                  duration: Number(segment?.duration) || 5,
                }))
                .filter(
                  (segment: Kling30Segment) => segment.prompt.trim().length > 0,
                );
              if (restoredSegments.length > 0) {
                setMultiShotSegments(restoredSegments);
              }
            }
            if (Object.keys(newModelParams).length > 0) {
              setModelParams((prev) => ({ ...prev, ...newModelParams }));
            }
          } catch (e) {
            console.warn("Failed to parse generation params:", e);
          }
        }

        // Display the loaded video as result
        const videoResult = {
          uuid: videoData.uuid,
          image_uuid: videoData.uuid, // video uuid serves as image_uuid for videos
          image_url: videoData.variants?.[0]?.video_url || "",
          poster_url: videoData.poster_url,
          created_at: videoData.created_at,
          generation_uuid: videoData.generation.uuid,
          image_index: 1,
        };

        setResults([videoResult]);
      } catch (error: any) {
        console.error("Failed to load reuse data:", error);
        setError(
          pageData.errors?.["load-video-failed"] ||
            error.message ||
            "Failed to load video data",
        );
        toast.error(
          pageData.toast?.["reuse-failed"] || "Failed to load video parameters",
        );
      } finally {
        setIsLoadingReuseData(false);
      }
    },
    [pageData, user?.uuid],
  );

  // Handle video parameter reuse (for dialog)
  const handleReuseVideoParameters = useCallback(
    async (videoUuid: string) => {
      await loadReuseData(videoUuid);
    },
    [loadReuseData],
  );

  // Handle search params
  useEffect(() => {
    if (!isMounted) return;

    // Check if user is logged in for protected operations
    if (!isLoggedIn && (genVideoId || propCharacterUuid || propRefImageUrl)) {
      setError(
        pageData.errors?.["auth-required"] ||
          "Please log in to access these features",
      );
      return;
    }

    // Helper function to check if a param was already processed
    const wasProcessed = (paramName: string, value?: string) => {
      if (!value) return false;
      return (
        processedParamsRef.current[
          paramName as keyof typeof processedParamsRef.current
        ] === value
      );
    };

    // Helper function to mark a param as processed
    const markProcessed = (paramName: string, value?: string) => {
      if (value) {
        processedParamsRef.current[
          paramName as keyof typeof processedParamsRef.current
        ] = value;
      }
    };

    // Process genVideoId
    if (genVideoId && !wasProcessed("genVideoId", genVideoId)) {
      console.log("Loading reuse data for genVideoId:", genVideoId);
      markProcessed("genVideoId", genVideoId);
      loadReuseData(genVideoId);
    }

    // Process characterUuid
    if (
      propCharacterUuid &&
      !wasProcessed("characterUuid", propCharacterUuid)
    ) {
      markProcessed("characterUuid", propCharacterUuid);
      if (isKling30Selected) {
        // Kling 3.0 面板不展示 OC，忽略该参数
      } else {
        setCharacterUuid(propCharacterUuid);
      }
    }

    // Process refImageUrl
    if (propRefImageUrl && !wasProcessed("refImageUrl", propRefImageUrl)) {
      console.log("Setting refImageUrl from search params:", propRefImageUrl);
      markProcessed("refImageUrl", propRefImageUrl);
      if (isKling30Selected) {
        setStartFrameImage([propRefImageUrl]);
      } else {
        setReferenceImages([propRefImageUrl]);
      }
    }
  }, [
    isMounted,
    isLoggedIn,
    genVideoId,
    propCharacterUuid,
    propRefImageUrl,
    loadReuseData,
    pageData,
    isKling30Selected,
  ]);

  const optimizePrompt = useCallback(
    async (inputPrompt: string): Promise<string> => {
      try {
        const response = await fetch("/api/anime-video/optimize-prompt", {
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
          console.error("API request failed:", response.status, errorData);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
      } catch (error) {
        console.error("Video prompt optimization failed:", error);
        toast.error(
          pageData?.errors?.optimize_failed || "Failed to optimize prompt",
        );
        throw error; // Re-throw error for UI component to handle
      }
    },
    [pageData],
  );

  const sources = useMemo(() => {
    if (!results) return [] as { url: string; quality?: string }[];
    return results.map((r) => ({ url: r.image_url, quality: undefined }));
  }, [results]);

  // Get the first video UUID for details viewing
  const firstVideoUuid = useMemo(() => {
    return results && results.length > 0 ? results[0].image_uuid : null;
  }, [results]);

  // 动态计算积分：根据是否有图片选择任务类型
  const quoteHasImages =
    effectiveReferenceImages.length > 0 ||
    (!isKling30Selected && !!characterUuid);
  const quoteTaskSubtype = quoteHasImages ? "image_to_video" : "text_to_video";
  const selectedDurationSeconds =
    isKling30Selected && !isMultiShotMode
      ? Number(multiShotSegments[0]?.duration || 5)
      : resolveDurationSeconds(modelParams);

  // 使用实时积分计算
  const {
    credits: quotedCredits,
    loading: quoteLoading,
    error: quoteError,
  } = useVideoQuote(
    {
      model_id: modelId,
      task_subtype: quoteTaskSubtype,
      duration_seconds: selectedDurationSeconds,
      resolution: modelParams.quality || modelParams.resolution,
      mode: modelParams.mode,
      video_mode: isKling30Selected ? kling30Mode : undefined,
      multi_shots: isMultiShotMode,
      sound: isMultiShotMode
        ? true
        : typeof modelParams.sound === "boolean"
          ? modelParams.sound
          : undefined,
      multi_prompt: isMultiShotMode ? multiShotSegments : undefined,
      aspect_ratio: (modelParams.aspect_ratio ||
        modelParams.aspectRatio ||
        ratio) as "1:1" | "9:16" | "16:9",
      reference_image_url:
        effectiveReferenceImages.length > 0
          ? effectiveReferenceImages[0]
          : undefined,
      reference_image_urls:
        effectiveReferenceImages.length > 0
          ? effectiveReferenceImages
          : undefined,
    },
    {
      enabled: !!modelId,
      debounceMs: 300,
    },
  );

  // 积分显示：优先使用实时计算结果，失败时使用基础积分
  const creditsPerVideo = useMemo(() => {
    if (quotedCredits !== null) {
      return quotedCredits;
    }
    // 回退到基础积分
    const currentModel = videoModels.find((m) => m.model_id === modelId);
    return currentModel?.credits_per_generation || 100;
  }, [quotedCredits, videoModels, modelId]);

  // 渲染右侧内容
  const renderRightContent = () => {
    // 复用数据加载中状态
    if (isLoadingReuseData) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">
              {pageData?.reuse?.loading || "Loading video parameters..."}
            </p>
            <p className="text-sm text-muted-foreground">
              {pageData?.reuse?.loading_desc ||
                "Preparing the selected video for reuse..."}
            </p>
          </div>
        </div>
      );
    }

    // 生成中状态
    if (isPolling || isSubmitting) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">
              {(pageData?.generating as any)?.title || "Generating Video..."}
            </p>
            <p className="text-sm text-muted-foreground">
              {(pageData?.generating as any)?.tip ||
                "Creating your anime video, this may take 3-5 minutes..."}
            </p>
          </div>
        </div>
      );
    }

    // 生成完成 - 显示结果
    if (results && results.length > 0) {
      return (
        <div className="flex-1 flex items-center justify-center p-1 min-h-0 overflow-y-auto">
          <VideoPlayerCard
            sources={sources}
            onViewDetails={
              firstVideoUuid && isVideoOwner
                ? () => handleViewVideoDetails(firstVideoUuid)
                : undefined
            }
          />
        </div>
      );
    }

    // 空状态 - 登录与未登录都展示示例视频瀑布流
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <VideoExamplesWaterfall
          examples={videoExamples}
          pageData={pageData}
          onExampleClick={(ex) => {
            const p = (ex.parameters || {}) as VideoExampleParameters;
            const resolvedTargetModel = videoModels.find(
              (model) => model.model_id === p.model_id,
            );
            const targetModelId = resolvedTargetModel?.model_id || modelId;
            const normalizedParams: VideoExampleParameters = {
              ...p,
              model_id: targetModelId,
            };

            if (targetModelId && targetModelId !== modelId) {
              pendingExampleParamsRef.current = normalizedParams;
              setModelId(targetModelId);
              return;
            }

            const targetModel =
              resolvedTargetModel ||
              videoModels.find((model) => model.model_id === targetModelId) ||
              selectedModel;
            applyExampleParameters(normalizedParams, targetModel);
          }}
          className="flex-1"
        />
      </div>
    );
  };

  return (
    <div className={cn("generator-ambient h-full w-full", className)}>
      <div
        id="video-generator"
        className="generator-ambient__content flex flex-col lg:flex-row lg:h-full lg:overflow-x-hidden prompt"
      >
        <h2 className="sr-only">
          {pageData?.title ?? "AI Anime Video Generator"}
        </h2>
        {/* 左侧：参数控制面板 */}
        <div className="w-full lg:w-96 xl:w-[28rem] 2xl:w-[32rem] lg:flex-shrink-0 p-3 lg:pr-2 overflow-x-hidden">
          <div className="glass-card flex flex-col lg:h-full rounded-xl overflow-hidden">
            {/* 滚动内容区域 - 移除滚动条，允许内容自适应高度 */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pt-3 pb-2 space-y-1.5 text-sm">
              {/* 模型选择 */}
              <div className="py-1">
                <ModelSelectorWithIcon
                  value={modelId}
                  onChange={setModelId}
                  disabled={isPolling || isSubmitting}
                  pageData={pageData}
                  modelType="text2video"
                />
              </div>

              {/* Prompt输入（Kling 3.0 在独立面板中渲染） */}
              {!isKling30Selected && (
                <div className="py-1">
                  <PromptInputSection
                    value={prompt}
                    onChange={setPrompt}
                    onOptimize={optimizePrompt}
                    disabled={isPolling || isSubmitting}
                    pageData={pageData}
                    maxLength={promptMaxLength}
                    minLength={promptMinLength}
                  />
                </div>
              )}

              {/* 样式选择 - 当有预设模型时隐藏 */}
              {!initialModelId && (
                <div className="py-1">
                  <StyleSelectorCompact
                    value={style}
                    onChange={setStyle}
                    disabled={isPolling || isSubmitting}
                    pageData={pageData}
                  />
                </div>
              )}

              {!isKling30Selected && (
                <>
                  <div className="py-1">
                    <CharacterSelector
                      value={characterUuid}
                      onChange={(v) =>
                        setCharacterUuid(
                          Array.isArray(v) ? v[0] : (v as string),
                        )
                      }
                      maxSelection={1}
                      multiSelect={false}
                      disabled={isPolling || isSubmitting}
                      pageData={pageData}
                    />
                  </div>
                  <div className="py-1">
                    <ReferenceImageUpload
                      value={referenceImages}
                      onChange={setReferenceImages}
                      disabled={
                        isPolling || isSubmitting || isReferenceDisabled
                      }
                      disabledReason={referenceDisabledReason}
                      pageData={pageData}
                      maxImages={maxReferenceImages}
                      onAuthError={handleAuthError}
                    />
                  </div>
                </>
              )}

              {isKling30Selected && (
                <div className="py-1">
                  <Kling30Panel
                    pageData={pageData}
                    disabled={isPolling || isSubmitting}
                    supportsMultiShot={supportsMultiShotMode}
                    soundEnabled={Boolean(modelParams.sound ?? true)}
                    isMultiShotMode={isMultiShotMode}
                    startFrameImage={startFrameImage}
                    endFrameImage={endFrameImage}
                    segments={multiShotSegments}
                    maxTotalDuration={KLING30_MULTI_SHOT_MAX_DURATION}
                    onAuthError={handleAuthError}
                    onSoundChange={(checked) =>
                      setModelParams((prev) => ({
                        ...prev,
                        sound: isMultiShotMode ? true : checked,
                      }))
                    }
                    onToggleMultiShot={(checked) =>
                      setKling30Mode((prevMode) => {
                        setModelParams((prev) => ({
                          ...prev,
                          sound: checked ? true : prev.sound,
                        }));
                        if (!checked) {
                          setMultiShotSegments((prevSegments) => {
                            const primary = prevSegments[0] || {
                              prompt: prompt || "",
                              duration: 5,
                            };
                            return [primary];
                          });
                          return "start_end_frame";
                        }
                        if (prevMode !== "multi_shot") {
                          setMultiShotSegments((prevSegments) => {
                            if (prevSegments.length > 0) return prevSegments;
                            return [{ prompt: prompt || "", duration: 5 }];
                          });
                        }
                        return "multi_shot";
                      })
                    }
                    onStartFrameChange={setStartFrameImage}
                    onEndFrameChange={setEndFrameImage}
                    onSegmentsChange={setMultiShotSegments}
                    onPrimaryPromptChange={setPrompt}
                  />
                </div>
              )}
              {/* 视频参数 */}
              <div className="py-1">
                <div className="space-y-4">
                  {/* 动态模型参数（包含 aspect_ratio） */}
                  {selectedModel && (
                    <DynamicVideoParams
                      model={selectedModel}
                      values={modelParams}
                      onChange={handleModelParamChange}
                      disabled={isPolling || isSubmitting}
                      pageData={pageData}
                    />
                  )}

                  {/* Visibility Level */}
                  <div className="flex items-center justify-between pt-1.5">
                    <div>
                      <Label className="text-sm font-medium">
                        {pageData?.parameters?.visibility || "Visibility"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {pageData?.parameters?.visibility_description ||
                          "Set generation visibility level"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {visibilityLevel === "public"
                          ? pageData?.image_detail?.visibility?.public ||
                            "Public"
                          : pageData?.image_detail?.visibility?.private ||
                            "Private"}
                      </span>
                      <Switch
                        checked={visibilityLevel === "public"}
                        onCheckedChange={(checked) => {
                          if (!canUsePrivate && !checked) {
                            toast.info(
                              pageData?.upgrade_prompts?.private_visibility ||
                                "Upgrade to a subscription plan to use private visibility",
                            );
                            return;
                          }
                          setVisibilityLevel(checked ? "public" : "private");
                        }}
                        disabled={
                          isPolling ||
                          isSubmitting ||
                          (!canUsePrivate && visibilityLevel === "public")
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
                                Private visibility is available for subscription
                                members. Upgrade to unlock.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 按钮区域 - 固定在底部 */}
            <div className="border-t border-border p-3 flex-shrink-0">
              <div className="flex gap-2.5">
                {/* 重置按钮 */}
                <Button
                  onClick={handleReset}
                  disabled={isPolling || isSubmitting}
                  variant="secondary"
                  className="w-10 h-9 flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors flex-shrink-0"
                >
                  <RefreshCwIcon className="h-4 w-4" />
                </Button>

                {/* 生成按钮 */}
                <Button
                  onClick={submit}
                  disabled={
                    isPolling ||
                    isSubmitting ||
                    (!prompt?.trim() &&
                      !(
                        isMultiShotMode &&
                        multiShotSegments.some((item) => item.prompt.trim())
                      ))
                  }
                  className="flex-1 h-10 text-base font-medium"
                >
                  <img
                    src={getCreamyCharacterUrl("meow_coin")}
                    alt="Credits"
                    className="w-5 h-5 mr-0"
                  />
                  <span>{quoteLoading ? "..." : creditsPerVideo} · </span>
                  {isPolling || isSubmitting ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      {pageData?.buttons?.generating || "Generating..."}
                    </>
                  ) : (
                    pageData?.buttons?.create_video || "Create Video"
                  )}
                </Button>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-2 p-3 mt-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircleIcon className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
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

        {/* Video Preview Dialog */}
        <VideoPreviewDialog
          open={videoDialogOpen}
          generationVideoUuid={selectedVideoUuid}
          onOpenChange={setVideoDialogOpen}
          pageData={pageData}
          onReuseParameters={handleReuseVideoParameters}
          onCreateNew={handleReset}
        />
      </div>
    </div>
  );
}
