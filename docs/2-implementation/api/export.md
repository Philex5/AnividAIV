# OC 导出 API (FEAT-SHARE-EXPORTS)

**Related:**
- Feature: `docs/2-implementation/features/feature-share-exports.md`
- Character API: `docs/2-implementation/api/characters.md`
- Share API: `docs/2-implementation/api/community.md`

## 当前版本 (v1.0)

### 概述

OC 导出功能提供多种格式的角色数据导出，包括炫酷分享卡片、JSON 数据和 Markdown 文档。支持公开角色的卡片导出和私有角色的完整数据导出。

### 核心功能

- **炫酷分享卡片生成** - 支持 TCG/海报/名片多种模板
- **JSON 数据导出** - 开发者友好的结构化数据
- **Markdown 文档导出** - 可编辑的角色档案

---

## API 端点

### 1. 分享卡片生成 API

#### 1.1 OG 标签图片生成

生成角色的炫酷分享卡片，用作社交分享封面或下载保存。

```http
GET /api/og/character/{uuid}
```

**URL 参数:**
- `uuid` (string, required): 角色 UUID
- `template` (string, optional): 卡片模板类型
  - `tcg` (默认): TCG 卡牌风格（游戏王风格）
  - `movie`: 电影海报风格
  - `business-card`: 名片风格
- `rarity` (string, optional): 稀有度（仅适用于 TCG 模板）
  - `ssr`: 超稀有（金色特效）
  - `sr`: 稀有（银色特效）
  - `r`: 普通（铜色特效）
- `theme` (string, optional): 主题色彩
  - `dark` (默认): 深色主题
  - `light`: 浅色主题
  - `cyberpunk`: 赛博朋克风格
  - `minimal`: 简约风格

**权限:**
- 公开角色：所有用户可访问
- 私有角色：仅所有者可访问

**响应:**
```
Content-Type: image/png
[PNG 图片流，1200x630 分辨率]
```

**错误响应:**
- `404 Not Found`: 角色不存在或无访问权限
- `500 Internal Server Error`: 图片生成失败

**示例请求:**
```bash
# 生成 TCG 风格 SSR 稀有度卡片
GET /api/og/character/123e4567-e89b-12d3-a456-426614174000?template=tcg&rarity=ssr&theme=dark

# 生成电影海报风格卡片
GET /api/og/character/123e4567-e89b-12d3-a456-426614174000?template=movie&theme=cyberpunk
```

**使用场景:**
- 社交媒体分享封面
- OG 标签预览图
- 用户下载保存
- 角色展示卡片

---

### 2. 角色数据导出 API

#### 2.1 JSON 数据导出

导出角色完整数据为 JSON 格式。

```http
GET /api/export/character/{uuid}/json
```

**URL 参数:**
- `uuid` (string, required): 角色 UUID
- `include` (string, optional): 包含内容
  - `sensitive` (默认): 包含所有数据（包括私有字段）
  - `public`: 仅包含公开信息
- `version` (string, optional): API 版本
  - `1` (默认): v1.0 格式
  - `2`: v2.0 格式（向后兼容）

**权限:**
- 仅限角色所有者访问
- 需要用户登录认证

**响应:**
```
Content-Type: application/json
Content-Disposition: attachment; filename="{角色名}.json"
```

**JSON 数据结构:**
```json
{
  "version": "1.0",
  "exported_at": "2026-01-23T10:00:00.000Z",
  "character": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "name": "角色名称",
    "gender": "female",
    "species": "人类",
    "role": "法师",
    "age": 20,
    "brief_introduction": "简短介绍",
    "personality_tags": ["温柔", "聪明"],
    "tags": ["魔法", "学院"],
    "visibility_level": "public",
    "allow_remix": true,
    "modules": {
      "appearance": { ... },
      "personality": { ... },
      "background": { ... }
    },
    "stats": {
      "like_count": 100,
      "favorite_count": 50,
      "comment_count": 10
    },
    "creator": {
      "uuid": "creator-uuid",
      "display_name": "创作者名"
    },
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

**错误响应:**
- `401 Unauthorized`: 未登录
- `403 Forbidden`: 非角色所有者
- `404 Not Found`: 角色不存在

**示例请求:**
```bash
# 导出完整数据
GET /api/export/character/123e4567-e89b-12d3-a456-426614174000/json?include=sensitive&version=1

# 仅导出公开数据
GET /api/export/character/123e4567-e89b-12d3-a456-426614174000/json?include=public&version=1
```

#### 2.2 Markdown 文档导出

导出角色档案为 Markdown 格式。

```http
GET /api/export/character/{uuid}/markdown
```

**URL 参数:**
- `uuid` (string, required): 角色 UUID
- `template` (string, optional): 模板类型
  - `detailed` (默认): 详细文档
  - `concise`: 简洁版本
- `locale` (string, optional): 文档语言
  - `en` (默认): 英文
  - `ja`: 日文

**权限:**
- 仅限角色所有者访问
- 需要用户登录认证

**响应:**
```
Content-Type: text/markdown
Content-Disposition: attachment; filename="{角色名}.md"
```

**Markdown 内容结构:**
```markdown
# 角色名称

## 基本信息
- **性别**: 女性
- **年龄**: 20
- **种族**: 人类
- **职业**: 法师

## 角色简介
简短介绍

## 背景故事
完整的背景故事

## 外观特征
详细的外观描述

## 性格特征
性格分析

## 标签
#魔法 #学院
```

**错误响应:**
- `401 Unauthorized`: 未登录
- `403 Forbidden`: 非角色所有者
- `404 Not Found`: 角色不存在

**示例请求:**
```bash
# 导出详细文档
GET /api/export/character/123e4567-e89b-12d3-a456-426614174000/markdown?template=detailed&locale=en
```

---

## 速率限制

- **卡片生成**: 每用户每分钟 30 次
- **JSON/Markdown 导出**: 每用户每小时 20 次
- **超限响应**: `429 Too Many Requests`

## 缓存策略

- **卡片图片**: 基于 `{uuid}_{template}_{rarity}_{theme}` 键缓存，7 天过期
- **JSON/Markdown**: 不缓存（实时生成）

## 性能指标

- **卡片生成**: < 2 秒
- **JSON/Markdown**: < 1 秒

## 错误码

- `ERR_CHARACTER_NOT_FOUND` (404): 角色不存在
- `ERR_ACCESS_DENIED` (403): 权限不足
- `ERR_NOT_AUTHENTICATED` (401): 未登录
- `ERR_RATE_LIMIT_EXCEEDED` (429): 频率限制
- `ERR_EXPORT_FAILED` (500): 导出失败
- `ERR_TEMPLATE_INVALID` (400): 无效的模板参数
- `ERR_UNSUPPORTED_FORMAT` (400): 不支持的格式

## 相关端点

- `GET /api/characters/{uuid}`: 获取角色基本信息
- `GET /api/characters/{uuid}/avatar`: 获取角色头像
- `GET /api/characters/{uuid}/profile`: 获取角色详情
- `POST /api/characters/{uuid}/like`: 点赞角色
- `POST /api/characters/{uuid}/favorite`: 收藏角色

## 变更历史

- 2026-01-23 FEAT-SHARE-EXPORTS 初始版本：支持卡片生成、JSON、Markdown 导出
