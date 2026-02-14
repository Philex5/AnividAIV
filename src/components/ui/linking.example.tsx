/**
 * LinkingComponent - 使用示例
 *
 * 展示如何在实际项目中使用 LinkingComponent 组件
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { LinkingComponent } from "@/components/ui/linking";
import {
  animeGenerationConfig,
  ocMakerConfig,
  characterDetailConfig,
} from "@/components/ui/linking.config";

/**
 * 示例1: 在动漫生成页面结果预览中使用
 */
export function AnimeGenerationExample({
  imageUuid,
  imageUrl,
}: {
  imageUuid: string;
  imageUrl?: string;
}) {
  const t = useTranslations("linking.buttons");

  const buttons = [
    {
      label: t("animateIt.label"),
      type: "single" as const,
      href: `/ai-anime-video-generator?ref_image_url=${imageUuid}`,
      variant: "default" as const,
    },
    ...(imageUrl
      ? [
          {
            label: "Reference to Image",
            type: "single" as const,
            href: `/ai-anime-generator?ref_image_url=${encodeURIComponent(imageUrl)}`,
            variant: "default" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Generated Image</h3>

      {/* 图片内容 */}
      <div className="mb-4">
        <img
          src="/placeholder-image.jpg"
          alt="Generated anime"
          className="w-full rounded-md"
        />
      </div>

      {/* 联动链接组件 */}
      <LinkingComponent
        orientation="horizontal"
        buttons={buttons}
        className="mt-4"
      />
    </div>
  );
}

/**
 * 示例2: 在OC制作页面结果预览中使用
 */
export function OcMakerExample({ characterUuid }: { characterUuid: string }) {
  const t = useTranslations("linking.buttons");

  const buttons = [
    {
      label: t("createContent.label"),
      type: "list" as const,
      variant: "default" as const,
      listItems: [
        {
          label: t("makeAnimeArt"),
          href: `/ai-anime-generator?character_uuid=${characterUuid}`,
        },
        {
          label: t("asMainRoleInVideo"),
          href: `/ai-anime-video-generator?character_uuid=${characterUuid}`,
        },
        {
          label: t("actionFigureGenerator"),
          href: `/ai-action-figure-generator?character_uuid=${characterUuid}`,
        },
      ],
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Your Character</h3>

      {/* 角色内容 */}
      <div className="mb-4">
        <div className="w-full h-64 bg-gradient-to-br from-purple-100 to-pink-100 rounded-md" />
      </div>

      {/* 联动链接组件 */}
      <LinkingComponent
        orientation="vertical"
        buttons={buttons}
        className="mt-4"
      />
    </div>
  );
}

/**
 * 示例3: 在角色详情页中使用
 */
export function CharacterDetailExample({
  characterUuid,
}: {
  characterUuid: string;
}) {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-bold mb-6">Quick Actions</h3>

      {/* 使用场景配置 */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            From Character
          </h4>
          <LinkingComponent
            {...characterDetailConfig(characterUuid)}
            className="max-w-md"
          />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            From Result
          </h4>
          <LinkingComponent
            {...ocMakerConfig(characterUuid)}
            className="max-w-md"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 示例4: 自定义样式和变体
 */
export function CustomStylesExample() {
  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Custom Styled Components</h3>

      <div className="space-y-6">
        {/* Primary 变体 */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Primary</h4>
          <LinkingComponent
            orientation="horizontal"
            buttons={[
              {
                label: "Primary Button",
                type: "single",
                href: "/page1",
                variant: "default",
              },
            ]}
          />
        </div>

        {/* Default 变体 */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Default</h4>
          <LinkingComponent
            orientation="horizontal"
            buttons={[
              {
                label: "Default Button",
                type: "single",
                href: "/page2",
                variant: "default",
              },
            ]}
          />
        </div>

        {/* Secondary 变体 */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Secondary</h4>
          <LinkingComponent
            orientation="horizontal"
            buttons={[
              {
                label: "Secondary Button",
                type: "single",
                href: "/page3",
                variant: "secondary",
              },
            ]}
          />
        </div>

        {/* 混合按钮 */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Mixed</h4>
          <LinkingComponent
            orientation="vertical"
            buttons={[
              {
                label: "Simple Link",
                type: "single",
                href: "/simple",
                variant: "default",
              },
              {
                label: "Dropdown Menu",
                type: "list",
                variant: "default",
                listItems: [
                  { label: "Item A", href: "/item-a" },
                  { label: "Item B", href: "/item-b" },
                ],
              },
              {
                label: "Another Link",
                type: "single",
                href: "/another",
                variant: "secondary",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 示例5: 响应式布局展示
 */
export function ResponsiveExample({
  imageUuid,
  imageUrl,
}: {
  imageUuid: string;
  imageUrl?: string;
}) {
  const config = animeGenerationConfig(imageUuid, imageUrl);

  return (
    <div className="space-y-8">
      {/* 桌面端布局 */}
      <div className="hidden lg:block p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Desktop Layout (lg and up)</h4>
        <LinkingComponent orientation="horizontal" buttons={config.buttons} />
        <p className="text-xs text-gray-500 mt-2">
          Uses horizontal layout with side-by-side buttons
        </p>
      </div>

      {/* 平板端布局 */}
      <div className="hidden md:block lg:hidden p-4 bg-green-50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Tablet Layout (md to lg)</h4>
        <LinkingComponent orientation="horizontal" buttons={config.buttons} />
        <p className="text-xs text-gray-500 mt-2">
          Horizontal layout with adjusted spacing
        </p>
      </div>

      {/* 移动端布局（自动切换） */}
      <div className="block md:hidden p-4 bg-purple-50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Mobile Layout (below md)</h4>
        <LinkingComponent
          orientation="horizontal" // 会被自动覆盖为 vertical
          buttons={config.buttons}
        />
        <p className="text-xs text-gray-500 mt-2">
          Automatically switches to vertical layout on mobile
        </p>
      </div>
    </div>
  );
}
