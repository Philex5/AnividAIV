"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSortedFeatures, type FeatureConfig } from "@/lib/feature-config";
import { Translations } from "./Translations";
import { getR2Url } from "@/lib/asset-loader";

interface FeatureRecommendProps {
  currentSlug: string;
}

function FeatureCard({
  feature,
  index,
}: {
  feature: FeatureConfig;
  index: number;
}) {
  const t = useTranslations("feature_recommend");

  return (
    <Link
      href={{ pathname: `/${feature.slug}` }}
      className="group block h-full"
    >
      <div className="glass-card group p-4 rounded-lg border-refined hover-float transition-all duration-300 h-full flex flex-col">
        <div className="relative aspect-4/3 mb-3 overflow-hidden rounded-lg bg-muted/20">
          <Image
            src={getR2Url(feature.image)}
            alt={feature.name}
            fill
            className="object-contain p-2 group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
          {feature.badge && (
            <Badge
              className={`absolute top-2 right-2 border-none shadow-sm ${
                feature.badge === "hot"
                  ? "bg-red-500 text-white"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {t(`badges.${feature.badge}`)}
            </Badge>
          )}
        </div>
        <div className="space-y-1.5 px-1">
          <h3 className="font-bold text-base text-foreground font-display line-clamp-1 group-hover:text-primary transition-colors">
            <Translations textKey={feature.i18n_name_key} />
          </h3>
          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            <Translations textKey={feature.i18n_desc_key} />
          </p>
        </div>
      </div>
    </Link>
  );
}

export function FeatureRecommend({ currentSlug }: FeatureRecommendProps) {
  const t = useTranslations("feature_recommend");
  const features = getSortedFeatures(currentSlug);

  return (
    <section className="w-full py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold font-anime text-foreground mb-6">
              {t("title")}
            </h2>
            <p className="text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.slug} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
