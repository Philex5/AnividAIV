# LinkingComponent 使用指南

## 概述

LinkingComponent 是一个联动链接组件，用于在OC详情页等场景中快速链接到相关创作功能（anime-generation、video-generation等）。

## 文件结构

```
src/
├── types/
│   └── components/
│       └── linking.ts              # 类型定义
├── components/
│   └── ui/
│       ├── linking.tsx             # 组件实现
│       ├── linking.config.ts       # 场景配置
│       ├── linking.stories.tsx     # Storybook 故事
│       ├── linking.test.tsx        # 单元测试
│       └── index.ts                # 统一导出
└── i18n/
    └── pages/
        ├── anime-generator/
        │   └── en.json              # 动漫生成页面国际化
        ├── oc-maker/
        │   └── en.json              # OC制作页面国际化
        └── character-detail/
            └── en.json              # 角色详情页面国际化
```

## 快速开始

### 1. 基础使用

```tsx
import { LinkingComponent } from '@/components/ui/linking';

export default function MyComponent() {
  return (
    <LinkingComponent
      orientation="horizontal"
      buttons={[
        {
          label: 'Animate It',
          type: 'single',
          href: '/ai-anime-video-generator?ref_image_url=${image_uuid}',
          variant: 'primary',
        },
      ]}
    />
  );
}
```

### 2. 使用场景配置

```tsx
import { LinkingComponent } from '@/components/ui/linking';
import { animeGenerationConfig, ocMakerConfig } from '@/components/ui/linking.config';

// anime-generation 场景
const animeConfig = animeGenerationConfig('image-uuid-123');

<LinkingComponent
  orientation={animeConfig.orientation}
  buttons={animeConfig.buttons}
/>

// oc-maker 场景
const ocConfig = ocMakerConfig('character-uuid-456');

<LinkingComponent
  orientation={ocConfig.orientation}
  buttons={ocConfig.buttons}
/>
```

### 3. 使用国际化

```tsx
import { useTranslations } from 'next-intl';
import { LinkingComponent } from '@/components/ui/linking';
import { sceneConfigMap } from '@/components/ui/linking.config';

export default function MyComponent() {
  const t = useTranslations('linking.buttons');

  // 从国际化文件获取配置
  const buttons = [
    {
      label: t('animateIt.label'),
      type: 'single' as const,
      href: t('animateIt.href').replace('${image_uuid}', imageUuid),
      variant: 'primary' as const,
    },
  ];

  return (
    <LinkingComponent
      orientation="horizontal"
      buttons={buttons}
    />
  );
}
```

## API 参考

### Props

#### LinkingComponentProps

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| orientation | 'horizontal' \| 'vertical' | 'horizontal' | 布局方向 |
| buttons | MainButton[] | - | 按钮配置数组 |
| className | string | - | 自定义样式类 |

#### MainButton

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| label | string | - | 主按钮文本 |
| type | 'single' \| 'list' | - | 按钮类型 |
| href | string | - | 单按钮的跳转链接 |
| listItems | LinkButton[] | - | 列表模式下的子按钮项 |
| variant | 'default' \| 'primary' \| 'secondary' | 'default' | 按钮样式变体 |
| className | string | - | 自定义样式类 |

#### LinkButton

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| label | string | - | 按钮文本 |
| href | string | - | 跳转链接 |
| variant | 'default' \| 'primary' \| 'secondary' | 'default' | 按钮样式变体 |
| icon | React.ReactNode | - | 可选图标 |
| className | string | - | 自定义样式类 |

## 使用场景

### 场景1：动漫生成页面结果预览

在 `ai-anime-generator` 结果预览弹窗中，添加"动画化"按钮：

```tsx
// page.tsx
import { useTranslations } from 'next-intl';
import { LinkingComponent } from '@/components/ui/linking';

export default function ImageDetailModal({ imageUuid }) {
  const t = useTranslations('linking.buttons');

  const buttons = [
    {
      label: t('animateIt.label'),
      type: 'single',
      href: `/ai-anime-video-generator?ref_image_url=${imageUuid}`,
      variant: 'primary',
    },
  ];

  return (
    <div>
      {/* 图片内容 */}
      <LinkingComponent
        orientation="horizontal"
        buttons={buttons}
      />
    </div>
  );
}
```

### 场景2：OC制作页面结果预览

在 `oc-maker` 结果预览弹窗中，添加"创建内容"下拉菜单：

```tsx
// oc-maker-result.tsx
import { useTranslations } from 'next-intl';
import { LinkingComponent } from '@/components/ui/linking';

export default function OcMakerResult({ characterUuid }) {
  const t = useTranslations('linking.buttons');

  const buttons = [
    {
      label: t('createContent.label'),
      type: 'list',
      variant: 'primary',
      listItems: [
        {
          label: t('makeAnimeArt'),
          href: `/ai-anime-generation?character_uuid=${characterUuid}`,
        },
        {
          label: t('asMainRoleInVideo'),
          href: `/ai-anime-video-generator?character_uuid=${characterUuid}`,
        },
        {
          label: t('actionFigureGenerator'),
          href: `/ai-action-figure-generator?character_uuid=${characterUuid}`,
        },
        {
          label: t('stickerGenerator'),
          href: `/ai-sticker-generator?character_uuid=${characterUuid}`,
        },
      ],
    },
  ];

  return (
    <div>
      {/* OC 内容 */}
      <LinkingComponent
        orientation="vertical"
        buttons={buttons}
      />
    </div>
  );
}
```

### 场景3：角色详情页

在 `character/${character_uuid}` 页面中，添加快速操作区域：

```tsx
// page.tsx
import { useTranslations } from 'next-intl';
import { LinkingComponent } from '@/components/ui/linking';

export default function CharacterDetail({ characterUuid }) {
  const t = useTranslations('linking.buttons');

  const buttons = [
    {
      label: t('createContent.label'),
      type: 'list',
      variant: 'primary',
      listItems: [
        {
          label: 'make anime art',
          href: `/ai-anime-generation?character_uuid=${characterUuid}`,
        },
        {
          label: 'as main role in video',
          href: `/ai-anime-video-generator?character_uuid=${characterUuid}`,
        },
        {
          label: 'ai action figure generator',
          href: `/ai-action-figure-generator?character_uuid=${characterUuid}`,
        },
        {
          label: 'ai sticker generator',
          href: `/ai-sticker-generator?character_uuid=${characterUuid}`,
        },
      ],
    },
  ];

  return (
    <div>
      {/* 角色信息 */}
      <section className="quick-actions">
        <h3>Quick Actions</h3>
        <LinkingComponent
          orientation="vertical"
          buttons={buttons}
        />
      </section>
    </div>
  );
}
```

## 响应式设计

组件自动适配不同屏幕尺寸：

- **桌面端（≥1024px）**: 使用传入的 `orientation` 参数
- **平板端（768-1023px）**: 保持布局方向，间距适当调整
- **移动端（<768px）**: 强制使用 `vertical` 布局，列表向下展开

## 无障碍支持

组件内置完整的无障碍功能：

- ARIA 属性：`aria-expanded`, `aria-haspopup`, `aria-controls`
- 键盘导航：Tab、Enter、Space、Escape、Arrow 键
- 屏幕阅读器支持：正确朗读按钮状态和列表项

## 样式定制

组件使用 Tailwind CSS，主要样式类：

```tsx
// 容器样式
className="flex gap-2 lg:gap-4"

// 按钮样式（使用 Button 组件的 variant）
variant="primary"  // bg-primary text-primary-foreground
variant="default"  // bg-primary text-primary-foreground
variant="secondary" // bg-secondary text-secondary-foreground

// 列表样式
className="z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
```

如需自定义样式，可以通过 `className` 属性传递：

```tsx
<LinkingComponent
  orientation="horizontal"
  buttons={buttons}
  className="custom-linking-component"
/>
```

## 测试

### 单元测试

运行测试：

```bash
npm test -- linking
# 或
pnpm test -- linking
```

测试覆盖：
- 基础渲染
- 交互行为（点击、键盘）
- 响应式设计
- ARIA 属性
- 场景配置

### 故事文件

在 Storybook 中查看组件：

```bash
npm run storybook
# 或
pnpm storybook
```

可用的故事：
- Default - 基础示例
- AnimeGeneration - 动漫生成场景
- OcMaker - OC制作场景
- WithDropdown - 下拉列表示例
- MixedButtons - 混合按钮类型
- VerticalLayout - 垂直布局

## 国际化配置

在对应的页面国际化文件中添加 `linking` 命名空间：

```json
{
  "linking": {
    "buttons": {
      "animateIt": {
        "label": "Animate It",
        "href": "/ai-anime-video-generator?ref_image_url=${image_uuid}"
      },
      "createContent": {
        "label": "Create Content",
        "type": "list",
        "listItems": [
          {
            "label": "make anime art",
            "href": "/ai-anime-generation?character_uuid=${character_uuid}"
          }
        ]
      }
    }
  }
}
```

## 最佳实践

1. **使用场景配置**：优先使用 `linking.config.ts` 中的预设配置
2. **参数替换**：使用模板字符串 `${param}` 并确保正确编码
3. **国际化**：所有文本使用 `useTranslations` 从国际化文件获取
4. **响应式**：移动端自动适配，无需额外处理
5. **可访问性**：组件已内置 ARIA 属性，无需手动添加
6. **测试**：集成前确保通过所有单元测试

## 常见问题

### Q: 如何添加自定义图标？

A: 在 `LinkButton` 中使用 `icon` 属性：

```tsx
{
  label: 'Download',
  href: '/download',
  icon: <DownloadIcon className="w-4 h-4" />,
}
```

### Q: 如何禁用动画？

A: 组件使用 CSS 动画，如需禁用可以添加自定义样式：

```tsx
<LinkingComponent
  orientation="horizontal"
  buttons={buttons}
  className="[&_*]:transition-none"
/>
```

### Q: 如何自定义列表最大高度？

A: 通过 CSS 覆盖：

```tsx
<LinkingComponent
  orientation="horizontal"
  buttons={buttons}
  className="[&_[data-radix-popover-content]]:max-h-96"
/>
```

## 变更历史

- **2025-11-04** - 初始版本：实现完整的 LinkComponent 组件
- 支持横向/纵向布局
- 支持单按钮/列表模式
- 完整的响应式设计和无障碍支持
- 预置三个场景配置
