import { respData } from "@/lib/resp";
import presets from "@/configs/tags/preset-tags.json";
import type { TagPresetConfig } from "@/types/tag";

const presetConfig = presets as TagPresetConfig;

export async function GET() {
  return respData({
    version: presetConfig.version,
    updated_at: presetConfig.updated_at,
    categories: presetConfig.categories,
    popular: presetConfig.popular,
  });
}
