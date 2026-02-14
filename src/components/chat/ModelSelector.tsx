"use client";

import { useState } from "react";
import { getCreamyCharacterUrl, getMemberBadgeUrl, getModelIconUrl } from "@/lib/asset-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Model icon mapping
const modelIcons = {
  base: getModelIconUrl("openai", "svg"),
  premium: getModelIconUrl("openai", "svg"),
};

interface ModelSelectorProps {
  availableModels: string[];
  currentModel: "base" | "premium";
  onModelChange: (model: "base" | "premium") => void;
  disabled?: boolean;
  userLevel?: string;
  texts?: {
    selectModel?: string;
    base?: string;
    premium?: string;
    baseBadge?: string;
    premiumBadge?: string;
    locked?: string;
    upgradeRequired?: string;
  };
}

export function ModelSelector({
  availableModels,
  currentModel,
  onModelChange,
  disabled = false,
  userLevel = "free",
  texts = {}
}: ModelSelectorProps) {
  const [isLocked, setIsLocked] = useState(!availableModels.includes(currentModel));

  const handleValueChange = (value: string) => {
    const model = value as "base" | "premium";
    if (availableModels.includes(model)) {
      setIsLocked(false);
      onModelChange(model);
    } else {
      setIsLocked(true);
    }
  };

  const isPremiumAvailable = availableModels.includes("premium");
  const isCurrentModelLocked = isLocked && currentModel === "premium";

  return (
    <div className="flex items-center gap-2">
      <Select
        value={isCurrentModelLocked ? "base" : currentModel}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[60px] [&>svg]:hidden">
          <SelectValue className="flex items-center justify-center">
            <img
              src={modelIcons[currentModel]}
              alt={currentModel}
              className="w-8 h-8"
            />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="base" className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <img
                src={modelIcons.base}
                alt="Base"
                className="w-8 h-8"
              />
              <span>{texts.base || "Base Model"}</span>
            </div>
          </SelectItem>
          <SelectItem
            value="premium"
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2">
              {isPremiumAvailable ? (
                <>
                  <img
                    src={modelIcons.premium}
                    alt="Premium"
                    className="w-8 h-8"
                  />
                  <span>{texts.premium || "Premium Model"}</span>
                </>
              ) : (
                <>
                  <img
                    src={modelIcons.premium}
                    alt="Premium (Locked)"
                    className="w-8 h-8 opacity-50"
                  />
                  <span>{texts.premium || "Premium Model"}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <img
                            src={getMemberBadgeUrl("sub_only")}
                            alt="Subscription required"
                            className="w-4 h-4 cursor-help"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{texts.upgradeRequired || "Upgrade to Unlock"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {isCurrentModelLocked && (
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {texts.upgradeRequired || `Upgrade to ${userLevel === "plus" || userLevel === "pro" ? "Pro" : "Plus"} to use`}
          </span>
        </div>
      )}
    </div>
  );
}
