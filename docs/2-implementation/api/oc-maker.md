**Related**: [feature-oc-maker](../features/feature-oc-maker.md)

# API 契约：OC Maker（角色创建/管理/生成）

## 当前版本

- Version: v1.0
- Auth: 视接口而定
- Errors: 统一英文

## 角色列表与创建

- GET /api/oc-maker/characters
  - 用途：获取当前用户的角色列表（分页）
  - Auth: Required
  - 位置：`src/app/api/oc-maker/characters/route.ts`
  - Query:
    - `page, limit`
    - `favorite` (可选，`true` 时返回当前用户收藏的角色列表)
    - 备注：响应结构保持 `{ characters, page, limit }`，角色项会附带 `favorited: true`

- GET /api/oc-maker/public/characters
  - 用途：公开角色列表（分页或按 UUID 批量获取）
  - Auth: No
  - 位置：`src/app/api/oc-maker/public/characters/route.ts`
  - Query:
    - `page, limit`
    - `uuids`（可选，逗号分隔 UUID 列表；传入时忽略分页，按输入顺序返回）

- POST /api/oc-maker/characters
  - 用途：创建新角色（包含基础信息/扩展属性/外观/故事等）
  - Auth: Required
  - 位置：`src/app/api/oc-maker/characters/route.ts`
  - Body：角色结构体（见代码中的校验项）
  - 校验要点：名称/性别必填、长度与数量上限、扩展属性/背景段落等

## 角色详情与编辑

- GET /api/oc-maker/characters/[uuid]
  - 用途：获取角色详情（仅所有者或公开角色可访问）
  - Auth: Required
  - 位置：`src/app/api/oc-maker/characters/[uuid]/route.ts`

- PUT /api/oc-maker/characters/[uuid]
  - 用途：更新角色信息（多字段，含可见性/主题等）
  - Auth: Required；需通过 `validateCharacterOwnership`
  - 位置：`src/app/api/oc-maker/characters/[uuid]/route.ts`

- DELETE /api/oc-maker/characters/[uuid]
  - 用途：删除角色
  - Auth: Required；需所有者权限
  - 位置：`src/app/api/oc-maker/characters/[uuid]/route.ts`

- POST/DELETE /api/community/artworks/[uuid]/like
  - 用途：点赞/取消点赞
  - Auth: Required
  - 位置：`src/app/api/community/artworks/[uuid]/like/route.ts`

- POST/DELETE /api/community/artworks/[uuid]/favorite
  - 用途：收藏/取消收藏
  - Auth: Required
  - 位置：`src/app/api/community/artworks/[uuid]/favorite/route.ts`

## 生成相关（图片/头像）

- POST /api/oc-maker/characters/generate-image
  - 用途：基于完整角色数据生成立绘图
  - Auth: Required
  - 位置：`src/app/api/oc-maker/characters/generate-image/route.ts`
  - Body：`{ character_data, art_style?, aspect_ratio?, model_uuid?, custom_prompt_additions? }`

- POST /api/oc-maker/characters/generate-avatar
  - 用途：基于参考图生成头像图（不强制依赖 character_uuid）
  - Auth: Required
  - 位置：`src/app/api/oc-maker/characters/generate-avatar/route.ts`
  - Body：`{ reference_image_urls: string[], model_uuid?, character_data? }`

## 配置

- GET /api/oc-maker/config
  - 用途：获取 OC Maker 相关的枚举/主题/默认生成参数/验证规则等
  - Auth: No
  - 位置：`src/app/api/oc-maker/config/route.ts`

- POST /api/oc-maker/config
  - 用途：验证前端角色数据（不同 configType 维度）
  - Auth: No
  - 位置：`src/app/api/oc-maker/config/route.ts`
  - Body: `{ characterData, configType = 'basic'|'story'|'all' }`

## 快速生成（一句话生成完整 OC）

- POST /api/oc-maker/quick-generate
  - 用途：用户一句话描述 → LLM 解析并创建角色记录，可选自动触发立绘生成任务
  - Auth: Required
  - 位置：`src/app/api/oc-maker/quick-generate/route.ts`
  - Body：`{ description, auto_generate_image?, art_style? }`
  - 备注：文本解析成功后扣除 1 credit；如启用自动生图，会按角色生图规则额外扣费

## Tag 系统

- GET /api/tags/presets
  - 用途：获取预置标签分类与热门标签，供 TagEditor 自动补全与推荐使用
  - Auth: No
  - 位置：`src/app/api/tags/presets/route.ts`
  - Response:
    ```json
    {
      "version": "2026-01-11",
      "updated_at": "2026-01-11T00:00:00.000Z",
      "categories": [{ "id": "genre", "title": "Genre & Setting", "tags": ["cyberpunk"] }],
      "popular": [{ "tag": "cyberpunk", "label": "Cyberpunk", "category": "genre" }]
    }
    ```

- PUT /api/oc-maker/characters/[uuid]
  - 用途：更新角色 Tag 列表（最多 20 个）
  - 备注：服务端使用 `normalizeTagList` 统一格式、敏感词过滤、去重；为空数组时清空全部 Tag

- GET /api/oc-maker/characters?tags=tag1,tag2
  - 用途：按标签筛选角色列表
  - 备注：多个标签以逗号分隔，内部使用表达式索引加速

## 伪代码（生成）

```
POST /characters/generate-image:
  assert(auth)
  validate(character_data,...)
  req = buildGenerationRequest(type='image', character_data,...)
  return createGeneration(req)

POST /characters/generate-avatar:
  assert(auth)
  validate(reference_image_urls)
  req = buildGenerationRequest(type='avatar', refs)
  return createGeneration(req)
```

## 变更历史

- 2025-10-20 v1.0 首次补齐（角色 CRUD、互动、生成、配置）
- 2025-10-22 FEAT-my-ocs-favorites 扩展角色列表接口支持 `favorite=true` 过滤
- 2026-01-04 FEAT-QUICK-GEN 新增 quick-generate（/api/oc-maker/quick-generate）
- 2026-01-28 FEAT-OC-REBUILD 公开角色列表支持 `uuids` 批量查询
