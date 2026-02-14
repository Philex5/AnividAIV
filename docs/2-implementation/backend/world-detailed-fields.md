# 世界观字段细化设计

**Related**: FEAT-OC-REBUILD

## 背景与目标

根据 OC 系统重构需求，世界观（world）需要支持创建和查看页面，因此需要将字段从简单的 `extra` 扩展字段中提升为独立的表级字段，以优化性能和用户体验。

## 设计原则

1. **性能优先**：高频查询和展示的字段提升到表级，避免 JSONB 嵌套查询
2. **灵活扩展**：复杂结构使用 JSONB 存储，保持扩展性
3. **国际化支持**：预置内容使用 i18n key，用户自定义内容直接存储
4. **与预置世界观打通**：代表颜色等字段支持主题化

## 字段分类设计

### 1. 核心展示字段（表级字段）

#### 1.1 基础信息（已有）

| 字段名        | 类型                  | 说明                      | 索引 |
| ------------- | --------------------- | ------------------------- | ---- |
| `name`        | VARCHAR(100) NOT NULL | 世界观名称                | -    |
| `description` | TEXT                  | 简介（最多500字）         | -    |
| `cover_url`   | TEXT                  | 封面图URL（建议1200x630） | -    |

#### 1.2 核心设定字段（新增）

| 字段名              | 类型         | 说明                  | 索引     |
| ------------------- | ------------ | --------------------- | -------- |
| `species`           | JSONB        | 主要种族列表（数组）  | GIN索引  |
| `climate`           | VARCHAR(100) | 气候/环境标识         | 普通索引 |
| `regions`           | JSONB        | 地形/地区列表（数组） | GIN索引  |
| `tech_magic_system` | VARCHAR(100) | 科技/魔法体系标识     | 普通索引 |
| `theme_colors`      | JSONB        | 代表颜色（主题化）    | -        |

**字段详细说明**：

**species（主要种族）**

- **格式**：字符串数组
- **示例**：
  ```json
  ["human", "elf", "drawf", "orc", "dragon_kin"]
  ```
- **使用场景**：
  - 世界观详情页展示
  - 角色创建时筛选种族选项
  - 社区搜索按种族筛选
- **索引策略**：GIN 索引支持数组元素查询

  ```sql
  CREATE INDEX idx_worlds_species ON oc_worlds USING GIN (species);

  -- 查询示例
  SELECT * FROM oc_worlds WHERE species @> '["elf"]';
  ```

**climate（气候/环境）**

- **格式**：字符串标识符
- **示例**：`"temperate_four_seasons"`, `"tropical_rainforest"`, `"arctic_tundra"`
- **国际化**：使用 i18n key，翻译存储在 `src/i18n/pages/worlds/en.json`
- **预置选项**：
  - `temperate_four_seasons` - 温带四季
  - `tropical_rainforest` - 热带雨林
  - `arctic_tundra` - 极地苔原
  - `desert` - 沙漠
  - `oceanic` - 海洋
  - `underground` - 地下
  - `custom` - 自定义（需配合 extra 字段存储详细描述）
- **索引策略**：普通索引支持快速筛选
  ```sql
  CREATE INDEX idx_worlds_climate ON oc_worlds (climate);
  ```

**regions（地形/地区）**

- **格式**：字符串数组
- **示例**：
  ```json
  ["forest", "mountains", "desert", "ocean", "underground"]
  ```
- **预置选项**：森林、山脉、沙漠、海洋、湖泊、平原、地下城、浮空岛等
- **索引策略**：GIN 索引支持数组元素查询

**tech_magic_system（科技/魔法体系）**

- **格式**：字符串标识符
- **示例**：`"medieval_magic"`, `"cyberpunk"`, `"high_fantasy"`
- **预置选项**：
  - `medieval_magic` - 中世纪魔法 🏰
  - `high_tech` - 高科技
  - `cyberpunk` - 赛博朋克 🤖
  - `steampunk` - 蒸汽朋克 ⚙️
  - `low_fantasy` - 低魔幻
  - `high_fantasy` - 高魔幻想 🔮
  - `sci_fi` - 科幻未来 🚀
  - `post_apocalyptic` - 末世废土 ☢️
- **索引策略**：普通索引，用于社区筛选

**theme_colors（代表颜色）**

- **格式**：JSON对象
- **示例**：
  ```json
  {
    "primary": "#FF6B9D",
    "secondary": "#4A90E2",
    "accent": "#FFC107",
    "background": "#1A1A2E"
  }
  ```
- **使用场景**：
  - 世界观详情页主题化
  - 角色详情页背景渐变
  - 社区卡片边框配色
- **与预置世界观打通**：预置世界观在配置文件中定义颜色，用户自定义世界观在创建时选择

### 2. 复杂结构字段（JSONB存储）

#### 2.1 主要势力/组织（factions）

- **字段名**：`factions`
- **类型**：JSONB
- **格式**：对象数组
- **Schema定义**：

```typescript
interface Faction {
  id: string; // 势力唯一标识
  name: string; // 名称（用户自定义）
  name_i18n_key?: string; // 国际化key（预置世界观）
  description?: string; // 简介（最多500字）
  description_i18n_key?: string; // 国际化key
  type: "government" | "military" | "religion" | "guild" | "other";
  alignment?: string; // 阵营：lawful_good, neutral, chaotic_evil等
  icon_url?: string; // 图标URL
}
```

- **示例数据**：

```json
[
  {
    "id": "faction_001",
    "name": "精灵议会",
    "name_i18n_key": "world.factions.elven_council.name",
    "description": "掌管森林的古老势力",
    "type": "government",
    "alignment": "lawful_good",
    "icon_url": "https://..."
  },
  {
    "id": "faction_002",
    "name": "人类帝国",
    "type": "government",
    "alignment": "lawful_neutral"
  }
]
```

- **索引策略**：

```sql
-- 为势力类型创建表达式索引
CREATE INDEX idx_worlds_faction_types ON oc_worlds
  USING GIN ((factions -> 'type'));

-- 查询示例：查找包含"政府"类型势力的世界观
SELECT * FROM oc_worlds
WHERE factions @> '[{"type": "government"}]';
```

- **限制**：最多 50 个势力

#### 2.2 历史/事件（history_timeline）

- **字段名**：`history_timeline`
- **类型**：JSONB
- **格式**：时间线数组
- **Schema定义**：

```typescript
interface HistoryEvent {
  id: string; // 事件唯一标识
  title: string; // 标题（最多200字）
  title_i18n_key?: string; // 国际化key
  description?: string; // 描述（最多1000字）
  description_i18n_key?: string; // 国际化key
  timestamp: string; // 时间标记："Age 0", "Year 2077"
  era: "ancient" | "medieval" | "modern" | "future";
  importance: "major" | "minor"; // 重要性
  image_url?: string; // 事件配图
}
```

- **示例数据**：

```json
[
  {
    "id": "event_001",
    "title": "魔法战争",
    "title_i18n_key": "world.events.magic_war.title",
    "description": "人类与精灵之间的百年战争",
    "timestamp": "Age 0",
    "era": "ancient",
    "importance": "major",
    "image_url": "https://..."
  },
  {
    "id": "event_002",
    "title": "科技觉醒",
    "timestamp": "Year 2077",
    "era": "modern",
    "importance": "major"
  }
]
```

- **索引策略**：

```sql
-- 为事件纪元创建表达式索引
CREATE INDEX idx_worlds_event_eras ON oc_worlds
  USING GIN ((history_timeline -> 'era'));
```

- **限制**：最多 100 个事件
- **排序**：前端展示时按 timestamp 排序

### 3. 扩展字段（extra - 保留）

- **字段名**：`extra`
- **类型**：JSONB
- **用途**：
  1. 用户完全自定义的属性
  2. 未来可能新增的实验性字段
  3. 第三方集成数据

- **示例数据**：

```json
{
  "custom_fields": {
    "currency_system": "魔法水晶",
    "special_festivals": ["月光祭", "收获节"],
    "unique_flora": ["发光蘑菇", "魔力树"],
    "language": "精灵语"
  },
  "integration_data": {
    "external_wiki_url": "https://...",
    "community_tag": "#cyberpunk2077"
  },
  "climate_detail": "四季分明，春季多雨，夏季炎热..." // 当 climate = 'custom' 时的详细描述
}
```

- **限制**：最多 20 个自定义键值对

## 数据库 Schema 更新

### 3.1 迁移 SQL

**文件位置**：`src/db/migrations/xxxx_world_detailed_fields.sql`

```sql
-- 新增核心字段
ALTER TABLE oc_worlds
  ADD COLUMN species JSONB DEFAULT '[]',
  ADD COLUMN climate VARCHAR(100),
  ADD COLUMN regions JSONB DEFAULT '[]',
  ADD COLUMN tech_magic_system VARCHAR(100),
  ADD COLUMN theme_colors JSONB,
  ADD COLUMN factions JSONB DEFAULT '[]',
  ADD COLUMN history_timeline JSONB DEFAULT '[]';

-- 添加注释
COMMENT ON COLUMN oc_worlds.species IS '主要种族列表（数组）';
COMMENT ON COLUMN oc_worlds.climate IS '气候/环境标识（i18n key或custom）';
COMMENT ON COLUMN oc_worlds.regions IS '地形/地区列表（数组）';
COMMENT ON COLUMN oc_worlds.tech_magic_system IS '科技/魔法体系标识';
COMMENT ON COLUMN oc_worlds.theme_colors IS '主题配色（JSON对象）';
COMMENT ON COLUMN oc_worlds.factions IS '势力/组织列表（对象数组）';
COMMENT ON COLUMN oc_worlds.history_timeline IS '历史事件时间线（对象数组）';

-- 创建索引
CREATE INDEX idx_worlds_species ON oc_worlds USING GIN (species);
CREATE INDEX idx_worlds_climate ON oc_worlds (climate);
CREATE INDEX idx_worlds_regions ON oc_worlds USING GIN (regions);
CREATE INDEX idx_worlds_tech_magic ON oc_worlds (tech_magic_system);
CREATE INDEX idx_worlds_factions ON oc_worlds USING GIN (factions);
CREATE INDEX idx_worlds_history ON oc_worlds USING GIN (history_timeline);

-- 为 JSONB 字段创建表达式索引（高频查询场景）
CREATE INDEX idx_worlds_faction_types ON oc_worlds
  USING GIN ((factions -> 'type'));

CREATE INDEX idx_worlds_event_eras ON oc_worlds
  USING GIN ((history_timeline -> 'era'));
```

### 3.2 完整表结构

```sql
CREATE TABLE oc_worlds (
  -- 主键与标识
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,

  -- 基础信息
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cover_url TEXT,

  -- 核心设定字段（新增）
  species JSONB DEFAULT '[]',
  climate VARCHAR(100),
  regions JSONB DEFAULT '[]',
  tech_magic_system VARCHAR(100),
  theme_colors JSONB,

  -- 复杂结构字段（新增）
  factions JSONB DEFAULT '[]',
  history_timeline JSONB DEFAULT '[]',

  -- 扩展字段
  extra JSONB,

  -- 配置文件路径（可选，用于预置世界观）
  config_file_path VARCHAR(255),

  -- 系统字段
  is_active BOOLEAN DEFAULT TRUE,
  visibility VARCHAR(20) DEFAULT 'public',
  creator_uuid VARCHAR(255),  -- 创建者UUID（预置世界观为NULL）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 Zod Schema 定义

**文件位置**：`src/types/world.ts`

```typescript
import { z } from "zod";

// ===== 势力/组织 Schema =====
export const FactionSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  name_i18n_key: z.string().optional(),
  description: z.string().max(500).optional(),
  description_i18n_key: z.string().optional(),
  type: z.enum(["government", "military", "religion", "guild", "other"]),
  alignment: z
    .enum([
      "lawful_good",
      "neutral_good",
      "chaotic_good",
      "lawful_neutral",
      "true_neutral",
      "chaotic_neutral",
      "lawful_evil",
      "neutral_evil",
      "chaotic_evil",
    ])
    .optional(),
  icon_url: z.string().url().optional(),
});

// ===== 历史事件 Schema =====
export const HistoryEventSchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  title_i18n_key: z.string().optional(),
  description: z.string().max(1000).optional(),
  description_i18n_key: z.string().optional(),
  timestamp: z.string().max(50),
  era: z.enum(["ancient", "medieval", "modern", "future"]),
  importance: z.enum(["major", "minor"]),
  image_url: z.string().url().optional(),
});

// ===== 主题颜色 Schema =====
export const ThemeColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  secondary: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  accent: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  background: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

// ===== 完整世界观 Schema =====
export const worldInsertSchema = z.object({
  uuid: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z
    .string()
    .max(1000, "Description must be 500 characters or less")
    .optional(),
  cover_url: z.string().url("Invalid cover URL").optional(),

  // 核心设定字段
  species: z.array(z.string()).max(20, "Maximum 20 species allowed").optional(),
  climate: z.string().max(100).optional(),
  regions: z.array(z.string()).max(20, "Maximum 20 regions allowed").optional(),
  tech_magic_system: z.string().max(100).optional(),
  theme_colors: ThemeColorsSchema.optional(),

  // 复杂结构字段
  factions: z
    .array(FactionSchema)
    .max(50, "Maximum 50 factions allowed")
    .optional(),
  history_timeline: z
    .array(HistoryEventSchema)
    .max(100, "Maximum 100 events allowed")
    .optional(),

  // 扩展字段
  extra: z.record(z.any()).optional(),

  // 系统字段
  visibility: z.enum(["public", "private"]).default("private"),
  is_active: z.boolean().default(true),
  creator_uuid: z.string().optional(),
});

export const worldUpdateSchema = worldInsertSchema.partial();

// ===== TypeScript Types =====
export type Faction = z.infer<typeof FactionSchema>;
export type HistoryEvent = z.infer<typeof HistoryEventSchema>;
export type ThemeColors = z.infer<typeof ThemeColorsSchema>;
export type worldInsert = z.infer<typeof worldInsertSchema>;
export type worldUpdate = z.infer<typeof worldUpdateSchema>;
```

## 预置世界观配置

### 4.1 配置文件示例

**文件位置**：`src/configs/worlds/cyberpunk.json`

```json
{
  "slug": "cyberpunk-2077",
  "name": "Cyberpunk 2077",
  "description": "High-tech, low-life dystopian future where mega-corporations control everything and technology has advanced beyond ethical boundaries.",
  "cover_url": "/worlds/cyberpunk-cover.jpg",

  "species": ["human", "cyborg", "android", "mutant"],
  "climate": "urban_tropical",
  "regions": ["megacity", "badlands", "underground", "corporate_zone"],
  "tech_magic_system": "cyberpunk",

  "theme_colors": {
    "primary": "#FF2A6D",
    "secondary": "#05D9E8",
    "accent": "#FFC107",
    "background": "#0A0E27"
  },

  "factions": [
    {
      "id": "corpos",
      "name_i18n_key": "world.cyberpunk.factions.corporations.name",
      "description_i18n_key": "world.cyberpunk.factions.corporations.desc",
      "type": "government",
      "alignment": "lawful_evil"
    },
    {
      "id": "nomads",
      "name_i18n_key": "world.cyberpunk.factions.nomads.name",
      "type": "other",
      "alignment": "chaotic_good"
    },
    {
      "id": "netwatch",
      "name_i18n_key": "world.cyberpunk.factions.netwatch.name",
      "type": "military",
      "alignment": "lawful_neutral"
    }
  ],

  "history_timeline": [
    {
      "id": "corp_wars",
      "title_i18n_key": "world.cyberpunk.events.corp_wars.title",
      "description_i18n_key": "world.cyberpunk.events.corp_wars.desc",
      "timestamp": "2020-2023",
      "era": "modern",
      "importance": "major"
    },
    {
      "id": "net_collapse",
      "title_i18n_key": "world.cyberpunk.events.net_collapse.title",
      "timestamp": "2077",
      "era": "modern",
      "importance": "major"
    }
  ]
}
```

**文件位置**：`src/configs/worlds/generic.json`

```json
{
  "slug": "generic",
  "name": "Generic Anime",
  "description": "A versatile anime-style world without specific theme constraints, suitable for various character designs.",
  "cover_url": "/worlds/generic-cover.jpg",

  "species": ["human", "elf", "demon", "angel"],
  "climate": "temperate_four_seasons",
  "regions": ["city", "countryside", "forest", "mountains"],
  "tech_magic_system": "low_fantasy",

  "theme_colors": {
    "primary": "#FF6B9D",
    "secondary": "#4A90E2",
    "accent": "#FFC107"
  },

  "factions": [],
  "history_timeline": []
}
```

### 4.2 国际化配置

**文件位置**：`src/i18n/pages/worlds/en.json`

```json
{
  "climate": {
    "temperate_four_seasons": "Temperate, Four Seasons",
    "tropical_rainforest": "Tropical Rainforest",
    "arctic_tundra": "Arctic Tundra",
    "desert": "Desert",
    "oceanic": "Oceanic",
    "underground": "Underground",
    "urban_tropical": "Urban Tropical",
    "custom": "Custom"
  },

  "tech_magic_system": {
    "medieval_magic": "Medieval Magic",
    "high_tech": "High Technology",
    "cyberpunk": "Cyberpunk Technology",
    "steampunk": "Steampunk",
    "low_fantasy": "Low Fantasy",
    "high_fantasy": "High Fantasy Magic",
    "sci_fi": "Science Fiction",
    "post_apocalyptic": "Post-Apocalyptic"
  },

  "world": {
    "cyberpunk": {
      "factions": {
        "corporations": {
          "name": "Mega Corporations",
          "desc": "Powerful corporate entities controlling the world economy and politics"
        },
        "nomads": {
          "name": "Nomad Clans",
          "desc": "Free people living in the Badlands, surviving outside corporate control"
        },
        "netwatch": {
          "name": "NetWatch",
          "desc": "Organization monitoring and policing the Net"
        }
      },
      "events": {
        "corp_wars": {
          "title": "Corporate Wars",
          "desc": "Devastating conflicts between mega corporations for global dominance"
        },
        "net_collapse": {
          "title": "Net Collapse",
          "desc": "The collapse of the old internet infrastructure, creating the new Dark Net"
        }
      }
    }
  }
}
```

**文件位置**：`src/i18n/pages/worlds/ja.json`

```json
{
  "climate": {
    "temperate_four_seasons": "温帯、四季",
    "tropical_rainforest": "熱帯雨林",
    "arctic_tundra": "北極ツンドラ",
    "desert": "砂漠",
    "oceanic": "海洋性",
    "underground": "地下",
    "urban_tropical": "都市熱帯",
    "custom": "カスタム"
  },

  "tech_magic_system": {
    "medieval_magic": "中世魔法",
    "high_tech": "ハイテク",
    "cyberpunk": "サイバーパンクテクノロジー",
    "steampunk": "スチームパンク",
    "low_fantasy": "ローファンタジー",
    "high_fantasy": "ハイファンタジー魔法",
    "sci_fi": "サイエンスフィクション",
    "post_apocalyptic": "ポストアポカリプス"
  }
}
```

## 数据迁移

### 5.1 预置世界观导入

**脚本位置**：`scripts/import-worlds.ts`

```typescript
import { loadworldConfigs } from "@/lib/config-manager";
import { worldInsertSchema } from "@/types/world";
import { db } from "@/db";
import { oc_worlds } from "@/db/schema";
import { generateUuid } from "@/lib/utils";

async function importPresetworlds() {
  console.log("Starting world import...");

  // 从配置文件加载
  const configs = await loadworldConfigs(); // 读取 src/configs/worlds/*.json

  for (const config of configs) {
    try {
      // Zod 校验
      const validated = worldInsertSchema.parse({
        ...config,
        uuid: generateUuid(),
        creator_uuid: null, // 预置世界观无创建者
        visibility: "public",
        is_active: true,
      });

      // 插入数据库
      await db().insert(oc_worlds).values(validated);

      console.log(`✓ Imported world: ${validated.name} (${validated.slug})`);
    } catch (error) {
      console.error(`✗ Failed to import ${config.name}:`, error);
    }
  }

  console.log("world import completed.");
}

// 执行
importPresetworlds();
```

**运行命令**：

```bash
pnpm tsx scripts/import-worlds.ts
```

### 5.2 现有角色关联迁移

如果之前 characters 表使用的是简单的 `theme_id` 字段，需要迁移到 `world_uuid`：

```sql
-- 映射规则：theme_id → world_uuid
UPDATE characters
SET world_uuid = (
  SELECT uuid FROM oc_worlds WHERE slug = 'generic'
)
WHERE theme_id IS NULL OR theme_id = 'generic';

UPDATE characters
SET world_uuid = (
  SELECT uuid FROM oc_worlds WHERE slug = 'cyberpunk-2077'
)
WHERE theme_id = 'cyberpunk';

UPDATE characters
SET world_uuid = (
  SELECT uuid FROM oc_worlds WHERE slug = 'fantasy'
)
WHERE theme_id = 'fantasy';

-- 验证迁移结果
SELECT
  c.theme_id,
  w.slug AS new_world_slug,
  COUNT(*) AS character_count
FROM characters c
LEFT JOIN oc_worlds w ON c.world_uuid = w.uuid
GROUP BY c.theme_id, w.slug;
```

## 性能优化

### 6.1 查询优化示例

**按种族筛选世界观**：

```sql
-- 使用 GIN 索引
SELECT * FROM oc_worlds
WHERE species @> '["elf"]'
AND visibility = 'public';
```

**按科技体系筛选**：

```sql
-- 使用普通索引
SELECT * FROM oc_worlds
WHERE tech_magic_system = 'cyberpunk'
AND is_active = TRUE;
```

**统计每个世界观的角色数量**：

```sql
SELECT
  w.uuid,
  w.name,
  w.slug,
  COUNT(c.id) AS character_count
FROM oc_worlds w
LEFT JOIN characters c ON c.world_uuid = w.uuid
WHERE w.visibility = 'public'
GROUP BY w.uuid, w.name, w.slug
ORDER BY character_count DESC;
```

**查询包含特定势力类型的世界观**：

```sql
-- 使用 JSONB 表达式索引
SELECT * FROM oc_worlds
WHERE factions @> '[{"type": "government"}]';
```

### 6.2 缓存策略

1. **配置文件缓存**：预置世界观配置在服务启动时加载到内存

   ```typescript
   // src/services/world-cache.ts
   const presetworlds = new Map<string, world>();

   export async function getPresetworld(slug: string) {
     if (!presetworlds.has(slug)) {
       const config = await loadworldConfig(slug);
       presetworlds.set(slug, config);
     }
     return presetworlds.get(slug);
   }
   ```

2. **Redis 缓存**：用户创建的世界观详情缓存 1 小时

   ```typescript
   // 缓存key: world:{uuid}
   // TTL: 3600秒
   await redis.set(`world:${uuid}`, JSON.stringify(world), "EX", 3600);
   ```

3. **静态资源 CDN**：封面图、图标等资源使用 R2 + CDN

## 实现文件清单

**数据层**：

- `src/db/migrations/xxxx_world_detailed_fields.sql` - 数据库迁移
- `src/db/schema.ts` - 表定义更新
- `src/models/world.ts` - 数据模型层
- `src/types/world.ts` - Zod Schema 和 TypeScript 类型

**服务层**：

- `src/services/world.ts` - 世界观业务逻辑
- `src/services/world-cache.ts` - 缓存服务
- `src/lib/config-manager.ts` - 配置文件加载（已有，需扩展）

**API 层**：

- `src/app/api/worlds/route.ts` - 列表和创建
- `src/app/api/worlds/[slug]/route.ts` - 详情、更新、删除
- `src/app/api/worlds/generate-cover/route.ts` - AI 生成封面

**配置文件**：

- `src/configs/worlds/generic.json` - 通用世界观
- `src/configs/worlds/cyberpunk.json` - 赛博朋克世界观
- `src/configs/worlds/fantasy.json` - 奇幻世界观

**国际化**：

- `src/i18n/pages/worlds/en.json` - 英文翻译
- `src/i18n/pages/worlds/ja.json` - 日文翻译

**工具脚本**：

- `scripts/import-worlds.ts` - 导入预置世界观
- `scripts/migrate-world-data.ts` - 数据迁移脚本
- `scripts/verify-world-data.ts` - 数据校验脚本

## 与角色系统的集成

### 7.1 角色创建时的世界观选择

在 OC Maker 编辑模式下，用户可以为角色分配世界观：

```typescript
// src/components/oc-maker/worldselector.tsx
const worldselector = ({ value, onChange }) => {
  const { data: worlds } = useSWR('/api/worlds', fetcher);

  return (
    <Select value={value} onChange={onChange}>
      <option value="">未指定世界观</option>
      {worlds?.map(w => (
        <option key={w.uuid} value={w.id}>
          {w.name} ({w.character_count} 个角色)
        </option>
      ))}
    </Select>
  );
};
```

### 7.2 世界观主题化应用

角色详情页根据世界观应用主题化样式：

```typescript
// src/components/character-detail/worldTheme.tsx
import { useEffect } from "react";

export function worldThemeProvider({ world, children }) {
  useEffect(() => {
    if (!world?.theme_colors) return;

    const root = document.documentElement;

    // 注入 CSS Variables
    root.style.setProperty("--world-primary", world.theme_colors.primary);
    root.style.setProperty(
      "--world-secondary",
      world.theme_colors.secondary || "",
    );
    root.style.setProperty("--world-accent", world.theme_colors.accent || "");
    root.style.setProperty("--world-bg", world.theme_colors.background || "");

    return () => {
      // 清理样式
      root.style.removeProperty("--world-primary");
      root.style.removeProperty("--world-secondary");
      root.style.removeProperty("--world-accent");
      root.style.removeProperty("--world-bg");
    };
  }, [world]);

  return children;
}
```

CSS 使用：

```css
.character-detail-page {
  background: linear-gradient(
    135deg,
    var(--world-primary, #ff6b9d),
    var(--world-secondary, #4a90e2)
  );
}

.character-card {
  border: 2px solid var(--world-accent, #ffc107);
}
```

## 变更历史

- 2026-01-08 初始版本创建，详细设计世界观字段结构、索引策略、国际化方案
