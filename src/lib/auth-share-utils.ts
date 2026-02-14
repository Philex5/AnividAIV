/**
 * 认证增强的分享功能工具函数
 * 自动检查用户认证状态，未登录时提供友好的交互
 */

import { toast } from "sonner";
import type { ShareContent, SharePlatform } from "@/types/share";
import { shareToPlatform, buildShareUrl, copyToClipboard } from "./share-utils";

// 需要登录的操作类型
export type AuthRequiredAction = "share" | "like" | "favorite" | "download" | "remix";

/**
 * 分享操作配置
 */
interface ShareActionConfig {
  /** 操作类型 */
  type: AuthRequiredAction;
  /** 显示名称 */
  label: string;
  /** 是否总是允许（无需认证） */
  alwaysAllowed?: boolean;
}

/**
 * 认证检查接口
 * 可以从不同的认证库或上下文注入
 */
export interface IAuthChecker {
  /** 检查是否已认证 */
  isAuthenticated: boolean;
  /** 认证状态：loading | authenticated | unauthenticated */
  status: "loading" | "authenticated" | "unauthenticated";
  /** 用户信息 */
  user?: any;
  /** 重定向到登录页 */
  redirectToSignIn: (returnUrl?: string) => void;
}

// 默认认证检查器（使用 NextAuth）
let authChecker: IAuthChecker | null = null;

/**
 * 设置认证检查器
 * @param checker 认证检查器实例
 */
export function setAuthChecker(checker: IAuthChecker) {
  authChecker = checker;
}

/**
 * 获取当前认证检查器
 */
function getAuthChecker(): IAuthChecker {
  if (authChecker) {
    return authChecker;
  }

  // 降级到全局检查（如果未设置）
  if (typeof window !== "undefined") {
    console.warn(
      "Auth checker not set. Please call setAuthChecker() with your auth context."
    );
  }

  return {
    isAuthenticated: false,
    status: "unauthenticated",
    redirectToSignIn: (returnUrl?: string) => {
      if (typeof window !== "undefined") {
        const url = returnUrl || window.location.href;
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(url)}`;
      }
    },
  };
}

/**
 * 检查操作是否需要认证
 */
function requiresAuth(config: ShareActionConfig, isAuthenticated: boolean): boolean {
  if (config.alwaysAllowed) return false;
  return !isAuthenticated;
}

/**
 * 增强的分享到平台函数
 * 自动处理认证检查
 */
export async function authShareToPlatform(
  content: ShareContent,
  platform: SharePlatform,
  options?: {
    authConfig?: ShareActionConfig;
    customChecker?: IAuthChecker;
    onAuthRequired?: (action: ShareActionConfig) => void;
    onSuccess?: (platform: SharePlatform) => void;
    onError?: (platform: SharePlatform, error: Error) => void;
  }
): Promise<void> {
  const { authConfig, customChecker, onAuthRequired, onSuccess, onError } = options || {};
  const checker = customChecker || getAuthChecker();

  // 分享不需要认证（除了某些特殊平台）
  if (authConfig && requiresAuth(authConfig, checker.isAuthenticated)) {
    if (onAuthRequired) {
      onAuthRequired(authConfig);
    } else {
      toast.info("Please sign in to continue", {
        description: authConfig.label + " requires authentication",
        action: {
          label: "Sign In",
          onClick: () => checker.redirectToSignIn(),
        },
      });
    }
    return;
  }

  try {
    await shareToPlatform(content, platform);
    onSuccess?.(platform);
  } catch (error) {
    console.error(`Failed to share to ${platform}:`, error);
    const err = error instanceof Error ? error : new Error("Unknown error");
    onError?.(platform, err);
    throw err;
  }
}

/**
 * 增强的分享函数（支持批量）
 */
export async function authShareToMultiple(
  content: ShareContent,
  platforms: SharePlatform[],
  options?: Parameters<typeof authShareToPlatform>[2]
): Promise<void[]> {
  return Promise.all(
    platforms.map((platform) => authShareToPlatform(content, platform, options))
  );
}

/**
 * 增强的复制链接函数
 * 自动处理认证检查
 */
export async function authCopyShareUrl(
  content: ShareContent,
  options?: {
    customChecker?: IAuthChecker;
    onAuthRequired?: (action: ShareActionConfig) => void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<void> {
  const { customChecker, onAuthRequired, onSuccess, onError } = options || {};
  const checker = customChecker || getAuthChecker();

  // 复制链接通常不需要认证
  const config: ShareActionConfig = {
    type: "share",
    label: "Copy Link",
    alwaysAllowed: true,
  };

  if (requiresAuth(config, checker.isAuthenticated)) {
    if (onAuthRequired) {
      onAuthRequired(config);
    } else {
      toast.info("Please sign in to continue");
    }
    return;
  }

  try {
    const url = buildShareUrl(content);
    await copyToClipboard(url);
    toast.success("Link copied to clipboard!");
    onSuccess?.();
  } catch (error) {
    console.error("Failed to copy link:", error);
    const err = error instanceof Error ? error : new Error("Unknown error");
    onError?.(err);
    throw err;
  }
}

/**
 * 创建认证增强的分享服务
 */
export function createAuthEnhancedShareService(checker: IAuthChecker) {
  return {
    share: (content: ShareContent, platform: SharePlatform) =>
      authShareToPlatform(content, platform, { customChecker: checker }),
    shareMultiple: (content: ShareContent, platforms: SharePlatform[]) =>
      authShareToMultiple(content, platforms, { customChecker: checker }),
    buildShareUrl: buildShareUrl,
    copyToClipboard: (text: string) => copyToClipboard(text),
  };
}

/**
 * 预定义的操作配置
 */
export const AUTH_CONFIGS: Record<AuthRequiredAction, ShareActionConfig> = {
  share: {
    type: "share",
    label: "Share",
    alwaysAllowed: true, // 分享通常不需要认证
  },
  like: {
    type: "like",
    label: "Like",
  },
  favorite: {
    type: "favorite",
    label: "Favorite",
  },
  download: {
    type: "download",
    label: "Download",
  },
  remix: {
    type: "remix",
    label: "Remix",
  },
};

export default {
  authShareToPlatform,
  authShareToMultiple,
  authCopyShareUrl,
  setAuthChecker,
  createAuthEnhancedShareService,
  AUTH_CONFIGS,
};
