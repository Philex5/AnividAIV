/**
 * LinkingComponent - 场景配置文件
 *
 * 定义不同场景下的按钮配置和参数替换函数
 */

import {
  Wand2,
  Video,
  MessageCircle,
  AppWindow,
  Palette,
  Sparkles
} from "lucide-react";
import type { SceneConfig, MainButton } from "@/types/components/linking";

/** 参数替换函数：将模板字符串中的变量替换为实际值 */
function replaceParams(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    return params[key] ? encodeURIComponent(String(params[key])) : match;
  });
}

/** anime-generation 场景配置：结果预览弹窗/ai-anime-generator */
export const animeGenerationConfig = (
  imageUuid: string,
  imageUrl?: string
): SceneConfig => ({
  name: "anime-generation",
  orientation: "horizontal",
  buttons: [
    {
      label: "Animate It",
      type: "single",
      href: `/ai-anime-video-generator?ref_image_url=${imageUrl ? encodeURIComponent(imageUrl) : imageUuid}`,
      variant: "secondary",
      lucideIcon: Wand2,
      tooltip: "Turn this image into a video",
    },
    ...(imageUrl
      ? [
          {
            label: "Use as Reference",
            type: "single" as const,
            href: `/ai-anime-generator?ref_image_url=${encodeURIComponent(imageUrl)}`,
            variant: "secondary" as const,
            lucideIcon: Palette,
            tooltip: "Use this image as reference for new art",
          },
        ]
      : []),
  ],
});

/** oc-maker 场景配置：结果预览弹窗/oc-maker */
export const ocMakerConfig = (characterUuid: string): SceneConfig => ({
  name: "oc-maker",
  orientation: "vertical",
  buttons: [
    {
      label: "Animate It",
      type: "single",
      href: `/ai-anime-video-generator?character_uuid=${characterUuid}`,
      variant: "secondary",
      lucideIcon: Wand2,
      tooltip: "Animate your character",
    },
    {
      label: "Role in Video",
      type: "single",
      href: `/ai-anime-video-generator?character_uuid=${characterUuid}`,
      variant: "secondary",
      lucideIcon: Video,
      tooltip: "Create video with your character",
    },
    {
      label: "Chat",
      type: "single",
      href: `/chat/${characterUuid}`,
      variant: "secondary",
      lucideIcon: MessageCircle,
      tooltip: "Chat with your character",
    },
    {
      label: "Studio Tools",
      type: "list",
      variant: "secondary",
      lucideIcon: AppWindow,
      tooltip: "More specialized tools",
      listItems: [
        {
          label: "ai action figure generator",
          href: `/ai-action-figure-generator?character_uuid=${characterUuid}`,
        },
        {
          label: "ai sticker generator",
          href: `/ai-sticker-generator?character_uuid=${characterUuid}`,
        },
      ],
    },
  ],
});

/** character-detail 场景配置：OC详情页（仅owner可见） */
export const characterDetailConfig = (characterUuid: string): SceneConfig => ({
  name: "character-detail",
  // 详情页顶部操作区期望横向排列
  orientation: "horizontal",
  buttons: [
    {
      label: "Make Anime Art",
      type: "single",
      variant: "secondary",
      href: `/ai-anime-generator?character_uuid=${characterUuid}`,
      lucideIcon: Palette,
      tooltip: "Create anime art with your character",
    },
    {
      label: "Role in Video",
      type: "single",
      variant: "secondary",
      href: `/ai-anime-video-generator?character_uuid=${characterUuid}`,
      lucideIcon: Video,
      tooltip: "Create video with your character",
    },
    {
      label: "Chat",
      type: "single",
      variant: "secondary",
      href: `/chat/${characterUuid}`,
      lucideIcon: MessageCircle,
      tooltip: "Chat with your character",
    },
    {
      label: "Studio Tools",
      type: "list",
      variant: "secondary",
      lucideIcon: AppWindow,
      tooltip: "More specialized tools",
      listItems: [
        {
          label: "AI Action Figure Generator",
          href: `/ai-action-figure-generator?character_uuid=${characterUuid}`,
        },
        {
          label: "AI Sticker Generator",
          href: `/ai-sticker-generator?character_uuid=${characterUuid}`,
        },
      ],
    },
  ],
});

/** community-detail 场景配置：社区详情弹窗 */
export const communityDetailConfig = (
  type: "image" | "oc",
  params: { image_uuid?: string; image_url?: string; character_uuid?: string }
): SceneConfig => ({
  name: "community-detail",
  orientation: "horizontal",
  buttons:
    type === "image"
      ? [
          // Image 类型：1 个按钮
          {
            label: "Animate It",
            type: "single",
            href: `/ai-anime-video-generator?ref_image_url=${params.image_url ? encodeURIComponent(params.image_url) : params.image_uuid}`,
            variant: "secondary",
          },
        ]
      : [
          // OC 类型：只保留 Chat 入口
          {
            label: "Chat",
            type: "single",
            href: `/chat/${params.character_uuid}`,
            variant: "secondary",
          },
        ],
});

/** 通用配置创建函数 */
export const createLinkingConfig = (
  scene: SceneConfig["name"],
  params: Record<string, string | number>
): SceneConfig => {
  switch (scene) {
    case "anime-generation":
      return animeGenerationConfig(
        String(params.image_uuid),
        params.image_url ? String(params.image_url) : undefined
      );
    case "oc-maker":
      return ocMakerConfig(String(params.character_uuid));
    case "character-detail":
      return characterDetailConfig(String(params.character_uuid));
    case "community-detail":
      const type = params.type as "image" | "oc";
      return communityDetailConfig(type, {
        image_uuid: params.image_uuid ? String(params.image_uuid) : undefined,
        image_url: params.image_url ? String(params.image_url) : undefined,
        character_uuid: params.character_uuid
          ? String(params.character_uuid)
          : undefined,
      });
    default:
      throw new Error(`Unknown scene: ${scene}`);
  }
};

/** 获取所有可用场景 */
export const getAvailableScenes = (): SceneConfig["name"][] => [
  "anime-generation",
  "oc-maker",
  "character-detail",
  "community-detail",
];

/** 场景配置映射 */
export const sceneConfigMap: Record<
  SceneConfig["name"],
  (params: Record<string, string | number>) => SceneConfig
> = {
  "anime-generation": (params) =>
    animeGenerationConfig(
      String(params.image_uuid),
      params.image_url ? String(params.image_url) : undefined
    ),
  "oc-maker": (params) => ocMakerConfig(String(params.character_uuid)),
  "character-detail": (params) =>
    characterDetailConfig(String(params.character_uuid)),
  "community-detail": (params) => {
    const type = params.type as "image" | "oc";
    return communityDetailConfig(type, {
      image_uuid: params.image_uuid ? String(params.image_uuid) : undefined,
      image_url: params.image_url ? String(params.image_url) : undefined,
      character_uuid: params.character_uuid
        ? String(params.character_uuid)
        : undefined,
    });
  },
};
