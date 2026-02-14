**所有回复使用中文**

## 项目基本信息

AnividAI - 一站式AI动漫风格艺术生成站。使用AI能力，创建图片、文字、视频、语音等形式及各种应用场景的动漫风格艺术生成。（原oc app已改名为studio tools)

**目前仅支持英文和日语，后续再通过国际化配置扩展其他语言**

## 部署环境

Cloudflare Worker

## 开发规范

**核心原则不是保证能工作不报错,是保证使用正确的处理方式,有问题就要抛出来**'

1. 尽可能复用ShipAny框架已有的组件和能力，除非必要，不要重复造轮子。
2. 新增需求时按照 `文档驱动开发流程` 组织整个流程
3. UI设计符合响应式设计，桌面端、移动端任何尺寸都有完美体验
4. 页面文本使用国际化配置各个语言的表达，拒绝中文或者英文的硬编码; 使用页面级国际化配置只使用@i18n/pages/下对应页面的翻译配置了。除了全局组件/全局文本（如风格名，species 名，gallery 选择器等），不准使用src/i18n/messages的全局翻译.
5. 文档编写不要写大量代码，只需要写实现思路及少量帮助理解思路的伪代码（如需）
6. 直接使用主题配色，避免使用颜色硬编码，参考框架自带组件实现，如：src/components/ui/button.tsx
7. 所有的报错信息及默认取值均使用英文，不准使用中文文本
8. 撰写markdown格式的文档要避免出现乱码
9. prompt模板统一配置再：src/configs/prompts/，使用实际取值替换模板中对应变量再请求模型。
10. 所有涉及前端的开发都要符合产品的主题配色和UI/UX方案

## ShipAny框架基本信息

### 1. Framework Introduction & Features

ShipAny Template One is a comprehensive AI SaaS boilerplate designed to accelerate the development of AI-powered web applications. This template provides a solid foundation with modern technologies and best practices, allowing developers to focus on building their unique AI features rather than setting up infrastructure.

#### Key Features:

- **Modern Tech Stack**: Built with Next.js 15, React 19, TypeScript, and Tailwind CSS 4
- **AI Integration Ready**: Pre-configured with AI SDK providers (OpenAI, Deepseek, Replicate, OpenRouter)
- **Authentication System**: Multiple auth providers including Google, GitHub, and credentials (Google One Tap)
- **Internationalization**: Built-in multi-language support with next-intl (English and Japanese)
- **Payment Integration**: Stripe and Creem payment processing for subscriptions and one-time purchases
- **User Management**: Complete user registration, authentication, and profile management
- **Credits System**: Built-in credits/tokens system for AI usage tracking
- **Affiliate System**: Invite codes and affiliate tracking functionality
- **Admin Dashboard**: Administrative interface for user management and analytics
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS 4 and Shadcn UI components
- **API Key Management**: Create and manage API keys for programmatic access
- **Database Integration**: Drizzle ORM with PostgreSQL for data storage and management
- **Content Management**: Built-in blog/post system with category support
- **Documentation System**: Fumadocs integration for documentation pages

### 2. Technical Architectaure

#### Frontend:

- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with functional components
- **Styling**: Tailwind CSS with Shadcn UI components
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation
- **Notifications**: Sonner for toast notifications

#### Backend:

- **API Routes**: Next.js API routes for server-side logic
- **Authentication**: NextAuth.js (next-auth v5) for authentication
- **Database**: PostgreSQL with Drizzle ORM for data storage
- **File Storage**: AWS S3 for file uploads and storage
- **Payment Processing**: Stripe and Creem for payment handling

#### AI Integration:

- **AI SDK**: Support for multiple AI providers (OpenAI, Deepseek, Replicate)
- **Streaming**: Support for streaming AI responses
- **Media Generation**: Support for image and video generation

#### Internationalization:

- **Library**: next-intl for multi-language support
- **Languages**: English and Japanese supported out of the box

#### Deployment Options:

- **Standalone Output**: Configured for standalone deployment
- **Docker Support**: Dockerfile included for containerized deployment
- **Cloudflare Pages**: Support for Cloudflare Pages deployment with OpenNext
- **Vercel**: Support for Vercel deployment

### 3. Code Directory Structure

```
shipany-template-one/
├── content/                # Documentation content
│   └── docs/               # Fumadocs documentation files
├── src/                    # Source code directory
│   ├── aisdk/              # AI SDK integration
│   ├── app/                # Next.js App Router
│   │   ├── (legal)/        # Legal pages (privacy, terms)
│   │   ├── [locale]/       # Locale-specific pages
│   │   │   ├── (admin)/    # Admin dashboard pages
│   │   │   ├── (default)/  # User-facing pages
│   │   │   │   ├── (console)/  # User console pages
│   │   │   │   └── posts/      # Blog/content pages
│   │   │   ├── (docs)/     # Documentation pages
│   │   │   └── auth/       # Authentication pages
│   │   └── api/            # API routes
│   ├── auth/               # Authentication configuration
│   ├── components/         # React components
│   │   ├── analytics/      # Analytics components
│   │   ├── blocks/         # Layout blocks (header, footer)
│   │   ├── console/        # Console UI components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── feedback/       # User feedback components
│   │   ├── icon/           # Icon components
│   │   ├── invite/         # Invite system components
│   │   ├── locale/         # Locale switcher components
│   │   ├── markdown/       # Markdown rendering components
│   │   ├── sign/           # Sign-in/sign-up components
│   │   ├── theme/          # Theme components
│   │   └── ui/             # Reusable UI components
│   ├── contexts/           # React contexts
│   ├── db/                 # Database configuration and schema
│   │   ├── migrations/     # Database migration files
│   │   └── schema.ts       # Drizzle database schema
│   ├── hooks/              # Custom React hooks
│   ├── i18n/               # Internationalization
│   │   ├── messages/       # Global messages
│   │   └── pages/          # Page-specific translations
│   ├── integrations/       # External service integrations
│   │   ├── creem/          # Creem payment integration
│   │   └── stripe/         # Stripe payment integration
│   ├── lib/                # Utility libraries
│   │   └── storage/        # R2 Storage Mangement
│   │   └── r2-utils.ts/    # r2 image url consruct & get
│   │   └── /configs/index.ts # config management
│   ├── models/             # Data models
│   ├── providers/          # React providers
│   ├── services/           # Business logic services
│   └── types/              # TypeScript type definitions
│       ├── blocks/         # Types for layout blocks
│       ├── pages/          # Types for pages
│       └── slots/          # Types for slots
└── public/                 # Static assets
```

### 4. Implemented Features & Corresponding Files

#### Multi-language Support

- **Configuration**: `src/i18n/locale.ts`, `src/i18n/routing.ts`, `src/i18n/navigation.ts`
- **Messages**: `src/i18n/messages/en.json`
- **Page-specific translations**: `src/i18n/pages/landing/en.json`, `src/i18n/pages/pricing/en.json`, `src/i18n/pages/showcase/en.json`
- **Locale Switcher Component**: `src/components/locale/`

#### User Authentication & Authorization

- **Auth Configuration**: `src/auth/config.ts`, `src/auth/handler.ts`
- **Auth Providers**: Google, GitHub, and Credentials (Google One Tap)
- **Sign-in Page**: `src/app/[locale]/auth/signin/`
- **Auth API Route**: `src/app/api/auth/[...nextauth]/route.ts`
- **User Components**: `src/components/sign/`

### User Management

- **User Model**: `src/models/user.ts`
- **User Service**: `src/services/user.ts`
- **User API Routes**: `src/app/api/get-user-info/route.ts`
- **Admin User Management**: `src/app/[locale]/(admin)/admin/users/`

#### Credits System

- **Credits Model**: `src/models/credit.ts`
- **Credits Service**: `src/services/credit.ts`
- **Credits API Route**: `src/app/api/get-user-credits/route.ts`
- **Credits Page**: `src/app/[locale]/(default)/(console)/my-credits/`

#### Payment Integration

- **Order Model**: `src/models/order.ts`
- **Order Service**: `src/services/order.ts`
- **Checkout API**: `src/app/api/checkout/route.ts`
- **Payment Webhooks**: `src/app/api/pay/notify/stripe/route.ts`, `src/app/api/pay/notify/creem/route.ts`
- **Payment Callbacks**: `src/app/api/pay/callback/stripe/route.ts`, `src/app/api/pay/callback/creem/route.ts`
- **Integrations**: `src/integrations/stripe/`, `src/integrations/creem/`

#### Affiliate System

- **Affiliate Model**: `src/models/affiliate.ts`
- **Affiliate Service**: `src/services/affiliate.ts`
- **Invite API Routes**: `src/app/api/update-invite/route.ts`, `src/app/api/update-invite-code/route.ts`
- **Invite Page**: `src/app/[locale]/(default)/(console)/my-invites/`
- **Invite Code Page**: `src/app/[locale]/(default)/i/[code]/`

#### API Key Management

- **API Key Model**: `src/models/apikey.ts`
- **API Key Service**: `src/services/apikey.ts`
- **API Keys Page**: `src/app/[locale]/(default)/(console)/api-keys/`
- **Create API Key Page**: `src/app/[locale]/(default)/(console)/api-keys/create/`

#### Content Management System

- **Category Model**: `src/models/category.ts`
- **Post Model**: `src/models/post.ts`
- **Posts Pages**: `src/app/[locale]/(default)/posts/`
- **Admin Category Management**: `src/app/[locale]/(admin)/admin/categories/`
- **Admin Post Management**: `src/app/[locale]/(admin)/admin/posts/`

#### Documentation System

- **Documentation Pages**: `src/app/[locale]/(docs)/docs/`
- **Content**: `content/docs/`
- **Configuration**: `source.config.ts`

#### Feedback System

- **Feedback Model**: `src/models/feedback.ts`
- **Feedback API**: `src/app/api/add-feedback/route.ts`
- **Admin Feedback Management**: `src/app/[locale]/(admin)/admin/feedbacks/`

#### AI Integration

shipAny(using ai-sdk As a reference):

- **AI SDK Configuration**: `src/aisdk/provider/`

Custom kie-provider (Currently in use) :

- src/services/generation/providers

### 5. Data Flow Model

The application follows a clear layered architecture for data handling:

#### Model → Service → API Layer Pattern

1. **Models Layer** (`models/`):
   - Responsible for direct database interactions
   - Defines database schema and operations
   - Example: `models/user.ts` handles user data CRUD operations

2. **Services Layer** (`services/`):
   - Implements business logic
   - Orchestrates operations across multiple models
   - Handles complex operations like transactions
   - Example: `services/user.ts` manages user-related business logic

3. **API Layer** (`app/api/`):
   - Exposes endpoints for client-side consumption
   - Validates input data
   - Calls appropriate service methods
   - Returns formatted responses
   - Example: `app/api/get-user-info/route.ts` provides user information API

#### Example Data Flow: User Management

1. **Database Schema**: User table in Supabase
2. **Model Layer**: `models/user.ts` provides functions like `findUserByEmail`, `insertUser`
3. **Service Layer**: `services/user.ts` implements `saveUser`, `getUserInfo`
4. **API Layer**: `app/api/get-user-info/route.ts` exposes user data to the frontend
5. **Frontend Consumption**: Components use the API to display and manage user data

#### Example Implementation: User

```typescript
// 1. Model Layer (src/models/user.ts)
export async function findUserByEmail(
  email: string,
  provider?: string,
): Promise<User | undefined> {
  const db = getDb();
  const query = db.select().from(users).where(eq(users.email, email));

  if (provider) {
    query.where(eq(users.signin_provider, provider));
  }

  const result = await query.limit(1);
  return result[0];
}

// 2. Service Layer (src/services/user.ts)
export async function saveUser(user: User) {
  try {
    const existUser = await findUserByEmail(user.email, user.signin_provider);
    if (!existUser) {
      await insertUser(user);
      // Additional business logic for new users
      await increaseCredits({
        user_uuid: user.uuid || "",
        trans_type: CreditsTransType.NewUser,
        credits: CreditsAmount.NewUserGet,
        expired_at: getOneYearLaterTimestr(),
      });
    } else {
      user.id = existUser.id;
      user.uuid = existUser.uuid;
      user.created_at = existUser.created_at;
    }
    return user;
  } catch (e) {
    console.log("save user failed: ", e);
    throw e;
  }
}

// 3. API Layer (src/app/api/get-user-info/route.ts)
export async function GET() {
  try {
    const user = await getUserInfo();
    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: "Failed to get user info" }, { status: 500 });
  }
}
```

### 6. Development Guidelines

#### Adding New Pages

When adding new pages to the application, follow these guidelines:

1. **Locale Structure**: Place new pages under the appropriate locale directory: `src/app/[locale]/(default)/your-page/`
2. **Page Component**: Create a page component with proper TypeScript typing
3. **Internationalization**: Add translations to `src/i18n/pages/your-page/en.json`
4. **Reference Example**: Study existing pages like `src/app/[locale]/(default)/posts/` for reference

##### Adding New Components

When creating new components:

1. **Component Location**: Place components in the appropriate directory:
   - UI components: `src/components/ui/`
   - Layout blocks: `src/components/blocks/`
   - Feature-specific components: Create or use existing feature directories
2. **TypeScript**: Use proper TypeScript typing for props and state
3. **Internationalization**: Use the `useTranslations` hook for text content
4. **Styling**: Use Tailwind CSS 4 for styling
5. **Reference Example**: Study existing components like those in `src/components/ui/` for reference

#### Adding New Data Models

When adding new data models:

1. **Database Schema**: Add new table definitions to `src/db/schema.ts` using Drizzle ORM
2. **Model Definition**: Create a new file in `src/models/` directory (e.g., `src/models/product.ts`)
3. **Database Operations**: Implement CRUD operations using Drizzle ORM
4. **Service Layer**: Create a corresponding service in `src/services/` (e.g., `src/services/product.ts`)
5. **API Routes**: Create API routes in `src/app/api/` as needed
6. **Database Migration**: Generate and run migrations using `pnpm db:generate` and `pnpm db:migrate`
7. **Reference Example**: Study existing models like `src/models/user.ts` and `src/services/user.ts`

#### Internationalization

When adding new text content:

1. **Global Messages**: Add common messages to `src/i18n/messages/en.json`
2. **Page-specific Messages**: Add page-specific messages to `src/i18n/pages/your-page/en.json`
3. **Usage in Components**: Use the `useTranslations` hook to access translations
4. **Reference Example**: Study existing translations in `src/i18n/messages/` and `src/i18n/pages/`

#### Authentication and Authorization

When implementing protected features:

1. **Auth Check**: Use the `auth()` function from `@/auth` to check authentication status
2. **User Data**: Use `getUserInfo()` from `src/services/user.ts` to get current user data
3. **Protected Routes**: Implement route protection using middleware or page-level checks
4. **Reference Example**: Study existing protected routes in `src/app/[locale]/(default)/(console)/`

### Payment Integration

When implementing payment features:

1. **Product Definition**: Define products in payment provider dashboards (Stripe, Creem)
2. **Checkout Flow**: Use `src/app/api/checkout/route.ts` as reference for creating checkout sessions
3. **Webhook Handling**: Use payment webhook routes in `src/app/api/pay/notify/` for handling payment webhooks
4. **Callback Handling**: Use payment callback routes in `src/app/api/pay/callback/` for handling payment returns
5. **Order Tracking**: Use `src/models/order.ts` and `src/services/order.ts` for order management
6. **Integration Services**: Use `src/integrations/stripe/` and `src/integrations/creem/` for payment provider integrations
7. **Reference Example**: Study the existing payment flow in the application

### 7. Conclusion

ShipAny Template One provides a robust foundation for building AI-powered SaaS applications. By following the established patterns and guidelines, developers can maintain consistency and avoid reinventing the wheel when extending the application.

## 配置管理

配置都记录在 @src/configs/，如模型，prompt, 动漫、角色等参数配置，风格等：
│ src/configs/

## 项目文档管理

### 文档目录

├── docs/
| |—— ShipAny-Framework-Guide.md 基础框架ShipAny详情
| |—— research
│ │ ├── market-research-report.md # 市场调研报告
│ │  
│ ├── 1-specs/ # 规格层（稳定）
│ │ ├── pricing-model.md # 定价模型
│ │ ├── PRD.md # 产品需求文档
│ │ ├── architecture.md # 架构设计
│ │ └── data-models.md # 数据模型
│ │ └── ui-ux-design.md # 网站UI/UX风格说明
│ │ └── model_api/ # 网站使用的图片生成、聊天、视频生成等使用的平台及api规范
| | │ └── kie_api_specs.md #当前使用kie AI平台的api规范及模型信息
│ ├── 2-implementation/ # 实现层（活跃）
│ │ ├── api/ # API设计与变更
│ │ ├── ├──API-INDEX.md # API索引
│ │ ├── frontend/ # 前端实现细节
│ │ └── backend/ # 后端实现细节
│ │
│ └── 3-operations/ # 运营层（追踪）
│ │ ├── tasks.md # 任务列表
│ │ ├── changelog.md # 开发日志
│ │ └── decisions.md # 技术决策记录
│ │
├── tests/
│ ├── test-plan.md # 测试计划
│ ├── test-cases/ # 测试用例
│ └── test-reports/ # 测试报告

### 单一事实来源（谁说了算）

- PRD与验收：docs/1-specs/PRD.md
- API契约：docs/2-implementation/api/\*.md
- 数据模型：docs/1-specs/data-models.md
- Feature总览/跨层流程：docs/2-implementation/feature-\*.md
- 前端细节：docs/2-implementation/frontend/\*
- 后端细节：docs/2-implementation/backend/\*

## 文档驱动开发流程

目标：**保证“新增需求 → 契约落地 → 前后端细化 → 测试闭环 → 可追溯上线”的文档驱动飞轮稳定运转。**

### 1. 建立锚点与PRD更新

- 如果是新增的核心功能，如oc maker,需更新 docs/1-specs/PRD.md，如果只是一些组件、页面优化则不需要
  - 补充该需求描述与可测试的验收标准
  - 在文末“变更历史”追加：YYYY-MM-DD FEAT-xxx 新增/调整摘要
  - 约定标识：为需求分配slug（例：FEAT-favorites）

### 2. 创建 Feature 总览文档（纵向切片）

- 新建 docs/2-implementation/features/eature-{slug}.md，写“当前方案”，文末维护“变更历史”
  内容要点：
  - 背景与目标（链接到PRD段落）
  - 验收标准（摘录或引用PRD）
  - 系统级流程/时序（从入口到结果，文字版即可）
  - 影响清单（先占位链接，后续填充）
  - API：链接到 api/\*.md 的具体段落
  - 数据模型：链接到 data-models.md 的相关表/字段
  - 前端：涉及的 page-/component- 文档
  - 后端：涉及的 module-/service- 文档
  - 测试要点与用例索引（链接 tests/test-cases/FEAT-xxx-\*.md）

### 3. 落地契约（API 与数据模型）

- API：更新或新增 docs/2-implementation/api/{domain}.md
  - 顶部“当前版本”：接口签名、请求/响应、错误码
  - 文末“变更历史”：YYYY-MM-DD FEAT-xxx 摘要
- 数据模型：更新 docs/1-specs/data-models.md
  - 新表/字段/关系与约束、迁移要点
  - 涉及到的具体代码文件需要在对应位置列出其相对路径
  - 文末“变更历史”：YYYY-MM-DD FEAT-xxx 摘要
  - 回到 feature-{slug}.md 的“影响清单”，补齐这些链接

### 4. 细化前端文档（横向层）

- 在 docs/2-implementation/frontend/ 新建或更新：
  - page-.md（页面）、component-.md（复用组件）、state-management.md（如涉及）
  - 文档顶部加 Related: FEAT-xxx（链接回 feature 文档）
  - 说明结构/状态/交互、与API字段映射、加载/错误/空态、权限/路由
  - 涉及到的具体代码文件需要在对应位置列出其相对路径
  - 在 feature 的“影响清单”中链接这些文档

### 5. 细化后端文档（横向层）

- 在 docs/2-implementation/backend/ 新建或更新：
  - module-.md（业务模块）、service-.md（服务）、workflow-\*.md（复杂流程）
  - 文档顶部加 Related: FEAT-xxx（链接回 feature 文档）
  - 说明责任边界、数据流、事务/并发、幂等/重试、错误码、依赖配置
  - 涉及全局配置信息的变更，在1-specs/configs/ 归档.
  - 涉及到的具体代码文件需要在对应位置列出其相对路径
  - 在 feature 的“影响清单”中链接这些文档

### 6. 任务拆解与追踪

- 新增 docs/3-operations/tasks/tasks-feature-{slug}.md任务卡：
  - 描述 + 验收标准（可引用PRD）
  - 设计：docs/2-implementation/feature-{slug}.md
  - 测试：tests/test-cases/FEAT-xxx-\*.md
  - 依赖：上游/下游任务（如有）
  - 粒度控制：单任务1–2天可完成

### 7. 测试用例与计划

- 新增 tests/test-cases/FEAT-xxx-\*.md
  - 至少三类用例：主路径、错误/边界、回归
  - 标注“关联需求：FEAT-xxx（PRD段落链接）”
  - tests/test-plan.md（可选）：简单标记覆盖目标与优先级
  - 执行后将结果简记入 tests/test-reports/（可贴控制台摘要）

### 8. 开发中与收口时的同步

- 开发中若方案微调：
  - 覆盖更新 feature-{slug}.md 的“当前方案”，文末“变更历史”加一行
  - 同步受影响的 API/data-model/frontend/backend 文档对应段落
  - 完成后更新 docs/3-operations/changelog.md：
  - 追加一行：YYYY-MM-DD FEAT-xxx 摘要（接口/表/页面要点）#提交哈希/PR链接
  - 如有重要取舍或多方案权衡，更新 docs/3-operations/decisions.md：
  - 背景、选项、决策、理由、影响

### 9. 双向链接与一致性要求

- feature 文档“影响清单”指向 API、数据模型、前端、后端具体段落
- 前端/后端文档顶部反向链接回该 feature
- 测试用例文件名与内容内均包含 FEAT-xxx，便于检索与追溯
- 所有文档采用“当前视图 + 文末单行变更历史”；历史版本交给Git

### 命名与模板建议

- 需求编号：FEAT-123；slug：kebab-case（如 favorites）
- 变更历史行格式：
  - YYYY-MM-DD FEAT-123 摘要（影响：API/表/页面）
- 任务卡模板（tasks-feature-{slug}.md）
  -[] FEAT-123 收藏功能
  -[] 验收：…
  -[] 设计：docs/2-implementation/feature-favorites.md
  -[] 测试：tests/test-cases/FEAT-123-favorites.md

### 完成判定（DoD）速查

-[] PRD含可测试验收标准
-[] feature-{slug}.md 存在并列出完整影响清单
-[] API与数据模型文档已更新并被 feature 链接
-[] 前端/后端文档已细化且反向链接 feature
-[] 测试用例已新增并通过
-[]changelog 已追加；必要时 decisions 已记录
