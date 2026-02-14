# 优雅的认证守卫实现指南

## 问题背景

在社区功能中，需要实现以下交互逻辑：
- ✅ **未登录用户**：可以查看所有分享弹窗和页面内容
- ❌ **未登录用户**：点击任何操作（点赞、收藏、分享等）时，需要跳转到登录界面
- ✅ **登录后**：自动返回原页面，继续操作

**核心挑战**：避免在每个操作的 handler 中重复编写认证检查代码。

---

## 解决方案概览

我们提供了**三层递进式解决方案**，可以根据具体场景选择：

| 方案 | 适用场景 | 优点 | 复杂度 |
|------|----------|------|--------|
| **useRequireAuth Hook** | 组件内部认证检查 | 最灵活，可包装任意 async 函数 | ⭐⭐ |
| **RequireAuth 组件** | 包装单个按钮或操作 | 直观，直接包装 JSX | ⭐ |
| **authShareToPlatform** | 分享功能的特殊处理 | 专为分享设计，统一处理 | ⭐⭐⭐ |

---

## 方案一：useRequireAuth Hook（推荐）

### 核心优势
1. **一行代码**包装任意 async 函数，自动处理认证检查
2. **零重复**：无需在每个 handler 中写认证逻辑
3. **灵活**：支持自定义认证检查和重定向逻辑

### 快速开始

#### 1. 在组件中导入 Hook
```tsx
import { useRequireAuth } from "@/hooks/useRequireAuth";
```

#### 2. 在组件顶部使用
```tsx
export function YourComponent() {
  const { requireAuth } = useRequireAuth();
  // 只需要一行代码
}
```

#### 3. 包装你的操作函数
```tsx
// 之前：每个函数都要检查认证
const handleLike = async () => {
  if (!isAuthenticated) {
    redirectToSignIn();
    return;
  }
  // 实际逻辑...
};

// 现在：一行代码搞定
const handleLike = requireAuth(async () => {
  // 实际逻辑 - 无需关注认证
  const response = await fetch("/api/like", { method: "POST" });
});
```

---

## 方案二：RequireAuth 组件

### 核心优势
1. **直观**：直接包装 JSX 元素
2. **简单**：无需创建额外的函数
3. **自动**：自动处理事件冒泡和阻止

### 快速开始

#### 1. 导入组件
```tsx
import { RequireAuth, AuthButton } from "@/components/ui/require-auth";
```

#### 2. 包装操作按钮
```tsx
// 包装单个按钮
<RequireAuth onClick={handleLike}>
  <Button>❤️ Like</Button>
</RequireAuth>

// 或使用 AuthButton 简化
<AuthButton onClick={handleFavorite} buttonProps={{ variant: "outline" }}>
  ⭐ Favorite
</AuthButton>
```

---

## 方案三：authShareToPlatform 函数

### 核心优势
1. **专业**：专为分享功能设计
2. **统一**：集中处理所有分享相关的认证
3. **可配置**：支持自定义认证检查器

### 快速开始

#### 1. 设置认证检查器
```tsx
import { setAuthChecker } from "@/lib/auth-share-utils";
import { useSession } from "next-auth/react";

function ShareMenu() {
  const { data: session } = useSession();

  // 在组件中设置检查器
  setAuthChecker({
    isAuthenticated: Boolean(session?.user),
    status: session ? "authenticated" : "unauthenticated",
    redirectToSignIn: (returnUrl) => {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`);
    },
  });
}
```

#### 2. 使用认证增强的分享
```tsx
import { authShareToPlatform, AUTH_CONFIGS } from "@/lib/auth-share-utils";

const handleShare = async (platform) => {
  await authShareToPlatform(content, platform, {
    authConfig: AUTH_CONFIGS.share,
    onSuccess: () => console.log("Shared!"),
    onError: (platform, error) => console.error(error),
  });
};
```

---

## 实际应用示例

### 在 ActionBar 组件中

**修改前**：
```tsx
// 需要在每个 handler 中重复检查认证
const handleLike = async () => {
  if (!isAuthenticated) {
    redirectToSignIn();
    return;
  }
  // 实际逻辑...
};

const handleFavorite = async () => {
  if (!isAuthenticated) {
    redirectToSignIn();
    return;
  }
  // 实际逻辑...
};
```

**修改后**：
```tsx
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function ActionBar() {
  const { requireAuth } = useRequireAuth();

  const handleLike = requireAuth(async () => {
    // 直接写逻辑，无需关心认证
  });

  const handleFavorite = requireAuth(async () => {
    // 直接写逻辑，无需关心认证
  });

  return (
    <div>
      <button onClick={handleLike}>❤️</button>
      <button onClick={handleFavorite}>⭐</button>
    </div>
  );
}
```

### 在 ArtworkCard 组件中

**修改前**：
```tsx
const handleLike = async (event) => {
  event.preventDefault();
  if (!isAuthenticated) {
    redirectToSignIn();
    return;
  }
  const next = !Boolean(artwork.liked);
  await onToggleLike?.(artwork.uuid, next);
};
```

**修改后**：
```tsx
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function ArtworkCard() {
  const { requireAuth } = useRequireAuth();

  const handleLike = requireAuth(async () => {
    const next = !Boolean(artwork.liked);
    await onToggleLike?.(artwork.uuid, next);
  });

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleLike}>❤️ {artwork.like_count}</button>
    </div>
  );
}
```

### 在 ShareMenu 组件中

**方案一：使用 Hook**
```tsx
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function ShareMenu() {
  const { requireAuth } = useRequireAuth();

  const handleShare = requireAuth(async (platform) => {
    await shareToPlatform(content, platform);
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Share</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleShare(SharePlatform.TWITTER)}>
          Share to Twitter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**方案二：使用组件包装**
```tsx
import { RequireAuth } from "@/components/ui/require-auth";

export function ShareMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Share</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <RequireAuth onClick={() => shareToPlatform(content, SharePlatform.TWITTER)}>
          <DropdownMenuItem>
            Share to Twitter
          </DropdownMenuItem>
        </RequireAuth>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 最佳实践

### 1. 统一认证检查
在应用根组件中设置认证检查器，避免重复初始化。

```tsx
// app/layout.tsx
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
```

### 2. 使用 callbackUrl 保存返回地址
所有登录跳转都应该包含 `callbackUrl` 参数。

```tsx
// 在 useRequireAuth 中自动处理
const { redirectToSignIn } = useRequireAuth();
// 自动保存当前页面 URL 到 callbackUrl
```

### 3. 错误处理
所有方案都提供统一的错误处理机制。

```tsx
const handleLike = requireAuth(async () => {
  try {
    await apiCall();
  } catch (error) {
    // 错误由调用方处理
    toast.error("Operation failed");
  }
});
```

### 4. 加载状态
在认证检查期间显示加载状态。

```tsx
const { status, isAuthenticated } = useRequireAuth();

if (status === "loading") {
  return <Spinner />;
}
```

---

## 常见问题

### Q1: 如何处理服务端渲染？
A: 确保在客户端组件中使用这些工具，或使用 `useEffect` 延迟初始化。

```tsx
"use client"; // 确保是客户端组件

export function Component() {
  const { requireAuth } = useRequireAuth();
  // ...
}
```

### Q2: 如何自定义登录页面？
A: 在 `redirectToSignIn` 中指定自定义 URL。

```tsx
const { redirectToSignIn } = useRequireAuth();

// 使用自定义登录页
const handleClick = requireAuth(async () => {
  // 业务逻辑
});

// 或在 RequireAuth 组件中
<RequireAuth signInUrl="/custom-signin">
  <Button>Action</Button>
</RequireAuth>
```

### Q3: 如何处理多个认证提供者？
A: `redirectToSignIn` 会自动处理，NextAuth 会显示所有配置的登录方式。

### Q4: 是否需要修改 API 路由？
A: 不需要。API 路由的认证检查应该独立于前端逻辑。

---

## 实施步骤

### 阶段1：基础工具（必须）
1. ✅ 创建 `useRequireAuth` Hook
2. ✅ 创建 `RequireAuth` 组件
3. ✅ 创建 `authShareToPlatform` 函数

### 阶段2：组件更新（按需）
1. 📝 更新 `ActionBar` 组件
2. 📝 更新 `ArtworkCard` 组件
3. 📝 更新 `ShareMenu` 组件
4. 📝 更新 `ArtworkDetailModal` 组件

### 阶段3：测试（必须）
1. 🔍 测试未登录用户行为
2. 🔍 测试登录流程
3. 🔍 测试登录后返回
4. 🔍 测试错误处理

### 阶段4：优化（可选）
1. 🎨 添加加载状态
2. 🎨 添加错误提示
3. 🎨 添加用户引导
4. 🎨 性能优化

---

## 总结

通过使用这三层解决方案，我们实现了：

1. ✅ **零重复**：避免在每个 handler 中写认证检查
2. ✅ **一致性**：所有组件使用相同的认证逻辑
3. ✅ **可维护性**：认证逻辑集中管理，易于修改
4. ✅ **用户体验**：流畅的登录跳转和返回
5. ✅ **类型安全**：完整的 TypeScript 支持

**推荐策略**：
- 默认使用 `useRequireAuth` Hook（最灵活）
- 简单场景使用 `RequireAuth` 组件（最直观）
- 分享功能使用 `authShareToPlatform`（最专业）

这样，我们就可以优雅地处理未登录用户的交互需求，同时保持代码的简洁和可维护性。
