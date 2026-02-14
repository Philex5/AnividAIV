# 世界观详情页设计

**Related**: FEAT-WORLDS | [feature-worlds.md](../features/feature-worlds.md)

## 页面路径

- `/worlds/[uuid]`
- **权限要求**：公开世界观可直接访问；私有世界观需订阅且为创建者

## 页面目标

- 展示世界观的主题化信息（封面、名称、简介、主题配置）。
- 提供关联角色入口与世界观内容沉浸感。
- 与角色详情页的世界观主题保持一致性。

## 数据依赖

- `GET /api/worlds/[id]`：世界观详情
- `GET /api/worlds`：用于扩展推荐或相关世界观模块（可选）
- `GET /api/worlds/[id]/comments`：评论列表
- `POST /api/worlds/[id]/comments`：新增评论
- `DELETE /api/worlds/[id]/comments/[commentId]`：删除评论
- `POST /api/worlds/[id]/like` / `DELETE /api/worlds/[id]/like`：点赞/取消
- `POST /api/worlds/[id]/favorite` / `DELETE /api/worlds/[id]/favorite`：收藏/取消
- `POST /api/worlds/[id]/share`：分享记录

## 页面结构（建议）

1. **Header**：封面图、名称、简介、可见性标签（visibility_level）
2. **概览卡**：主要种族/气候/配色/关键词（可根据 config 渲染）
3. **图库**：世界观视觉资源与设定插画
4. **关联角色**：该世界观下的角色列表与跳转入口
5. **社交区**：点赞/收藏/分享入口 + 计数、评论列表与输入框
6. **操作区**：编辑入口（仅创建者显示）

## 封面图解析规则

- **字段**：`oc_worlds.cover_url`
- **字段约定**：
  - `http/https` 开头：视为用户上传 URL，直接使用
  - 其他情况：视为 `image_uuid`
- **读取逻辑**：
  - `image_uuid` -> `GET /api/generation/image-resolve/[uuid]`（`size=auto`）
  - 优先使用 `resolved_url`，缺失时回退 `original_url`
- **说明**：
  - 详见 `docs/2-implementation/api/generation.md`

### 伪代码（解析逻辑）

```ts
function resolveWorldCover(input: string, size = "auto") {
  if (isHttpUrl(input)) return { resolvedUrl: input, originalUrl: input };

  const { data } = await fetchJson(`/api/generation/image-resolve/${input}?size=${size}`);
  return {
    resolvedUrl: data.resolved_url || data.original_url,
    originalUrl: data.original_url,
  };
}
```

## 图库设计（保留）

**世界观详情页的图库**（Gallery/Media/图片集）是提升世界观吸引力和沉浸感的重要模块，尤其适合展示地图、设定插画、气氛图、官方/用户共创图片等。

### 1. 推荐位置
- 顶部封面下方单独一块
- 作为一个 Tab 或可折叠区
- 扩展信息区内的独立卡片

### 2. 简图优化（含图库）

```
┌──────────────────────────────────────────────┐
│ [世界观封面图]                               │
│                                              │
│ 名称：艾尔兰大陆                             │
│ 简介：一个充满魔法与精灵的奇幻世界。         │
│─────────────────────────────────────────────│
│ 主要种族：精灵 / 人类 / 兽人                 │
│ 气候/环境：温带，四季分明                    │
│─────────────────────────────────────────────│
│ [图库]                                       │
│ ┌───────────────┬───────────────┬──────────┐ │
│ │ [图片1缩略图] │ [图片2缩略图] │ [上传/添加]│ │
│ └───────────────┴───────────────┴──────────┘ │
│ （点击可放大，支持轮播/全屏）                │
│─────────────────────────────────────────────│
│─────────────────────────────────────────────│
│ [相关角色]                                   │
│   ◯ 角色头像1  ◯ 角色头像2  ◯ 角色头像3 ...  │
│   [查看更多角色]                             │
│─────────────────────────────────────────────│
│ [编辑] [分享] [收藏]                         │
└──────────────────────────────────────────────┘
```

### 3. 图库功能建议

- 缩略图瀑布流/横排，点击可放大、轮播、全屏查看。
- 支持上传/添加（仅创建者或有权限用户可见）。
- 图片类型可多样：地图、设定插画、气氛图、用户共创等。
- 图片描述：每张图片可有标题/说明。
- 图片管理：支持排序、删除、编辑描述。

## UX 补充

- 移动端：图库横滑或瀑布流，点击全屏预览。
- 权限控制：仅世界观主理人/协作者可上传、管理图片。
- 图片来源：支持 AI 生成、用户上传、图库选择。
- 社交权限：非公开世界观隐藏社交入口；未登录点击社交动作提示登录。
- 互动状态：点赞/收藏为本地乐观更新，失败时回滚并提示英文错误。

## 涉及文件

- `src/app/[locale]/(default)/worlds/[uuid]/page.tsx`
- `src/components/worlds/WorldSocialSection.tsx`（建议新增）
- `src/i18n/pages/world/en.json`

## 变更历史

- 2026-01-22 FEAT-WORLDS 补充可见性与订阅访问说明（影响：页面/权限）
- 2026-01-25 FEAT-IMAGE-ASSET-UNIFY 统一封面图解析规则（cover_url 支持 uuid）
