"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";
import type { AIModel, UIParamConfig } from "@/lib/configs";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

interface DynamicVideoParamsProps {
  model: AIModel;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
  pageData?: AnimeGeneratorPage;
}

export function DynamicVideoParams({
  model,
  values,
  onChange,
  disabled = false,
  pageData,
}: DynamicVideoParamsProps) {
  const { user } = useAppContext();

  // Check if user can use subscription features
  const canUseSubscriptionFeatures = useMemo(() => {
    if (!user) return false;
    return (
      user.is_sub &&
      user.sub_expired_at &&
      new Date(user.sub_expired_at) > new Date()
    );
  }, [user]);

  // 基于页面数据的翻译函数
  const translate = (key: string, defaultValue?: string): string => {
    if (!key) return defaultValue || "";

    // 尝试从 pageData 获取翻译
    const keys = key.split(".");
    let value: any = pageData;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    if (value && typeof value === "string") {
      return value;
    }

    return defaultValue || key;
  };

  const paramConfigs = useMemo((): UIParamConfig[] => {
    if (model.ui_config?.params) {
      if (model.model_id === "kling-3.0/video") {
        return model.ui_config.params.filter(
          (param) =>
            param.key !== "multi_shots" &&
            param.key !== "duration_seconds" &&
            param.key !== "sound"
        );
      }
      return model.ui_config.params;
    }

    // 回退到默认配置
    return [
      {
        key: "resolution",
        i18n_label_key: "parameters.quality",
        type: "select",
        options: ["720p", "1080p"],
        default: "720p",
      },
      {
        key: "duration",
        i18n_label_key: "parameters.duration",
        type: "number",
        min: 3,
        max: 10,
        default: 5,
        unit: "s",
      },
    ];
  }, [model]);

  const selectParamConfigs = useMemo(
    () => paramConfigs.filter((config) => config.type === "select"),
    [paramConfigs]
  );

  const nonSelectParamConfigs = useMemo(
    () => paramConfigs.filter((config) => config.type !== "select"),
    [paramConfigs]
  );

  const shouldSplitByControlType =
    selectParamConfigs.length > 0 && nonSelectParamConfigs.length > 0;

  // 应用约束逻辑，计算每个参数的可用选项
  const getAvailableOptions = (
    config: UIParamConfig,
    currentValues: Record<string, any> = values
  ): string[] => {
    if (!config.constraints || config.type !== "select") {
      return config.options || [];
    }

    let availableOptions = config.options || [];

    config.constraints.forEach((constraint) => {
      if (constraint.dependsOn && constraint.when !== undefined) {
        const dependencyValue = currentValues[constraint.dependsOn];
        if (
          dependencyValue !== undefined &&
          String(dependencyValue) === String(constraint.when)
        ) {
          if (constraint.availableOptions) {
            availableOptions = constraint.availableOptions;
          } else if (constraint.disabledOptions) {
            availableOptions = availableOptions.filter(
              (option) => !constraint.disabledOptions!.includes(option)
            );
          }
        }
      }
    });

    return availableOptions;
  };

  // 检查并自动调整冲突的参数值
  const handleConstraintAdjustment = (paramKey: string, newValue: any) => {
    // 先设置当前参数
    onChange(paramKey, newValue);

    const nextValues = { ...values, [paramKey]: newValue };

    // 检查其他参数是否需要调整
    paramConfigs.forEach((config) => {
      if (!config.constraints || config.type !== "select") {
        return;
      }

      const availableOptions = getAvailableOptions(config, nextValues);
      if (availableOptions.length === 0) {
        return;
      }

      const currentValue =
        nextValues[config.key]?.toString() ?? config.default?.toString();

      if (currentValue && availableOptions.includes(currentValue)) {
        return;
      }

      const matchedConstraint = config.constraints.find(
        (constraint) =>
          constraint.dependsOn === paramKey &&
          String(constraint.when) === String(newValue)
      );

      const autoAdjustValue = matchedConstraint?.autoAdjust || availableOptions[0];
      onChange(config.key, autoAdjustValue);
    });
  };

  const getLabel = (config: UIParamConfig): string => {
    if (config.i18n_label_key) {
      const translated = translate(config.i18n_label_key);
      if (translated && translated !== config.i18n_label_key) {
        return translated;
      }
    }
    if (config.label) {
      return config.label;
    }
    // 最后的回退
    return pageData?.parameters?.[config.key] || config.key;
  };

  const getPlaceholder = (config: UIParamConfig): string => {
    if (config.placeholder_key) {
      const translated = translate(config.placeholder_key);
      if (translated && translated !== config.placeholder_key) {
        return translated;
      }
    }
    return "";
  };

  if (paramConfigs.length === 0) {
    return null;
  }

  const renderParamField = (config: UIParamConfig) => (
    <div
      key={config.key}
      className={
        config.key === "negative_prompt" ? "lg:col-span-2 space-y-1" : "space-y-1"
      }
    >
      <label className="text-xs text-muted-foreground block">
        {getLabel(config)}
      </label>

      {config.type === "select" ? (
        <Select
          value={
            values[config.key]?.toString() ||
            config.default?.toString() ||
            ""
          }
          onValueChange={(value) =>
            handleConstraintAdjustment(config.key, value)
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getAvailableOptions(config).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
                {config.unit ? config.unit : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : config.type === "number" ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={config.min}
            max={config.max}
            value={values[config.key] || config.default}
            onChange={(e) => {
              const value =
                e.target.value === ""
                  ? config.default
                  : Number(e.target.value);
              onChange(config.key, value);
            }}
            className="h-9 text-sm w-full"
            disabled={disabled}
          />
          {config.unit && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {config.unit}
            </span>
          )}
        </div>
      ) : config.type === "text" ? (
        <Textarea
          value={values[config.key] || config.default}
          onChange={(e) => onChange(config.key, e.target.value)}
          placeholder={getPlaceholder(config)}
          className="text-sm resize-none"
          rows={2}
          disabled={disabled}
        />
      ) : config.type === "toggle" ? (
        config.key === "sound" ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {(values[config.key] ?? config.default)
                ? translate("common.enabled") || "Enabled"
                : translate("common.disabled") || "Disabled"}
            </span>
            <Switch
              checked={values[config.key] ?? config.default}
              onCheckedChange={(checked) => onChange(config.key, checked)}
              disabled={disabled}
            />
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Switch
              checked={values[config.key] ?? config.default}
              onCheckedChange={(checked) => onChange(config.key, checked)}
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">
              {(values[config.key] ?? config.default)
                ? translate("common.enabled") || "Enabled"
                : translate("common.disabled") || "Disabled"}
            </span>
          </div>
        )
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium mb-2">
        {translate("parameters.title") ||
          pageData?.parameters?.title ||
          "Video Parameters"}
      </h4>

      {shouldSplitByControlType ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {selectParamConfigs.map(renderParamField)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {nonSelectParamConfigs.map(renderParamField)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {paramConfigs.map(renderParamField)}
        </div>
      )}
    </div>
  );
}
