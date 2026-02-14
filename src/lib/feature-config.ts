import coreFeaturesConfig from '@/configs/apps/core-features.json';
import ocAppsConfig from '@/configs/apps/oc-apps.json';

export interface FeatureConfig {
  slug: string;
  name: string;
  kind: 'image' | 'video' | 'chat';
  i18n_name_key: string;
  i18n_desc_key: string;
  image: string;
  badge?: 'hot' | 'new';
  sort_order: number;
  seo_keywords: string[];
}

export function getAllFeatures(excludeSlug?: string): FeatureConfig[] {
  const coreFeatures = coreFeaturesConfig.features as FeatureConfig[];
  const ocApps = ocAppsConfig.apps as FeatureConfig[];

  const allFeatures = [...coreFeatures, ...ocApps];

  return excludeSlug
    ? allFeatures.filter(f => f.slug !== excludeSlug)
    : allFeatures;
}

export function getSortedFeatures(excludeSlug?: string): FeatureConfig[] {
  const features = getAllFeatures(excludeSlug);

  return features.sort((a, b) => {
    // 1. badge 优先级
    if (a.badge && !b.badge) return -1;
    if (!a.badge && b.badge) return 1;
    if (a.badge && b.badge) {
      const badgeOrder: Record<string, number> = { hot: 0, new: 1 };
      return badgeOrder[a.badge] - badgeOrder[b.badge];
    }

    // 2. sort_order 优先级
    return b.sort_order - a.sort_order;
  });
}
