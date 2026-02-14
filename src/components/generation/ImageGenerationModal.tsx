"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useModels, useStyles } from "@/lib/hooks/useConfigs";
import { resolvePromptTemplate } from "@/lib/prompt-template";
import {
  useGenerationPolling,
  GenerationStatusResponse,
} from "@/hooks/useGenerationPolling";
import type { AIModel, ConfigParameter } from "@/lib/configs";
import type {
  GeneratorModalCopy,
  QuantityConstraint,
  ResolutionConstraint,
  SelectOption,
  TranslateFn,
} from "./generation-modal-types";

interface ImageGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  genType: string;
  copy?: GeneratorModalCopy;
  className?: string;
  translate?: TranslateFn;
  model?: string | string[];
  style?: string | string[];
  quantity?: QuantityConstraint;
  resolution?: ResolutionConstraint;
  referenceUrl?: string;
  defaultPrompt?: string;
  promptTemplate?: string;
  templateParams?: Record<string, string | number | null | undefined>;
  hidePromptInput?: boolean;
  extraPayload?: Record<string, unknown>;
  onSuccess?: (
    results: GenerationStatusResponse["results"],
    generationId: string
  ) => void;
  onError?: (message: string) => void;
}

const DEFAULT_IMAGE_QUANTITY_RANGE = { min: 1, max: 4 };

const resolveConstraintValues = (constraint?: string | string[]) => {
  if (!constraint) return undefined;
  return Array.isArray(constraint) ? constraint : [constraint];
};

const buildQuantityOptions = (
  constraint: QuantityConstraint | undefined,
  fallback: { min: number; max: number }
) => {
  if (typeof constraint === "number") return [constraint];
  if (Array.isArray(constraint)) return constraint;
  const min = constraint?.min ?? fallback.min;
  const max = constraint?.max ?? fallback.max;
  const normalizedMin = Math.max(1, Math.min(min, max));
  const normalizedMax = Math.max(normalizedMin, max);
  return Array.from(
    { length: normalizedMax - normalizedMin + 1 },
    (_, index) => normalizedMin + index
  );
};

const mapModelsToOptions = (
  models: AIModel[],
  translate?: TranslateFn,
  allowedIds?: string[]
): SelectOption[] => {
  const filtered = allowedIds?.length
    ? models.filter((model) => allowedIds.includes(model.model_id))
    : models;

  return filtered.map((model) => ({
    value: model.model_id,
    label:
      (model.i18n_name_key && translate && translate(model.i18n_name_key)) ||
      model.name ||
      model.model_id,
  }));
};

const mapStylesToOptions = (
  styles: ConfigParameter[],
  translate?: TranslateFn,
  allowedIds?: string[]
): SelectOption[] => {
  const options = styles.map((style) => ({
    value: style.uuid || style.key || "",
    label:
      (style.i18n_name_key && translate && translate(style.i18n_name_key)) ||
      style.name ||
      style.key ||
      style.uuid ||
      "",
  }));

  if (!allowedIds?.length) return options;
  return options.filter((option) => allowedIds.includes(option.value));
};

export function ImageGenerationModal({
  open,
  onOpenChange,
  genType,
  copy,
  className,
  translate,
  model,
  style,
  quantity,
  resolution,
  referenceUrl,
  defaultPrompt,
  promptTemplate,
  templateParams,
  hidePromptInput,
  extraPayload,
  onSuccess,
  onError,
}: ImageGenerationModalProps) {
  const t = useTranslations("common_components.image_generation_modal");
  const resolvedCopy: GeneratorModalCopy = useMemo(
    () =>
      copy ?? {
        title: t("title"),
        description: t("description"),
        labels: {
          model: t("labels.model"),
          style: t("labels.style"),
          prompt: t("labels.prompt"),
          quantity: t("labels.quantity"),
          resolution: t("labels.resolution"),
          reference: t("labels.reference"),
          status: t("labels.status"),
          results: t("labels.results"),
        },
        placeholders: {
          model: t("placeholders.model"),
          style: t("placeholders.style"),
          prompt: t("placeholders.prompt"),
          resolution: t("placeholders.resolution"),
          reference: t("placeholders.reference"),
        },
        actions: {
          submit: t("actions.submit"),
          cancel: t("actions.cancel"),
        },
        status: {
          idle: t("status.idle"),
          submitting: t("status.submitting"),
          polling: t("status.polling"),
          completed: t("status.completed"),
          failed: t("status.failed"),
          emptyResults: t("status.empty_results"),
          loadingOptions: t("status.loading_options"),
          loadFailed: t("status.load_failed"),
        },
        errors: {
          missingPrompt: t("errors.missing_prompt"),
          missingModel: t("errors.missing_model"),
          missingResolution: t("errors.missing_resolution"),
          requestFailed: t("errors.request_failed"),
        },
      },
    [copy, t]
  );
  const {
    models,
    loading: modelsLoading,
    error: modelsError,
  } = useModels();
  const {
    styles,
    loading: stylesLoading,
    error: stylesError,
  } = useStyles();

  const modelConstraintValues = useMemo(
    () => resolveConstraintValues(model),
    [model]
  );
  const styleConstraintValues = useMemo(
    () => resolveConstraintValues(style),
    [style]
  );

  const availableModels = useMemo(() => {
    const imageModels = models.filter((m) => m.model_type !== "text2video");
    return mapModelsToOptions(imageModels, translate, modelConstraintValues);
  }, [models, translate, modelConstraintValues]);

  const availableStyles = useMemo(() => {
    return mapStylesToOptions(styles, translate, styleConstraintValues);
  }, [styles, translate, styleConstraintValues]);

  const isModelFixed = typeof model === "string";
  const isStyleFixed = typeof style === "string";

  const [prompt, setPrompt] = useState(defaultPrompt || "");
  const [modelId, setModelId] = useState("");
  const [styleId, setStyleId] = useState("");
  const [quantityValue, setQuantityValue] = useState<number>(1);
  const [resolutionValue, setResolutionValue] = useState("");
  const [referenceInput, setReferenceInput] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [results, setResults] = useState<
    GenerationStatusResponse["results"]
  >();
  const [status, setStatus] = useState<GenerationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedReferenceUrl = referenceUrl || referenceInput;
  const isTemplateMode = !!(promptTemplate || templateParams);

  const templateState = useMemo(() => {
    if (!isTemplateMode) return null;
    const params = templateParams ?? {};
    return resolvePromptTemplate(promptTemplate, params);
  }, [isTemplateMode, promptTemplate, templateParams]);
  const promptValue = templateState?.prompt ?? prompt;
  const isPromptEditable = !templateState;

  const selectedModel = useMemo(
    () => models.find((item) => item.model_id === modelId),
    [models, modelId]
  );

  const modelResolutionOptions = useMemo(() => {
    const resolutions = (selectedModel?.config as any)?.image_resolution;
    return Array.isArray(resolutions) ? resolutions : [];
  }, [selectedModel]);

  const defaultModelResolution = useMemo(() => {
    const defaultResolution = (selectedModel?.config as any)?.default_resolution;
    if (typeof defaultResolution === "string") {
      return defaultResolution;
    }
    return modelResolutionOptions[0] || "";
  }, [selectedModel, modelResolutionOptions]);

  const resolutionOptions = useMemo(() => {
    if (typeof resolution === "string") return [resolution];
    if (Array.isArray(resolution)) return resolution;
    return modelResolutionOptions;
  }, [resolution, modelResolutionOptions]);

  const isResolutionFixed = typeof resolution === "string";

  const quantityOptions = useMemo(
    () => buildQuantityOptions(quantity, DEFAULT_IMAGE_QUANTITY_RANGE),
    [quantity]
  );
  const isQuantityFixed = typeof quantity === "number";

  const { isPolling, error: pollingError } = useGenerationPolling({
    generationId,
    generationType: "anime",
    onCompleted: (completedResults) => {
      setResults(completedResults);
      setStatus((prev) =>
        prev ? { ...prev, status: "completed" } : prev
      );
      if (generationId && onSuccess) {
        onSuccess(completedResults, generationId);
      }
    },
    onFailed: (message) => {
      setError(message);
      if (onError) onError(message);
    },
    onStatusUpdate: (statusUpdate) => {
      setStatus(statusUpdate);
    },
  });

  const resetState = useCallback(() => {
    setPrompt(defaultPrompt || "");
    setReferenceInput("");
    setResults(undefined);
    setStatus(null);
    setError(null);
    setGenerationId(null);
    setIsSubmitting(false);
  }, [defaultPrompt]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    if (!open) return;
    if (templateState) {
      setPrompt(templateState.prompt);
      return;
    }
    setPrompt(defaultPrompt || "");
  }, [open, templateState, defaultPrompt]);

  useEffect(() => {
    if (!open || modelId) return;
    if (availableModels.length > 0) {
      setModelId(availableModels[0].value);
    }
  }, [open, modelId, availableModels]);

  useEffect(() => {
    if (!open || styleId) return;
    if (availableStyles.length > 0) {
      setStyleId(availableStyles[0].value);
    }
  }, [open, styleId, availableStyles]);

  useEffect(() => {
    if (!open) return;
    if (isQuantityFixed) {
      setQuantityValue(quantityOptions[0] || 1);
      return;
    }
    if (quantityOptions.length > 0 && !quantityOptions.includes(quantityValue)) {
      setQuantityValue(quantityOptions[0]);
    }
  }, [open, isQuantityFixed, quantityOptions, quantityValue]);

  useEffect(() => {
    if (!open) return;
    if (isResolutionFixed) {
      setResolutionValue(resolutionOptions[0] || "");
      return;
    }
    if (
      resolutionOptions.length > 0 &&
      !resolutionOptions.includes(resolutionValue)
    ) {
      setResolutionValue(defaultModelResolution || resolutionOptions[0]);
      return;
    }
    if (resolutionOptions.length === 0 && !resolutionValue) {
      setResolutionValue("");
    }
  }, [
    open,
    isResolutionFixed,
    resolutionOptions,
    resolutionValue,
    defaultModelResolution,
  ]);

  useEffect(() => {
    if (!open) return;
    if (referenceUrl) {
      setReferenceInput("");
    }
  }, [open, referenceUrl]);

  const resolveTemplateError = useCallback(() => {
    if (!isTemplateMode) return null;
    if (!promptTemplate) {
      return (
        resolvedCopy.errors.missingTemplate ||
        resolvedCopy.errors.requestFailed
      );
    }
    if (templateState?.missingKeys?.length) {
      const baseMessage =
        resolvedCopy.errors.missingTemplateParams ||
        resolvedCopy.errors.requestFailed;
      return `${baseMessage}: ${templateState.missingKeys.join(", ")}`;
    }
    return null;
  }, [
    isTemplateMode,
    promptTemplate,
    resolvedCopy.errors,
    templateState,
  ]);

  const handleSubmit = useCallback(async () => {
    const templateError = resolveTemplateError();
    if (templateError) {
      setError(templateError);
      if (onError) onError(templateError);
      return;
    }

    const trimmedPrompt = promptValue.trim();

    if (!trimmedPrompt) {
      setError(resolvedCopy.errors.missingPrompt);
      return;
    }
    if (!modelId) {
      setError(resolvedCopy.errors.missingModel);
      return;
    }
    if (!resolutionValue) {
      setError(resolvedCopy.errors.missingResolution);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResults(undefined);
    setStatus(null);
    setGenerationId(null);

    try {
      const payload = {
        gen_type: genType,
        prompt: trimmedPrompt,
        style_preset: styleId || undefined,
        model_uuid: modelId,
        batch_size: quantityValue,
        image_resolution: resolutionValue,
        reference_image_urls: resolvedReferenceUrl
          ? [resolvedReferenceUrl]
          : undefined,
        ...extraPayload,
      };
      console.info("[ImageGenerationModal] create-task payload", payload);
      const response = await fetch("/api/anime-generation/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.error || resolvedCopy.errors.requestFailed;
        setError(message);
        if (onError) onError(message);
        return;
      }

      const data = await response.json();
      if (!data?.success || !data?.data?.generation_uuid) {
        const message = data?.error || resolvedCopy.errors.requestFailed;
        setError(message);
        if (onError) onError(message);
        return;
      }

      setGenerationId(data.data.generation_uuid);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : resolvedCopy.errors.requestFailed;
      setError(message);
      if (onError) onError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    extraPayload,
    genType,
    modelId,
    onError,
    promptValue,
    quantityValue,
    resolveTemplateError,
    resolutionValue,
    styleId,
    resolvedReferenceUrl,
    resolvedCopy.errors,
  ]);

  const displayError = pollingError || error;
  const statusText = status?.message
    ? status.message
    : isPolling
      ? resolvedCopy.status.polling
      : isSubmitting
        ? resolvedCopy.status.submitting
        : displayError
          ? resolvedCopy.status.failed
          : results?.length
            ? resolvedCopy.status.completed
            : resolvedCopy.status.idle;

  const hasResults = !!results && results.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "glass-panel w-[95vw] max-w-3xl overflow-hidden rounded-3xl border border-border/40 p-0 shadow-2xl",
          className
        )}
      >
        <div className="relative">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -left-20 bottom-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {resolvedCopy.title}
              </DialogTitle>
              {resolvedCopy.description ? (
                <DialogDescription className="text-sm text-muted-foreground">
                  {resolvedCopy.description}
                </DialogDescription>
              ) : null}
            </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{resolvedCopy.labels.model}</Label>
              <Select
                value={modelId}
                onValueChange={setModelId}
                disabled={
                  isModelFixed || modelsLoading || availableModels.length === 0
                }
              >
                <SelectTrigger className="glass-panel h-10">
                  <SelectValue
                    placeholder={
                      modelsLoading
                        ? resolvedCopy.status.loadingOptions
                        : modelsError
                          ? resolvedCopy.status.loadFailed
                          : resolvedCopy.placeholders.model
                    }
                  />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  {availableModels.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{resolvedCopy.labels.style}</Label>
              <Select
                value={styleId}
                onValueChange={setStyleId}
                disabled={
                  isStyleFixed || stylesLoading || availableStyles.length === 0
                }
              >
                <SelectTrigger className="glass-panel h-10">
                  <SelectValue
                    placeholder={
                      stylesLoading
                        ? resolvedCopy.status.loadingOptions
                        : stylesError
                          ? resolvedCopy.status.loadFailed
                          : resolvedCopy.placeholders.style
                    }
                  />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  {availableStyles.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {resolvedCopy.labels.quantity}
              </Label>
              <Select
                value={String(quantityValue)}
                onValueChange={(value) => setQuantityValue(Number(value))}
                disabled={isQuantityFixed || quantityOptions.length <= 1}
              >
                <SelectTrigger className="glass-panel h-10">
                  <SelectValue placeholder={String(quantityValue)} />
                </SelectTrigger>
                <SelectContent className="glass-panel">
                  {quantityOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {resolvedCopy.labels.resolution}
              </Label>
              {resolutionOptions.length > 0 ? (
                <Select
                  value={resolutionValue}
                  onValueChange={setResolutionValue}
                  disabled={isResolutionFixed}
                >
                  <SelectTrigger className="glass-panel h-10">
                    <SelectValue placeholder={resolvedCopy.placeholders.resolution} />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    {resolutionOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={resolutionValue}
                  onChange={(event) => setResolutionValue(event.target.value)}
                  placeholder={resolvedCopy.placeholders.resolution}
                  className="glass-panel h-10"
                />
              )}
            </div>
          </div>

          {!hidePromptInput ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{resolvedCopy.labels.prompt}</Label>
              <Textarea
                value={promptValue}
                onChange={(event) => {
                  if (isPromptEditable) {
                    setPrompt(event.target.value);
                  }
                }}
                placeholder={resolvedCopy.placeholders.prompt}
                className="glass-panel min-h-[120px] resize-none"
                readOnly={!isPromptEditable}
              />
            </div>
          ) : null}

          {!referenceUrl ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {resolvedCopy.labels.reference}
              </Label>
              <Input
                value={referenceInput}
                onChange={(event) => setReferenceInput(event.target.value)}
                placeholder={resolvedCopy.placeholders.reference}
                className="glass-panel h-10"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-sm font-medium">{resolvedCopy.labels.status}</Label>
            <div
              className={cn(
                "glass-panel flex min-h-[44px] items-center rounded-2xl px-4 text-sm",
                displayError ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {displayError || statusText}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{resolvedCopy.labels.results}</Label>
            </div>

            {hasResults ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {results?.map((item) => (
                  <div
                    key={item.image_uuid || item.image_url}
                    className="glass-panel overflow-hidden rounded-2xl border border-border/40"
                  >
                    <img
                      src={item.thumbnail_url || item.image_url}
                      alt={item.image_uuid || "result"}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel flex h-24 items-center justify-center rounded-2xl text-sm text-muted-foreground">
                {resolvedCopy.status.emptyResults}
              </div>
            )}
          </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="glass-panel border border-border/40"
              >
                {resolvedCopy.actions.cancel}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isPolling}
                className="bg-primary text-primary-foreground"
              >
                {resolvedCopy.actions.submit}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
