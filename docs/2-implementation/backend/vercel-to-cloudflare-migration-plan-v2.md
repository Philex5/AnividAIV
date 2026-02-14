# Vercel 迁移至 Cloudflare Worker 完整迁移计划 v2.0

## 文档信息

- **文档版本**: v2.0
- **创建日期**: 2025-11-22
- **最后更新**: 2025-11-22
- **负责人**: 技术团队
- **关联项目**: AnividAI
- **目标环境**: Cloudflare Workers / Pages

---

## 1. 执行摘要

### 1.1 迁移目标

将当前运行在 Vercel 的 Next.js 应用完整迁移至 Cloudflare Workers 平台，实现：

- 零停机迁移
- 功能完全兼容
- 性能提升（基于 Cloudflare 全球边缘网络）
- 成本优化

### 1.2 当前状态评估

✅ **已完成准备**:

- 项目已集成 `@opennextjs/cloudflare` v1.2.1
- 已有 `wrangler.toml.example` 配置文件
- 配置了 Cloudflare 部署脚本（`cf:preview`, `cf:deploy`, `cf:upload`, `cf:typegen`）
- IP 获取逻辑已兼容 Cloudflare（`cf-connecting-ip`）
- **数据库连接**已适配 Workers 环境（`src/db/index.ts`）
- **R2存储**已配置并正常使用

✅ **当前资源状态**:

- **JSON配置** (31个文件，200KB): 保留在 `src/configs/`，动态加载
- **图片资源** (109个文件，15MB): 迁移至 R2 + CDN
- **数据库**: PostgreSQL (Supabase) → 将迁移至 HyperDriver + Neon

### 1.3 关键挑战

⚠️ **待解决的核心问题**:

1. **JSON配置动态化**: 31个静态import改为动态加载
2. **图片资源迁移**: public/下的图片迁移到R2
3. **数据库迁移**: PostgreSQL → HyperDriver + Drizzle + Neon
4. **认证系统**: NextAuth.js 适配 Cloudflare Workers
5. **支付集成**: Webhook 端点重配置
6. **其他关键点**: SSE替代、定时任务、环境变量等

---

## 2. 当前架构分析

### 2.1 技术栈

**前端与框架**:

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Shadcn UI 组件库

**后端服务**:

- Next.js API Routes (src/app/api/)
- Drizzle ORM + PostgreSQL
- NextAuth.js v5 (认证)
- 多个 AI 提供商集成（KIE AI, Replicate, OpenAI、Deepseek）
- 不使用 `export const runtime = 'edge';` 声明。这是因为在 Cloudflare Pages with OpenNext 的设置中，API
  路由自动在边缘运行。

**外部服务**:

- 数据库: 增加HyperDriver + Supabase (PostgreSQL)
- 存储: Cloudflare R2 (已配置，需迁移图片资源)
- 支付: Stripe, Creem
- 邮件: Resend

### 2.2 核心 API 路由统计

```
总计: 70+ API 路由
├── 认证相关: 1个 (NextAuth)
├── 管理功能: 30+ 个
├── 用户管理: 10+ 个
├── 生成服务: 15+ 个 (图片/视频/聊天)
├── 支付系统: 8+ 个
├── 文件上传: 3+ 个
└── 其他: 10+ 个
```

### 2.3 资源清单

**JSON配置** (31个文件，约200KB):

```
src/configs/
├── models/ai-models.json (16KB)
├── gallery/ (32KB)
├── characters/characters.json (12KB)
├── styles/anime_styles.json (8KB)
├── parameters/ (16KB)
├── prompts/ (40KB)
└── 其他配置... (约80KB)
```

**Public静态资源** (109个文件，约15MB):

```
public/
├── imgs/ (11MB) - 迁移到R2
├── creamy/ (2.4MB) - 迁移到R2
├── logo.webp (72KB) - 迁移到R2
└── 其他静态资源...
```

---

## 3. 迁移方案设计

### 3.1 JSON配置动态化方案

#### 当前问题

- 31个JSON文件通过静态import，打包到bundle中
- Workers环境不支持传统文件系统访问

#### 解决思路：动态import() + 缓存

**方案架构**:

```
运行时
  ↓
动态import() 加载
  ↓
内存缓存 (Map)
  ↓
返回配置数据
```

**实现代码**:

```typescript
// src/lib/config-manager.ts
export class ConfigManager {
  private cache = new Map<string, any>();
  private preloadPromise: Promise<void> | null = null;

  async loadConfig<T>(path: string): Promise<T> {
    // 1. 检查缓存
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    // 2. 动态导入
    const module = await import(/* @vite-ignore */ `@/configs/${path}.json`);
    const config = module.default;

    // 3. 缓存结果
    this.cache.set(path, config);
    return config;
  }

  // 预加载关键配置
  async preload(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;

    this.preloadPromise = Promise.all([
      this.loadConfig("models/ai-models"),
      this.loadConfig("styles/anime_styles"),
      this.loadConfig("characters/characters"),
      this.loadConfig("gallery/anime-example-gallery"),
      this.loadConfig("parameters/scenes"),
      this.loadConfig("parameters/outfits"),
    ]).then(() => undefined);

    return this.preloadPromise;
  }
}

export const configManager = new ConfigManager();
```

**使用方式**:

```typescript
// 替换所有静态import
// ❌ 旧: import aiModels from "@/configs/models/ai-models.json"
// ✅ 新:
export async function getAIModels() {
  return configManager.loadConfig("models/ai-models");
}

export async function getAnimeStyles() {
  return configManager.loadConfig("styles/anime_styles");
}
```

**优势**:

- ✅ 零存储迁移（JSON仍在代码仓库）
- ✅ 代码分割（减少主bundle大小）
- ✅ 热更新友好（重新部署即更新）
- ✅ 类型安全（TypeScript仍能推导）
- ✅ 开发体验好（编辑器可跳转定义）

**注意事项**:

- ⚠️ 首次加载需网络请求
- ⚠️ 需要处理加载状态
- ⚠️ 建议添加预加载机制

### 3.2 图片资源迁移到R2

#### 当前状态

- 109个图片文件在 `public/` 目录
- 通过 `/imgs/xxx` 路径引用

#### 迁移方案：R2 + 适配器

**步骤1: 上传到R2**

```bash
# 创建R2目录结构并上传
upload_assets() {
  local local_dir=$1
  local r2_dir=$2

  find $local_dir -type f | while read file; do
    r2_path=$(echo $file | sed "s|$local_dir|$r2_dir|")
    echo "Uploading $file -> $r2_path"
    wrangler r2 object put anividai_prod/$r2_path --file $file
  done
}

upload_assets ./public/imgs assets/imgs
upload_assets ./public/creamy assets/creamy
upload_assets ./public/logo.webp assets/logo.webp
upload_assets ./public/favicon.ico assets/favicon.ico
```

**步骤2: 创建适配器**

```typescript
// src/lib/asset-loader.ts
export class AssetLoader {
  private cdnBase: string;

  constructor() {
    this.cdnBase = "https://artworks.anividai.com/assets";
  }

  getImageUrl(path: string): string {
    if (path.startsWith("/")) {
      return `${this.cdnBase}${path}`;
    }
    return `${this.cdnBase}/${path}`;
  }

  getIconUrl(iconPath: string): string {
    return this.getImageUrl(`/imgs/icons/${iconPath}`);
  }
}

export const assetLoader = new AssetLoader();
```

**步骤3: 更新代码引用**

```typescript
// 替换所有图片引用
// ❌ 旧: <img src="/imgs/icons/sidebar/home_icon.webp" />
// ✅ 新: <img src={assetLoader.getIconUrl('sidebar/home_icon.webp')} />
```

### 3.3 数据库迁移方案

#### 当前状态

- 使用 `postgres-js` + Drizzle ORM
- 已适配Workers环境（`src/db/index.ts`）
- 数据库: Supabase PostgreSQL

#### 迁移目标

- 数据库: 迁移至 Neon PostgreSQL
- 连接驱动: HyperDriver（可选）或保持现有实现

#### 您的实现（已完成）

```typescript
// src/db/index.ts (您的当前实现)
const isCloudflareWorker =
  typeof globalThis !== "undefined" && "Cloudflare" in globalThis;
const isHyperdrive = "HYPERDRIVE" in env;

if (isCloudflareWorker && isHyperdrive) {
  // 使用Hyperdrive
  const hyperdrive = env.HYPERDRIVE;
  databaseUrl = hyperdrive.connectionString;
}

if (isCloudflareWorker) {
  // Workers环境使用单连接
  const client = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 5,
  });
  return drizzle(client);
}
```

**建议**: 您的实现已经很完善，可以直接使用，或升级为HyperDriver：

```bash
npm install hyper-driver
```

### 3.4 认证系统迁移

#### 现状

- NextAuth.js v5
- 支持: Google OAuth、GitHub OAuth、Google One Tap

#### 迁移适配

**步骤1: 安装适配器**

```bash
npm install @auth/cloudflare-adapter
```

**步骤2: 配置适配器**

```typescript
// src/auth/cloudflare-config.ts
import { CloudflareAdapter } from "@auth/cloudflare-adapter";

export function createAuthConfig(env: CloudflareEnv) {
  return {
    adapter: CloudflareAdapter(env),
    providers: [...], // 保持现有providers
    session: {
      strategy: "jwt", // 推荐JWT
    },
  };
}
```

**步骤3: 更新路由**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
export const runtime = "edge";

export async function GET(request: Request) {
  const authConfig = createAuthConfig(env);
  return authHandler(request, authConfig);
}
```

### 3.5 生成任务处理（无需迁移）

#### 当前状态

- 生成任务采用**同步处理**方式
- 直接调用AI提供商API获取结果
- 无需队列系统

#### 说明

由于当前项目**未使用Redis或任何队列系统**，生成任务是同步处理的。因此无需进行队列系统迁移，简化了迁移流程。

### 3.6 支付系统迁移

#### 现状

- Stripe + Creem
- Webhook端点: `/api/pay/notify/stripe`

#### 迁移适配

**步骤1: 更新Webhook URL**

```bash
# Stripe Dashboard
# 旧: https://your-app.vercel.app/api/pay/notify/stripe
# 新: https://your-worker.workers.dev/api/pay/notify/stripe

# Creem控制台同理
```

**步骤2: 测试Webhook**

```bash
# 使用Stripe CLI
stripe listen --forward-to localhost:3000/api/pay/notify/stripe
```

### 3.7 其他关键点

#### A. SSE替代WebSocket

```typescript
// 聊天流式响应
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("data: message\n\n"));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

#### B. 定时任务迁移

```toml
# wrangler.toml
[triggers]
crons = ["0 0 * * *"]  # 每天UTC 0点

export default {
  scheduled: async (event, env, ctx) => {
    await cleanupExpiredData();
  },
};
```

#### C. 环境变量管理

```toml
# wrangler.toml
[env.production.vars]
ENVIRONMENT = "production"
NEXTAUTH_URL = "https://anividai.one"

# Secrets通过wrangler secret设置
wrangler secret put DATABASE_URL --env production
wrangler secret put AUTH_SECRET --env production
```

### 3.8 其他静态资源迁移

#### 3.8.1 CHANGELOG.md 文件（无影响）

**当前状态**：

- 位置：`public/docs/CHANGELOG.md`
- 使用方式：通过 `fetch('/docs/CHANGELOG.md')` 动态读取
- 当前代码：`src/app/[locale]/(default)/changelog/page.tsx:156`

**迁移影响**：

- ✅ **无影响**，可直接正常运行
- Cloudflare Workers 支持 public 目录静态文件访问
- HTTP fetch 请求无需文件系统API

**无需修改**：保持现有实现即可。

---

#### 3.8.2 邮件模板文件（需迁移）

**当前状态**：

- 位置：`public/emails/` 目录
- 文件列表：
  - `welcome.html` - 欢迎邮件
  - `subscription-thanks.html` - 订阅感谢
  - `notification.html` - 通知邮件
  - `marketing.html` - 营销邮件
  - `update.html` - 更新通知
  - `payment-failed.html` - 支付失败
- 使用方式：`src/services/email.ts` 使用 `fs.readFile` 读取
- 当前代码：`src/services/email.ts:38-44`

**迁移挑战**：

- ❌ Cloudflare Workers 不支持 Node.js `fs` 模块
- ❌ 传统文件系统API不可用
- ❌ 邮件发送功能会完全失效

**解决方案：迁移到R2存储**

**步骤1：上传邮件模板到R2**

```bash
# 创建R2目录结构并上传邮件模板
wrangler r2 object put anividai_prod/emails/welcome.html --file ./public/emails/welcome.html
wrangler r2 object put anividai_prod/emails/subscription-thanks.html --file ./public/emails/subscription-thanks.html
wrangler r2 object put anividai_prod/emails/notification.html --file ./public/emails/notification.html
wrangler r2 object put anividai_prod/emails/marketing.html --file ./public/emails/marketing.html
wrangler r2 object put anividai_prod/emails/update.html --file ./public/emails/update.html
wrangler r2 object put anividai_prod/emails/payment-failed.html --file ./public/emails/payment-failed.html
```

**步骤2：修改邮件服务适配器**

```typescript
// src/services/email.ts (Cloudflare Workers适配版本)
const EMAIL_TEMPLATES_BASE = "https://artworks.anividai.com/emails";

// 替换fs.readFile为HTTP fetch
async function loadEmailTemplate(template: string): Promise<string> {
  const response = await fetch(`${EMAIL_TEMPLATES_BASE}/${template}.html`);
  if (!response.ok) {
    throw new Error(`Failed to load email template: ${template}`);
  }
  return await response.text();
}

// 在sendEmail函数中使用：
export async function sendEmail({
  to,
  template,
  subject,
  variables = {},
}: {
  to: string;
  template: string;
  subject: string;
  variables?: Record<string, any>;
}): Promise<boolean> {
  try {
    // 替换原来的fs.readFile
    let htmlContent = await loadEmailTemplate(template);

    // ... 其他逻辑保持不变
    const mergedVariables = {
      // ... 变量合并
    };
    htmlContent = renderTemplate(htmlContent, mergedVariables);

    // 发送邮件
    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}
```

**步骤3：批量上传脚本**

```bash
#!/bin/bash
# upload-email-templates.sh

R2_BUCKET="anividai_prod"
EMAIL_TEMPLATES_DIR="./public/emails"

echo "Uploading email templates to R2..."

# 上传所有HTML模板
for file in $EMAIL_TEMPLATES_DIR/*.html; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Uploading $filename..."
    wrangler r2 object put $R2_BUCKET/emails/$filename --file "$file"
  fi
done

echo "Email templates upload complete!"
```

**优势**：

- ✅ 复用现有R2基础设施
- ✅ CDN加速，邮件模板加载更快
- ✅ 版本控制更方便（直接替换R2文件）
- ✅ 无需修改前端代码

**注意事项**：

- ⚠️ 需要更新 `src/services/email.ts` 中的模板读取逻辑
- ⚠️ 确保R2路径可公开访问
- ⚠️ 建议添加模板缓存机制（避免重复请求）

**替代方案：内联模板**（不推荐）
如果不想迁移到R2，可将HTML模板转换为TypeScript常量，但会增加bundle大小且不易维护。

---

## 4. 详细实施计划

### 阶段 1: 环境准备（预估 2-3 天） ✅ **已完成**

#### 任务 1.1: 创建 Cloudflare 资源 ✅

**负责人**: DevOps
**验收标准**:

- [x] 创建 Cloudflare Workers 项目
- [x] 验证现有 R2 Bucket `anividai_prod` 配置
- [x] 验证 Neon 数据库连接（可选）

**执行命令**:

```bash
# 1. 创建项目
wrangler login
wrangler project create anividai-cloudflare

# 2. 验证 R2 (已存在 anividai_prod)
wrangler r2 bucket list

# 3. 验证 Neon 数据库（可选）
neonctl projects create anividai-cloudflare
neonctl connection-string --project-id anividai-cloudflare
```

#### 任务 1.2: 更新 wrangler.toml ✅

**负责人**: DevOps
**验收标准**:

- [x] 复制 `wrangler.toml.example` 到 `wrangler.toml`
- [x] 配置所有绑定
- [x] 设置环境变量占位符

```toml
# wrangler.toml
name = "anividai-one"
main = ".open-next/worker.js"
compatibility_date = "2025-03-01"
compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]

# Assets
[[assets]]
binding = "ASSETS"
directory = ".open-next/assets"

# R2 Storage (使用现有 bucket)
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "anividai_prod"
custom_domain = "artworks.anividai.com"

# 环境变量
[vars]
ENVIRONMENT = "production"
NEXTAUTH_URL = "https://anividai.one"
STORAGE_DOMAIN = "https://artworks.anividai.com"
R2_BUCKET = "anividai_prod"
```

#### 任务 1.3: 生成 Cloudflare 类型 ✅

**负责人**: 前端
**验收标准**:

- [x] 运行 `cf:typegen` 脚本
- [x] 生成 `cloudflare-env.d.ts`
- [x] 更新 TypeScript 配置

```bash
npm run cf:typegen
```

### 阶段 2: JSON配置动态化（预估 3-4 天） ✅ **已完成**

#### 任务 2.1: 创建配置管理器 ✅

**负责人**: 后端
**验收标准**:

- [x] 创建 `src/lib/config-manager.ts`
- [x] 实现ConfigManager类
- [x] 支持缓存和预加载
- [x] 测试动态加载功能

**实现文件**:

```typescript
// src/lib/config-manager.ts
export class ConfigManager {
  private cache = new Map<string, any>();
  private preloadPromise: Promise<void> | null = null;

  async loadConfig<T>(path: string): Promise<T> {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    const module = await import(/* @vite-ignore */ `@/configs/${path}.json`);
    const config = module.default;

    this.cache.set(path, config);
    return config;
  }

  async preload(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;

    this.preloadPromise = Promise.all([
      this.loadConfig("models/ai-models"),
      this.loadConfig("styles/anime_styles"),
      this.loadConfig("characters/characters"),
      this.loadConfig("gallery/anime-example-gallery"),
      this.loadConfig("parameters/scenes"),
      this.loadConfig("parameters/outfits"),
    ]).then(() => undefined);

    return this.preloadPromise;
  }
}

export const configManager = new ConfigManager();
```

#### 任务 2.2: 更新lib/configs/index.ts ✅

**负责人**: 后端
**验收标准**:

- [x] 将静态import改为动态加载
- [x] 保持API兼容性
- [x] 所有配置函数可正常工作

```typescript
// src/lib/configs/index.ts (更新)
import { configManager } from "./config-manager";

// 替换所有静态导入为动态加载
export const getActiveModels = async () =>
  (await configManager.loadConfig("models/ai-models")).models.filter(
    (m: any) => m.status === "active",
  );

export const getDefaultModel = async () => {
  const models = await configManager.loadConfig("models/ai-models");
  return models.models.find((m: any) => m.is_default) || models.models[0];
};

// ... 其他函数类似改造
```

#### 任务 2.3: 更新API路由配置端点

**负责人**: 后端
**验收标准**:

- [ ] `src/app/api/oc-maker/config/route.ts` 正常
- [ ] `src/app/api/chat/config/route.ts` 正常
- [ ] 其他配置相关API路由正常

**示例**:

```typescript
// src/app/api/oc-maker/config/route.ts
export async function GET(request: Request) {
  const [characters, styles, scenes, outfits, aiModels] = await Promise.all([
    configManager.loadConfig("characters/characters"),
    configManager.loadConfig("styles/anime_styles"),
    configManager.loadConfig("parameters/scenes"),
    configManager.loadConfig("parameters/outfits"),
    configManager.loadConfig("models/ai-models"),
  ]);

  return Response.json({
    characters,
    styles,
    scenes,
    outfits,
    aiModels,
  });
}
```

#### 任务 2.4: 更新前端组件

**负责人**: 前端
**验收标准**:

- [ ] 所有使用配置的组件正常工作
- [ ] 添加加载状态处理
- [ ] 预加载关键配置

**示例**:

```typescript
// src/components/oc-maker/OCCreationTool.tsx
export default function OCCreationTool() {
  const [characterColors, setCharacterColors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      const colors = await configManager.loadConfig('colors/character-colors');
      setCharacterColors(colors);
      setLoading(false);
    }
    loadConfig();
  }, []);

  if (loading) return <div>Loading...</div>;
  // ...
}
```

### 阶段 3: 静态资源迁移（预估 3-4 天） ⏳ **进行中**

> **详细指南**：请参考 [Public 静态资源迁移完整指南](./public-assets-migration-complete-guide.md)，包含完整的代码示例、资源类型说明和迁移清单。

#### 任务 3.1: 上传图片到R2 ⏳ **待执行**

**负责人**: DevOps
**验收标准**:

- [ ] public/imgs/ 迁移到 R2
- [ ] public/creamy/ 迁移到 R2
- [ ] logo.webp, favicon.ico 迁移到 R2
- [ ] 验证所有图片可访问

**当前状态**: 资源仍在 `public/` 目录，需要执行上传脚本

**批量上传脚本**:

```bash
#!/bin/bash
# upload-assets.sh

R2_BUCKET="anividai_prod"

echo "Uploading public/imgs to R2..."
rsync -av --progress public/imgs/ "r2://$R2_BUCKET/assets/imgs/"

echo "Uploading public/creamy to R2..."
rsync -av --progress public/creamy/ "r2://$R2_BUCKET/assets/creamy/"

echo "Uploading logo and favicon..."
wrangler r2 object put $R2_BUCKET/assets/logo.webp --file ./public/logo.webp
wrangler r2 object put $R2_BUCKET/assets/favicon.ico --file ./public/favicon.ico

echo "Upload complete!"
```

#### 任务 3.2: 创建资源适配器 ✅

**负责人**: 前端
**验收标准**:

- [x] 创建 `src/lib/asset-loader.ts`
- [x] 实现URL转换逻辑
- [x] 支持路径映射

**完成情况**: AssetLoader 已完整实现，包含所有资源类型的便捷方法

```typescript
// src/lib/asset-loader.ts
export class AssetLoader {
  private cdnBase = "https://artworks.anividai.com/assets";

  getImageUrl(path: string): string {
    if (path.startsWith("/")) {
      return `${this.cdnBase}${path}`;
    }
    return `${this.cdnBase}/${path}`;
  }

  getIconUrl(iconPath: string): string {
    return this.getImageUrl(`/imgs/icons/${iconPath}`);
  }

  getExampleImageUrl(category: string, image: string): string {
    return this.getImageUrl(`/imgs/${category}/${image}`);
  }
}

export const assetLoader = new AssetLoader();
```

#### 任务 3.3: 更新组件引用 ⏳ **进行中**

**负责人**: 前端
**验收标准**:

- [ ] 所有图片引用更新为适配器
- [ ] 无broken images
- [ ] 性能良好

**当前状态**:

- ✅ 已更新 11 个组件使用 assetLoader
- ⏳ 还有约 28 个组件仍使用旧路径 (/imgs/, /creamy/)
- **待处理组件**:
  - src/components/chat/ThinkingAnimation.tsx
  - src/components/community/detail/ArtworkDetailModal.tsx
  - src/components/console/user-center/UserInfoCard.tsx
  - src/components/icon/gender-icon.tsx
  - src/components/oc-maker/Benefits.tsx
  - src/components/blocks/cta/index.tsx
  - src/components/blocks/footer/AppFooter.tsx
  - src/components/community/ArtworkCard.tsx
  - src/components/admin/users/UsersTable.tsx
  - src/components/anime-page/Benefits.tsx
  - src/components/anime-page/CharacterAnimeGallery.tsx
  - src/components/blocks/benefit/index.tsx
  - src/components/action-figure-page/Benefits.tsx
  - src/app/[locale]/auth/signin/page.tsx
  - src/app/(legal)/layout.tsx
  - 等等...

**示例**:

```typescript
// src/components/blocks/app-sidebar/index.tsx
// ❌ 旧: iconPath: "/imgs/icons/sidebar/sidebar_home_icon.webp"
// ✅ 新: iconPath: assetLoader.getIconUrl('sidebar/sidebar_home_icon.webp')
```

#### 任务 3.4: 迁移邮件模板到R2 ⏳ **待执行**

**负责人**: DevOps
**验收标准**:

- [ ] `public/emails/` 下的6个HTML文件上传到R2
- [ ] 验证所有邮件模板可公开访问
- [ ] 模板路径：`https://artworks.anividai.com/emails/*.html`

**当前状态**:

- 邮件模板仍在 `public/emails/` 目录
- 已有模板：welcome.html, subscription-thanks.html, notification.html, payment-failed.html, marketing.html, update.html
- 需要执行上传脚本

**批量上传命令**:

```bash
# 创建上传脚本
cat > upload-email-templates.sh << 'EOF'
#!/bin/bash
R2_BUCKET="anividai_prod"
EMAIL_TEMPLATES_DIR="./public/emails"

echo "Uploading email templates to R2..."
for file in $EMAIL_TEMPLATES_DIR/*.html; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Uploading $filename..."
    wrangler r2 object put $R2_BUCKET/emails/$filename --file "$file"
  fi
done
echo "Email templates upload complete!"
EOF

chmod +x upload-email-templates.sh
./upload-email-templates.sh
```

#### 任务 3.5: 适配邮件服务 ✅

**负责人**: 后端
**验收标准**:

- [x] 更新 `src/services/email.ts`
- [x] 替换 `fs.readFile` 为 HTTP fetch
- [x] 邮件发送功能正常工作
- [x] 所有模板（welcome、notification等）可正常加载

**完成情况**:

- 已使用 `getEmailTemplateUrl()` 从 assetLoader 加载模板
- 实现了模板缓存机制
- 支持 Mustache 风格的变量替换

**关键修改**:

```typescript
// src/services/email.ts - 关键变更
// ❌ 旧实现（Node.js fs）
const templatePath = join(
  process.cwd(),
  "public",
  "emails",
  `${template}.html`,
);
let htmlContent = await readFile(templatePath, "utf-8");

// ✅ 新实现（Cloudflare Workers）
const EMAIL_TEMPLATES_BASE = "https://artworks.anividai.com/emails";
async function loadEmailTemplate(template: string): Promise<string> {
  const response = await fetch(`${EMAIL_TEMPLATES_BASE}/${template}.html`);
  if (!response.ok) {
    throw new Error(`Failed to load template: ${template}`);
  }
  return await response.text();
}
let htmlContent = await loadEmailTemplate(template);
```

### 阶段 4: 认证系统适配（预估 2-3 天）

#### 任务 4.1: 安装适配器

**负责人**: 后端
**验收标准**:

- [ ] 安装 @auth/cloudflare-adapter
- [ ] 更新依赖

```bash
npm install @auth/cloudflare-adapter
```

#### 任务 4.2: 配置适配器

**负责人**: 后端
**验收标准**:

- [ ] 更新 `src/auth/config.ts`
- [ ] 使用 CloudflareAdapter
- [ ] 配置JWT session

```typescript
// src/auth/cloudflare-config.ts
import { CloudflareAdapter } from "@auth/cloudflare-adapter";

export function createAuthConfig(env: CloudflareEnv) {
  return {
    adapter: CloudflareAdapter(env),
    providers: [
      // 保持现有providers
    ],
    session: {
      strategy: "jwt",
    },
  };
}
```

#### 任务 4.3: 测试认证流程

**负责人**: 后端 + 前端
**验收标准**:

- [ ] Google OAuth 正常
- [ ] GitHub OAuth 正常
- [ ] Google One Tap 正常
- [ ] Session 管理正确

### 阶段 5: 其他核心服务迁移（预估 2-3 天）

#### 任务 5.1: API路由适配

**负责人**: 后端
**验收标准**:

- [ ] 添加 `export const runtime = 'edge'`
- [ ] 所有API路由正常
- [ ] 数据库操作正常

```typescript
// 所有API路由添加
export const runtime = "edge";

export async function GET(request: Request) {
  // ...
}
```

#### 任务 5.3: 支付系统适配

**负责人**: 后端
**验收标准**:

- [ ] 更新 Stripe Webhook URL
- [ ] 更新 Creem Webhook URL
- [ ] 测试支付流程

### 阶段 6: 全面测试与优化（预估 3-5 天）

#### 任务 6.1: 功能测试

**负责人**: QA
**验收标准**:

- [ ] 用户注册/登录
- [ ] OC Maker功能
- [ ] 图片生成
- [ ] 视频生成
- [ ] 聊天功能
- [ ] 支付流程
- [ ] 所有页面正常

#### 任务 6.2: 性能测试

**负责人**: DevOps
**验收标准**:

- [ ] 首屏加载时间 < 2秒
- [ ] API响应时间 < 500ms
- [ ] 图片加载速度良好
- [ ] 数据库查询 < 100ms

**测试方法**:

```bash
# 使用 Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# 负载测试
npm install -g k6
k6 run tests/load-test.js
```

#### 任务 6.3: 灰度发布

**负责人**: DevOps
**验收标准**:

- [ ] 10% 流量测试 (24小时)
- [ ] 50% 流量测试 (24小时)
- [ ] 100% 流量上线
- [ ] 监控告警正常

**发布流程**:

```bash
# 1. 部署预览
npm run cf:preview

# 2. 部署生产
npm run cf:deploy

# 3. DNS切换 (如果需要)
# 更新DNS记录指向Cloudflare Worker
```

---

## 5. 环境变量清单

### 5.1 必需环境变量

**数据库**:

```bash
DATABASE_URL=postgresql://user:pass@host/db
# 或 Hyperdrive
HYPERDRIVE=...
```

**认证**:

```bash
AUTH_SECRET=your-secret
AUTH_URL=https://anividai.one/api/auth
AUTH_GOOGLE_ID=xxx
AUTH_GOOGLE_SECRET=xxx
AUTH_GITHUB_ID=xxx
AUTH_GITHUB_SECRET=xxx
NEXT_PUBLIC_AUTH_GOOGLE_ID=xxx
NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true
NEXT_PUBLIC_AUTH_GITHUB_ENABLED=true
```

> **Auth Secret 单一来源**
>
> - `AUTH_SECRET` 是 Auth.js/NextAuth 会话加解密的唯一来源，Cloudflare/Vercel/本地需保持一致。
> - `NEXTAUTH_SECRET` 必须与 `AUTH_SECRET` 使用相同取值，以兼容旧版 `auth()` 调用；推荐在 `.env` 中直接赋值为相同字符串。
> - 生产环境更新步骤：`wrangler secret put AUTH_SECRET` → `wrangler secret put NEXTAUTH_SECRET`（同一值）→ 触发部署，再在 Vercel 环境变量中同步变更。
> - 负责人：Platform 团队（@auth-ops），变更需记录至 `docs/3-operations/changelog.md` 并执行 Auth smoke 测试。

**存储** (现有R2):

```bash
R2_BUCKET_NAME=anividai_prod
STORAGE_DOMAIN=https://artworks.anividai.com
```

**AI提供商**:

```bash
KIE_API_KEY=xxx
REPLICATE_API_TOKEN=xxx
OPENAI_API_KEY=xxx
DEEPSEEK_API_KEY=xxx
```

**支付**:

```bash
STRIPE_PRIVATE_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CREEM_API_KEY=xxx
CREEM_WEBHOOK_SECRET=xxx
```

**其他**:

```bash
NEXTAUTH_URL=https://anividai.one
RESEND_API_KEY=xxx
```

### 5.2 设置命令

```bash
# 使用 wrangler CLI 设置 secrets
wrangler secret put DATABASE_URL
wrangler secret put AUTH_SECRET
wrangler secret put STRIPE_PRIVATE_KEY
# ... 其他 secrets
```

---

## 6. 风险评估与缓解

### 6.1 高风险项

| 风险             | 影响         | 概率 | 缓解措施                            |
| ---------------- | ------------ | ---- | ----------------------------------- |
| JSON配置加载失败 | 功能不可用   | 中   | 内存缓存 + 错误边界 + 默认配置      |
| 图片资源404      | 用户体验差   | 中   | 双写策略 (先保留public，验证后切换) |
| 邮件模板读取失败 | 邮件发送失败 | 中   | R2存储 + HTTP fetch + 缓存机制      |
| 数据库连接问题   | 服务不可用   | 中   | 连接池优化 + 重试机制 + 监控告警    |
| 认证系统异常     | 用户无法登录 | 高   | 灰度发布 + 快速回滚 (5分钟内)       |
| 支付Webhook失效  | 无法收款     | 低   | 提前更新URL + 双重验证              |

### 6.2 缓解策略

**策略1: 双写模式**

- 图片资源: 同时写入 public 和 R2，逐步迁移
- 配置: 保持代码仓库版本为真实源

**策略2: 灰度发布**

- 10% 流量 → 50% 流量 → 100% 流量
- 每阶段监控24小时

**策略3: 快速回滚**

- DNS TTL设置为300秒 (5分钟)
- 保留Vercel部署版本48小时
- 一键切换回Vercel

**策略4: 监控告警**

- 错误率 > 1% 触发告警
- API响应时间 > 1s 触发告警
- 自动生成监控报表

---

## 7. 测试计划

### 7.1 单元测试

**范围**:

- ConfigManager动态加载
- AssetLoader URL转换
- 所有API路由
- 数据模型操作

**工具**:

```bash
npm test
npm run test:watch
```

### 7.2 集成测试

**场景**:

- 用户注册 → 登录 → 验证
- 创建OC → 生成图片 → 下载
- 支付流程 → 获得积分 → 使用
- 聊天功能

**工具**:

```bash
# Playwright
npm run test:e2e
```

### 7.3 性能测试

**指标**:

- 首屏加载时间: < 2s
- TTFB: < 500ms
- API延迟: < 500ms
- 图片加载: < 1s

**工具**:

- Lighthouse CI
- K6 负载测试
- Cloudflare Analytics

---

## 8. 迁移时间表

| 阶段   | 任务           | 预计工期 | 依赖   |
| ------ | -------------- | -------- | ------ |
| 阶段 1 | 环境准备       | 2-3 天   | 无     |
| 阶段 2 | JSON配置动态化 | 3-4 天   | 阶段 1 |
| 阶段 3 | 静态资源迁移   | 3-4 天   | 阶段 2 |
| 阶段 4 | 认证系统适配   | 2-3 天   | 阶段 3 |
| 阶段 5 | 其他服务迁移   | 2-3 天   | 阶段 4 |
| 阶段 6 | 全面测试与优化 | 3-5 天   | 阶段 5 |

**总预计工期**: 15-22 天 (2-3 周)

**关键里程碑**:

- 第 1 周末: 阶段 1-2 完成
- 第 2 周末: 阶段 3-4 完成
- 第 3 周: 阶段 5-6 完成 + 上线

---

## 9. 资源分配

### 9.1 人员配置

**后端开发** × 2:

- JSON配置动态化
- 数据库迁移验证
- 认证系统适配
- API路由适配

**前端开发** × 1:

- 图片资源迁移
- 组件更新
- 性能优化

**DevOps** × 1:

- 环境配置
- 部署流程
- 监控告警
- 性能测试

**QA** × 1:

- 测试计划
- 自动化测试
- 回归测试

**总计**: 5 人

### 9.2 工具资源

**Cloudflare 资源**:

- Workers plan: $5/月 (10M 请求)
- R2 Storage: $0.015/GB (当前约15GB = $0.23/月)

**Neon 数据库** (可选):

- Pro plan: $25/月

**预计月度成本**: ~$25-50 (取决于流量)

---

## 10. 上线后优化

### 10.1 性能优化

**目标**:

- 首屏加载时间 < 1.5s
- API响应时间 < 300ms
- 图片优化 (WebP/AVIF)

**措施**:

- 配置预加载
- 图片懒加载
- CDN缓存优化

### 10.2 成本优化

**策略**:

- 监控请求量
- R2存储压缩
- 请求合并

### 10.3 监控与告警

**监控指标**:

- 错误率 < 1%
- 响应时间 < 500ms
- 可用性 > 99.9%

**告警规则**:

- 错误率 > 1%
- 响应时间 > 1s

---

## 11. 常见问题与解答

### Q1: 动态加载会影响性能吗？

**A**: 首次加载需要请求，但通过预加载和缓存机制，后续访问速度很快。整体bundle大小会减少。

### Q2: 图片迁移会影响用户体验吗？

**A**: 不会。我们使用双写策略，先验证R2图片正常，再切换路径。同时CDN会缓存图片。

### Q3: 数据库迁移会影响线上服务吗？

**A**: 使用Neon的零停机迁移，先创建新数据库，同步数据，验证后切换连接字符串。

### Q4: 如何处理动态加载失败的情况？

**A**: ConfigManager内置错误处理和缓存机制，加载失败会返回空配置或默认值。

### Q5: 认证系统在Workers中是否稳定？

**A**: 使用官方Cloudflare适配器，经过充分测试。推荐使用JWT session而非数据库session。

---

## 12. 附录

### 12.1 批量迁移脚本

**上传图片到R2**:

```bash
#!/bin/bash
# upload-assets.sh

R2_BUCKET="anividai_prod"

echo "Starting asset upload to R2..."

# 同步public/imgs
echo "Uploading public/imgs..."
rsync -av --progress public/imgs/ "r2://$R2_BUCKET/assets/imgs/"

# 同步public/creamy
echo "Uploading public/creamy..."
rsync -av --progress public/creamy/ "r2://$R2_BUCKET/assets/creamy/"

# 上传logo和favicon
echo "Uploading logo and favicon..."
wrangler r2 object put $R2_BUCKET/assets/logo.webp --file ./public/logo.webp
wrangler r2 object put $R2_BUCKET/assets/favicon.ico --file ./public/favicon.ico

echo "Asset upload complete!"
```

**上传邮件模板到R2**:

```bash
#!/bin/bash
# upload-email-templates.sh

R2_BUCKET="anividai_prod"
EMAIL_TEMPLATES_DIR="./public/emails"

echo "Starting email templates upload to R2..."

# 上传所有HTML模板文件
for file in $EMAIL_TEMPLATES_DIR/*.html; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Uploading $filename..."
    wrangler r2 object put $R2_BUCKET/emails/$filename --file "$file"
  fi
done

echo "Email templates upload complete!"

# 验证上传结果
echo "Verifying email templates..."
wrangler r2 object list $R2_BUCKET/emails
```

### 12.2 常用命令

**构建与部署**:

```bash
# 本地开发
npm run dev

# 构建
npm run build
npm run cf:build

# 预览
npm run cf:preview

# 部署
npm run cf:deploy

# 类型生成
npm run cf:typegen
```

**数据库操作**:

```bash
# 生成迁移
npm run db:generate

# 执行迁移
npm run db:migrate

# 打开 Studio
npm run db:studio
```

**R2操作**:

```bash
# 列出 R2 buckets
wrangler r2 bucket list

# 查看 R2 bucket 内容
wrangler r2 object list anividai_prod

# 上传文件
wrangler r2 object put anividai_prod/test.txt --file ./test.txt
```

**日志查看**:

```bash
# Cloudflare 日志
wrangler tail

# 查看实时日志
wrangler tail --format=pretty
```

### 12.3 参考文档

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [OpenNext 文档](https://opennext.js.org/)
- [NextAuth.js Cloudflare 适配器](https://authjs.dev/reference/adapter/cloudflare)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)

---

## 文档变更历史

| 版本   | 日期       | 作者     | 变更内容                                                                                                                          |
| ------ | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| v1.0.0 | 2025-11-22 | 技术团队 | 初始版本                                                                                                                          |
| v2.0.0 | 2025-11-22 | 技术团队 | 整合动态加载方案，优化资源配置                                                                                                    |
| v2.1.0 | 2025-11-22 | 技术团队 | 新增3.8节其他静态资源迁移方案；增加邮件模板迁移任务（3.4-3.5）；更新阶段3工期和整体时间表；新增邮件模板风险评估；附录增加上传脚本 |
| v2.1.1 | 2025-11-23 | 技术团队 | 修正：删除队列系统迁移章节（当前项目未使用Redis或队列系统）；简化迁移流程和成本估算                                               |

---

**文档状态**: ✅ 已完成
**下次评审**: 迁移完成后 1 个月

---

## 总结

本迁移计划基于您的实际配置和需求设计，具有以下特点：

✅ **合理**:

- 动态加载JSON配置，保持代码仓库管理
- 图片迁移到R2，利用CDN加速
- 保留您现有的优秀实现（如数据库连接适配）

✅ **完备**:

- 覆盖所有关键迁移点
- 详细的实施步骤和验收标准
- 完整的风险评估和缓解策略
- 可操作的脚本和命令

✅ **可行**:

- 总工期2-3周
- 渐进式迁移，降低风险
- 灰度发布，确保稳定

建议按照计划逐步执行，每个阶段完成后进行全面测试再进入下一阶段。有任何问题随时沟通调整！🚀
