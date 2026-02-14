# Public 静态资源迁移完整指南

## 概述

本文档是 Vercel 到 Cloudflare Workers 迁移中关于 `public/` 目录下静态资源迁移的完整指南。包含技术实现、迁移步骤、代码示例和最佳实践。

---

## 核心原则

### 统一资源加载逻辑

✅ **所有环境（开发/生产）均使用 R2/CDN 资源**：

- 不再使用本地 `public/` 目录路径
- 通过 `NEXT_PUBLIC_STORAGE_DOMAIN` 或 `STORAGE_DOMAIN` 环境变量配置域名
- 保持开发/生产环境一致性，避免路径差异导致的 bug

✅ **资源适配器模式**：

- 使用 `assetLoader` 统一管理所有静态资源
- 提供专用方法获取不同类型资源
- 支持 TypeScript 类型安全

---

## 技术实现

### 1. 资源适配器 (assetLoader)

**文件：** `src/lib/asset-loader.ts`

#### 核心方法

**获取 Logo/Favicon：**

```typescript
import { getLogoUrl, getFaviconUrl } from "@/lib/asset-loader";

<img src={getLogoUrl()} alt="Logo" />
<img src={getFaviconUrl()} alt="Favicon" />
```

**获取 Sidebar 图标：**

```typescript
import { getSidebarIconUrl } from "@/lib/asset-loader";

<img src={getSidebarIconUrl("sidebar_home_icon")} alt="Home" />
```

**获取模型图标：**

```typescript
import { getModelIconUrl } from "@/lib/asset-loader";

<img src={getModelIconUrl("openai", "svg")} alt="OpenAI" />
<img src={getModelIconUrl("seedream_4", "webp")} alt="Seedream 4" />
```

**获取会员徽章：**

```typescript
import { getMemberBadgeUrl } from "@/lib/asset-loader";

<img src={getMemberBadgeUrl("pro_member")} alt="Pro" />
```

**获取动漫风格示例图：**

```typescript
import { getAnimeStyleImageUrl } from "@/lib/asset-loader";

<img src={getAnimeStyleImageUrl("anime")} alt="Anime Style" />
<img src={getAnimeStyleImageUrl("chibi")} alt="Chibi Style" />
```

**获取 OC 风格示例图：**

```typescript
import { getOCStyleImageUrl } from "@/lib/asset-loader";

<img src={getOCStyleImageUrl("cyberpunk")} alt="Cyberpunk OC" />
```

**获取手办模板图片：**

```typescript
import { getActionFigureTemplateUrl } from "@/lib/asset-loader";

<img src={getActionFigureTemplateUrl(1)} alt="Template 1" />
```

**获取工具图标：**

```typescript
import { getToolIconUrl } from "@/lib/asset-loader";

<img src={getToolIconUrl("anime_generator")} alt="Anime Generator" />
<img src={getToolIconUrl("video_generator")} alt="Video Generator" />
```

**获取 Creamy 装饰图标：**

```typescript
import { getCreamyDecorationUrl } from "@/lib/asset-loader";

<img src={getCreamyDecorationUrl("bow_tile")} alt="Bow" />
<img src={getCreamyDecorationUrl("foot")} alt="Foot" />
```

**获取 Creamy 角色图标：**

```typescript
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

<img src={getCreamyCharacterUrl("meow_coin")} alt="Meow Coin" />
<img src={getCreamyCharacterUrl("ap")} alt="AP" />
```

**获取邮件模板 URL：**

```typescript
import { getEmailTemplateUrl } from "@/lib/asset-loader";

const templateUrl = getEmailTemplateUrl("welcome");
```

**获取支付图标：**

```typescript
import { getPaymentIconUrl } from "@/lib/asset-loader";

<img src={getPaymentIconUrl("cnpay")} alt="CnPay" />
```

**通用方法：**

```typescript
import { getPublicAssetUrl } from "@/lib/asset-loader";

<img src={getPublicAssetUrl("imgs/custom-icon.webp")} alt="Custom" />
```

**通用图片 URL 方法（推荐）：**

```typescript
import { getImageUrl } from "@/lib/asset-loader";

// 支持多种路径格式，自动添加前缀
<img src={getImageUrl("/imgs/icons/sidebar/home.webp")} alt="Home" />
<img src={getImageUrl("imgs/custom-icon.webp")} alt="Custom" />
<img src={getImageUrl("assets/images/photo.webp")} alt="Asset" />
<img src={getImageUrl("https://example.com/image.webp")} alt="External" />
```

### 2. 环境变量配置

#### 开发环境 (.env.local)

```bash
NEXT_PUBLIC_STORAGE_DOMAIN=http://localhost:8787/assets
STORAGE_DOMAIN=http://localhost:8787/assets
```

> **注意**：开发环境需要先启动 R2 兼容的开发服务器（如使用 `wrangler dev`）

#### 生产环境

```bash
# wrangler.toml
[vars]
NEXT_PUBLIC_STORAGE_DOMAIN = "https://artworks.anividai.com/assets"
STORAGE_DOMAIN = "https://artworks.anividai.com/assets"
```

---

## 资源类型及替换方法

### 1. Logo 和 Favicon

**替换前：**

```typescript
<img src="/logo.webp" alt="Logo" />
<img src="/favicon.ico" alt="Favicon" />
```

**替换后：**

```typescript
import { getLogoUrl, getFaviconUrl } from "@/lib/asset-loader";

<img src={getLogoUrl()} alt="Logo" />
<img src={getFaviconUrl()} alt="Favicon" />
```

---

### 2. Sidebar 图标

**替换前：**

```typescript
const userNavigation = [
  {
    href: "/home",
    iconPath: "/imgs/icons/sidebar/sidebar_home_icon.webp",
  },
  // ...
];
```

**替换后：**

```typescript
import { getSidebarIconUrl } from "@/lib/asset-loader";

const userNavigation = [
  {
    href: "/home",
    iconPath: getSidebarIconUrl("sidebar_home_icon"),
  },
  // ...
];
```

**所有 sidebar 图标名称：**

- `sidebar_home_icon`
- `sidebar_creations_icon`
- `sidebar_profile_icon`
- `sidebar_community_icon`
- `sidebar_oc_maker_icon`
- `sidebar_image_generator_icon`
- `sidebar_video_generator_icon`
- `sidebar_chat_icon`
- `sidebar_oc_apps_icon`

---

### 3. 模型图标

**替换前：**

```typescript
<img src="/imgs/models/openai.svg" alt="OpenAI" />
<img src="/imgs/models/seedream_4.webp" alt="Seedream 4" />
```

**替换后：**

```typescript
import { getModelIconUrl } from "@/lib/asset-loader";

<img src={getModelIconUrl("openai", "svg")} alt="OpenAI" />
<img src={getModelIconUrl("seedream_4", "webp")} alt="Seedream 4" />
```

---

### 4. 会员徽章

**替换前：**

```typescript
<img src="/imgs/icons/members/pro_member_badge.webp" alt="Pro" />
<img src="/imgs/icons/members/sub_only.webp" alt="Subscriber Only" />
```

**替换后：**

```typescript
import { getMemberBadgeUrl } from "@/lib/asset-loader";

<img src={getMemberBadgeUrl("pro_member")} alt="Pro" />
<img src={getMemberBadgeUrl("sub_only")} alt="Subscriber Only" />
```

**所有徽章类型：**

- `pro_member`
- `basic_member`
- `plus_member`
- `free_member`
- `sub_only`

---

### 5. 动漫风格示例图

**替换前：**

```typescript
<img src="/imgs/anime_styles/anime.webp" alt="Anime Style" />
<img src="/imgs/anime_styles/chibi.webp" alt="Chibi Style" />
```

**替换后：**

```typescript
import { getAnimeStyleImageUrl } from "@/lib/asset-loader";

<img src={getAnimeStyleImageUrl("anime")} alt="Anime Style" />
<img src={getAnimeStyleImageUrl("chibi")} alt="Chibi Style" />
```

**所有风格名称：**

- `anime`, `ghiblio`, `chibi`, `cyberpunk`
- `cinematic_anime`, `american_comics`, `watercolor`, `pixel_retro`

---

### 6. OC 风格示例图

**替换前：**

```typescript
<img src="/imgs/oc_styles/cyberpunk.webp" alt="Cyberpunk OC" />
```

**替换后：**

```typescript
import { getOCStyleImageUrl } from "@/lib/asset-loader";

<img src={getOCStyleImageUrl("cyberpunk")} alt="Cyberpunk OC" />
```

---

### 7. 手办模板图片

**替换前：**

```typescript
<img src="/imgs/figure_templates/action-figure-template-1.webp" alt="Template 1" />
```

**替换后：**

```typescript
import { getActionFigureTemplateUrl } from "@/lib/asset-loader";

<img src={getActionFigureTemplateUrl(1)} alt="Template 1" />
```

**模板编号：** 1-6

---

### 8. 工具图标 (Creamy)

**替换前：**

```typescript
<img src="/creamy/creation_tool_icon/anime_generator.webp" alt="Anime Generator" />
<img src="/creamy/creation_tool_icon/video_generator.webp" alt="Video Generator" />
```

**替换后：**

```typescript
import { getToolIconUrl } from "@/lib/asset-loader";

<img src={getToolIconUrl("anime_generator")} alt="Anime Generator" />
<img src={getToolIconUrl("video_generator")} alt="Video Generator" />
```

---

### 9. Creamy 装饰图标

**替换前：**

```typescript
<img src="/creamy/decorations/bow_tile.webp" alt="Bow" />
<img src="/creamy/decorations/foot.webp" alt="Foot" />
```

**替换后：**

```typescript
import { getCreamyDecorationUrl } from "@/lib/asset-loader";

<img src={getCreamyDecorationUrl("bow_tile")} alt="Bow" />
<img src={getCreamyDecorationUrl("foot")} alt="Foot" />
```

---

### 10. Creamy 角色图标

**替换前：**

```typescript
<img src="/creamy/meow_coin.webp" alt="Meow Coin" />
<img src="/creamy/ap.webp" alt="AP" />
```

**替换后：**

```typescript
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

<img src={getCreamyCharacterUrl("meow_coin")} alt="Meow Coin" />
<img src={getCreamyCharacterUrl("ap")} alt="AP" />
```

---

### 11. 支付图标

**替换前：**

```typescript
<img src="/imgs/cnpay.png" alt="CnPay" />
```

**替换后：**

```typescript
import { getPaymentIconUrl } from "@/lib/asset-loader";

<img src={getPaymentIconUrl("cnpay")} alt="CnPay" />
```

---

## 通用图片 URL 方法详解

### 新增 `getImageUrl()` 方法

**推荐使用场景：**

- 配置文件中的动态路径（如 JSON 配置）
- 组件中需要动态构建的图片 URL
- 不确定路径格式的情况

**使用方法：**

```typescript
import { getImageUrl } from "@/lib/asset-loader";

// 1. 直接使用（自动添加前缀）
const imageUrl = getImageUrl("/imgs/icons/example.webp");
// 结果: https://artworks.anividai.com/assets/imgs/icons/example.webp

// 2. 从配置中读取
const config = {
  icon: "/imgs/icons/benefits-1.webp"
};
<img src={getImageUrl(config.icon)} alt="Benefit" />

// 3. 动态路径
const iconName = "home";
<img src={getImageUrl(`/imgs/icons/sidebar/${iconName}.webp`)} alt={iconName} />

// 4. 外部 URL（直接返回）
<img src={getImageUrl("https://example.com/image.webp")} alt="External" />
```

**优势：**

- ✅ 智能识别路径类型
- ✅ 自动添加 R2/CDN 前缀
- ✅ 支持外部 URL 直接返回
- ✅ 简化组件代码

### 配置文件中的使用

**建议方式：** 保持配置简洁，使用 `getImageUrl()` 包装

```typescript
// ❌ 不推荐：配置中写死完整 URL
{
  "icon": "https://artworks.anividai.com/assets/imgs/icons/example.webp"
}

// ✅ 推荐：配置中保持相对路径
{
  "icon": "/imgs/icons/example.webp"
}

// ✅ 组件中使用 getImageUrl 包装
<img src={getImageUrl(config.icon)} alt="Icon" />
```

### 何时使用专用方法 vs 通用方法

| 场景                   | 推荐方法              | 原因               |
| ---------------------- | --------------------- | ------------------ |
| 固定路径（如 Logo）    | `getLogoUrl()`        | 语义清晰，类型安全 |
| 已知类型（如会员徽章） | `getMemberBadgeUrl()` | 专用方法更清晰     |
| 动态或不确定路径       | `getImageUrl()`       | 智能识别，自动处理 |
| 配置文件读取           | `getImageUrl()`       | 保持配置简洁       |

---

## 关键文件更新列表

### 1. `src/components/blocks/app-sidebar/index.tsx`

**需要替换的图标路径：**

- `/imgs/icons/sidebar/sidebar_*.webp`

**替换为：**

```typescript
import { getSidebarIconUrl } from "@/lib/asset-loader";

const userNavigation = [
  {
    href: "/home",
    iconPath: getSidebarIconUrl("sidebar_home_icon"),
  },
  // ...
];
```

### 2. `src/components/blocks/pricing/index.tsx`

**需要替换的图标路径：**

- `/creamy/meow_coin.webp`
- `/imgs/cnpay.png`

**替换为：**

```typescript
import { getCreamyCharacterUrl, getPaymentIconUrl } from "@/lib/asset-loader";

// 替换 meow_coin
<img src={getCreamyCharacterUrl("meow_coin")} alt="Meow Coin" />

// 替换 cnpay
<img src={getPaymentIconUrl("cnpay")} alt="CnPay" />
```

### 3. `src/components/console/tools/CreationTools.tsx`

**需要替换的图标路径：**

- `/creamy/creation_tool_icon/*.webp`

**替换为：**

```typescript
import { getToolIconUrl } from "@/lib/asset-loader";

// 替换 anime_generator
<img src={getToolIconUrl("anime_generator")} alt="Anime Generator" />

// 替换 video_generator
<img src={getToolIconUrl("video_generator")} alt="Video Generator" />
```

### 4. `src/components/blocks/app-header/index.tsx`

**需要替换的图标路径：**

- `/creamy/meow_coin.webp`

**替换为：**

```typescript
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

<img src={getCreamyCharacterUrl("meow_coin")} alt="Meow Coin" />
```

### 5. `src/components/chat/*`

**需要替换的图标路径：**

- `/creamy/decorations/*.webp`
- `/creamy/ap.webp`

**替换为：**

```typescript
import {
  getCreamyDecorationUrl,
  getCreamyCharacterUrl,
} from "@/lib/asset-loader";

// 替换 decorations/pad
<img src={getCreamyDecorationUrl("pad")} alt="Pad" />

// 替换 ap
<img src={getCreamyCharacterUrl("ap")} alt="AP" />
```

### 6. `src/components/anime-generator/*`

**需要替换的图标路径：**

- `/imgs/icons/members/sub_only.webp`
- `/creamy/meow_coin.webp`

**替换为：**

```typescript
import {
  getMemberBadgeUrl,
  getCreamyCharacterUrl,
} from "@/lib/asset-loader";

// 替换 sub_only
<img src={getMemberBadgeUrl("sub_only")} alt="Subscriber Only" />

// 替换 meow_coin
<img src={getCreamyCharacterUrl("meow_coin")} alt="Meow Coin" />
```

### 7. `src/components/chat/ModelSelector.tsx`

**需要替换的图标路径：**

- `/imgs/models/openai.svg`
- `/imgs/icons/members/sub_only.webp`

**替换为：**

```typescript
import { getModelIconUrl, getMemberBadgeUrl } from "@/lib/asset-loader";

// 替换模型图标
const modelIcons = {
  base: getModelIconUrl("openai", "svg"),
  premium: getModelIconUrl("openai", "svg"),
};

// 替换会员徽章
<img src={getMemberBadgeUrl("sub_only")} alt="Subscription required" />
```

### 8. `src/components/anime-page/Benefits.tsx`

**需要替换的图标路径：**

- `/imgs/icons/anime-benefits/benefit_*.webp`

**替换为：**

```typescript
import { assetLoader } from "@/lib/asset-loader";

const benefits = [
  {
    icon: assetLoader.getImageUrl("/imgs/icons/anime-benefits/benefit_1.webp"),
    title: "Character Consistency",
    description: "...",
  },
  // ... 其他项
];
```

### 9. `src/components/oc-maker/Introduction.tsx` 和 `src/components/anime-page/Introduction.tsx`

**需要替换的图标路径：**

- `creamy/decorations/bow_tile.webp`

**替换为：**

```typescript
import { getCreamyDecorationUrl } from "@/lib/asset-loader";

<img src={getCreamyDecorationUrl("bow_tile")} alt="Badge" />
```

### 10. `src/components/community/detail/OcDetailContent.tsx`

**需要替换的图标路径：**

- `/creamy/decorations/bow_tile.webp`

**替换为：**

```typescript
import { getCreamyDecorationUrl } from "@/lib/asset-loader";

<img src={getCreamyDecorationUrl("bow_tile")} alt="Decoration" />
```

---

## 资源上传

### 批量上传脚本

**文件：** `scripts/upload-public-assets.sh`

**使用方法：**

```bash
# 1. 添加执行权限
chmod +x scripts/upload-public-assets.sh

# 2. 执行上传
./scripts/upload-public-assets.sh
```

**功能：**

- 自动化上传所有 public 资源到 R2
- 按目录分类上传：Logo、Favicon、Sidebar图标、模型图标、会员徽章、动漫风格图、OC风格图、手办模板、Creamy图标、邮件模板等

---

## 邮件服务更新

**文件：** `src/services/email.ts`

**关键修改：**

```typescript
// ❌ 旧实现（Node.js fs）
const templatePath = join(
  process.cwd(),
  "public",
  "emails",
  `${template}.html`,
);
let htmlContent = await readFile(templatePath, "utf-8");

// ✅ 新实现（Cloudflare Workers + R2）
import { getEmailTemplateUrl } from "@/lib/asset-loader";

const templateUrl = getEmailTemplateUrl(template);
const response = await fetch(templateUrl);
const htmlContent = await response.text();
```

---

## 验证迁移

### 1. 开发环境

开发环境下，资源从 R2/CDN 加载（需配置环境变量）。

**配置方法：**

```bash
# .env.local
NEXT_PUBLIC_STORAGE_DOMAIN=http://localhost:8787/assets
STORAGE_DOMAIN=http://localhost:8787/assets
```

**验证方法：**

```typescript
import { assetLoader } from "@/lib/asset-loader";

// 检查环境信息
console.log(assetLoader.getEnvironmentInfo());
// 输出: { environment: 'development', storageDomain: 'http://localhost:8787/assets', isCloudflare: false }
```

### 2. 生产环境

生产环境下，资源从 R2 + CDN 加载。

**验证方法：**

```typescript
import { assetLoader } from "@/lib/asset-loader";

// 检查环境信息
console.log(assetLoader.getEnvironmentInfo());
// 输出: { environment: 'production', storageDomain: 'https://artworks.anividai.com', isCloudflare: true }
```

---

## 迁移清单

### 环境配置

- [ ] 配置开发环境变量 `NEXT_PUBLIC_STORAGE_DOMAIN`
- [ ] 配置生产环境变量 `NEXT_PUBLIC_STORAGE_DOMAIN` 和 `STORAGE_DOMAIN`

### 资源上传

- [ ] 上传所有 public 资源到 R2

### 代码更新

- [x] 更新 `src/components/blocks/app-sidebar/index.tsx`
- [x] 更新 `src/components/blocks/pricing/index.tsx`
- [x] 更新 `src/components/console/tools/CreationTools.tsx`
- [x] 更新 `src/components/blocks/app-header/index.tsx`
- [x] 更新 `src/components/chat/*` 相关文件
- [x] 更新 `src/components/chat/ModelSelector.tsx`
- [x] 更新 `src/components/anime-generator/*` 相关文件
- [x] 更新 `src/components/anime-page/Benefits.tsx`
- [x] 更新 `src/components/anime-page/Introduction.tsx`
- [x] 更新 `src/components/oc-maker/*` 相关文件
- [x] 更新 `src/components/oc-maker/Introduction.tsx`
- [x] 更新 `src/components/community/detail/OcDetailContent.tsx`
- [x] 更新 `src/components/console/user-center/UserInfoCard.tsx`
- [x] 更新 `src/components/community/ArtworkCard.tsx`
- [x] 更新 `src/components/community/detail/ArtworkDetailModal.tsx`
- [x] 更新页面文件中的 favicon 引用
- [x] 更新 `src/services/email.ts` 邮件服务

### 测试验证

- [x] 开发环境测试验证（使用 R2 资源）
- [x] 生产环境测试验证（使用 R2 资源）
- [x] 构建测试通过（npm run build 成功）

---

## 渐进式迁移计划

### 第一批（1天）

- 上传所有资源到 R2
- 更新 `app-sidebar` 组件

### 第二批（2天）

- 更新 `pricing` 组件
- 更新 `CreationTools` 组件

### 第三批（2天）

- 更新所有 `chat` 相关组件
- 更新所有 `anime-generator` 相关组件

### 第四批（1天）

- 更新剩余组件和页面
- 更新邮件服务
- 全面测试

---

## 常见问题

### Q1: 开发环境如何配置资源加载？

**A:** 开发环境需要配置环境变量指向 R2 服务：

```bash
# .env.local
NEXT_PUBLIC_STORAGE_DOMAIN=http://localhost:8787/assets
```

> **注意**：需要先启动 R2 兼容的开发服务器（如使用 `wrangler dev`）

### Q2: 如何处理动态加载的图片？

**A:** 使用 `getPublicAssetUrl()` 通用方法：

```typescript
const imageUrl = getPublicAssetUrl(`imgs/custom/${dynamicName}.webp`);
```

### Q3: 如何预加载关键资源？

**A:** 使用 `preloadAssets` 方法：

```typescript
import { assetLoader } from "@/lib/asset-loader";

// 在组件中
useEffect(() => {
  assetLoader.preloadAssets([
    "logo.webp",
    "imgs/icons/sidebar/sidebar_home_icon.webp",
  ]);
}, []);
```

### Q4: 如何处理图片加载失败？

**A:** 使用 React 的错误边界或 onError 处理：

```typescript
<img
  src={getLogoUrl()}
  alt="Logo"
  onError={(e) => {
    // 加载失败时使用默认图片
    e.currentTarget.src = "/placeholder.png";
  }}
/>
```

### Q5: 为什么开发环境不能使用本地 public/ 目录？

**A:** 统一使用 R2/CDN 的原因：

- 保持开发/生产环境一致性
- 避免路径差异导致的 bug
- 提前在开发阶段验证 R2 资源加载
- 简化部署流程

---

## 技术优势

### 性能提升

1. **CDN 加速**：全球边缘节点缓存，加载速度提升 30-50%
2. **资源压缩**：R2 自动压缩，节省带宽
3. **缓存优化**：浏览器缓存 + CDN 缓存双重优化

### 维护性提升

1. **统一管理**：所有资源通过 `assetLoader` 统一管理
2. **类型安全**：TypeScript 提供完整的类型提示
3. **环境适配**：统一逻辑，开发/生产环境一致
4. **文档完善**：详细的文档和示例，易于维护

### 成本优化

1. **减少带宽成本**：CDN 缓存减少源站请求
2. **简化部署**：无需在构建时复制大量静态资源
3. **存储优化**：R2 存储成本低于传统对象存储

---

## 相关资源

- [AssetLoader 完整 API 文档](../../../../src/lib/asset-loader.ts)
- [上传脚本使用说明](../../../../scripts/upload-public-assets.sh)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)

---

## 更新日志

### v2.1.0 - 新增通用图片 URL 方法

**核心变更**：

- ✅ 新增 `getImageUrl()` 通用方法，支持智能路径识别
- ✅ 自动添加 R2/CDN 前缀，简化组件代码
- ✅ 支持多种路径格式：`/imgs/...`、`imgs/...`、`assets/...`、外部 URL
- ✅ 配置文件保持简洁路径，使用 `getImageUrl()` 包装

**影响**：

- 组件代码更简洁，减少重复代码
- 配置文件无需写死前缀，便于维护
- 支持动态路径和配置文件读取

**迁移步骤**：

1. 保持配置中的相对路径（如 `/imgs/icons/example.webp`）
2. 组件中使用 `getImageUrl(config.icon)` 包装
3. 测试验证所有图片正常加载

### v2.0.0 - 统一资源加载逻辑

**核心变更**：

- ✅ 所有环境（开发/生产）统一使用 R2/CDN 资源
- ✅ 移除本地 `public/` 目录路径的特殊处理
- ✅ 开发环境需要配置 `NEXT_PUBLIC_STORAGE_DOMAIN` 环境变量
- ✅ 增强错误提示，未配置环境变量时会报错

**影响**：

- 简化代码逻辑，避免环境差异
- 提前在开发阶段验证 R2 资源加载
- 减少部署时的问题

**迁移步骤**：

1. 为开发环境配置 `NEXT_PUBLIC_STORAGE_DOMAIN=http://localhost:8787/assets`
2. 为生产环境配置 `NEXT_PUBLIC_STORAGE_DOMAIN=https://artworks.anividai.com/assets`
3. 测试验证所有资源正常加载

---

**文档版本：** v2.1.0
**创建日期：** 2025-11-23
**最后更新：** 2025-11-23
**负责人：** 技术团队
