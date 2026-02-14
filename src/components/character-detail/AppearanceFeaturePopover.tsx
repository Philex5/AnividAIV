"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Shirt, Gem, Sparkles } from "lucide-react";
import type { CharacterDetailPage } from "@/types/pages/landing";

interface AppearanceFeature {
  type: "outfit" | "signature" | "accessories";
  value: string | string[];
}

interface AppearanceFeaturePopoverProps {
  outfitStyle?: string;
  apperanceFeatures?: string;
  accessories?: string[];
  pageData: CharacterDetailPage;
}

export function AppearanceFeaturePopover({
  outfitStyle,
  apperanceFeatures,
  accessories,
  pageData,
}: AppearanceFeaturePopoverProps) {
  const features: AppearanceFeature[] = [];
  if (outfitStyle) {
    features.push({ type: "outfit", value: outfitStyle });
  }
  if (apperanceFeatures) {
    features.push({ type: "signature", value: apperanceFeatures });
  }
  if (accessories && accessories.length > 0) {
    features.push({ type: "accessories", value: accessories });
  }

  // If no features, don't render anything
  if (features.length === 0) {
    return null;
  }

  const getIcon = (type: AppearanceFeature["type"]) => {
    switch (type) {
      case "outfit":
        return <Shirt className="h-5 w-5" />;
      case "signature":
        return <Gem className="h-5 w-5" />;
      case "accessories":
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getLabel = (type: AppearanceFeature["type"]) => {
    switch (type) {
      case "outfit":
        return pageData.appearance?.outfit_style || "";
      case "signature":
        return pageData.appearance?.appearance_features || "";
      case "accessories":
        return pageData.appearance?.accessories || "";
    }
  };

  return (
    <div className="flex items-center gap-2 mt-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {pageData.appearance?.features || ""}
      </h3>
      <div className="flex gap-2">
        {features.map((feature, index) => (
          <Popover key={index}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                aria-label={getLabel(feature.type)}
              >
                {getIcon(feature.type)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  {getLabel(feature.type)}
                </h4>
                {Array.isArray(feature.value) ? (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {feature.value.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {feature.value}
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
}
