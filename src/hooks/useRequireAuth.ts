"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/auth";
import { useSession } from "next-auth/react";

/**
 * 认证检查 Hook
 * 提供认证检查和自动重定向功能
 */
export function useRequireAuth() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // 检查是否已认证
  const isAuthenticated = Boolean(session?.user);

  // 获取当前页面的完整 URL，用于登录后重定向
  const getReturnUrl = useCallback(() => {
    if (typeof window === "undefined") return "/";
    return window.location.href;
  }, []);

  // 重定向到登录页
  const redirectToSignIn = useCallback((returnUrl?: string) => {
    const url = returnUrl || getReturnUrl();
    // 使用 NextAuth 的 signIn 方法，支持多种登录方式
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url)}`);
  }, [router, getReturnUrl]);

  // 认证检查包装器：如果未认证则重定向
  const requireAuth = useCallback(
    <T extends (...args: any[]) => any>(fn: T): T => {
      return ((...args: Parameters<T>) => {
        if (!isAuthenticated) {
          redirectToSignIn();
          return Promise.resolve();
        }
        return fn(...args);
      }) as T;
    },
    [isAuthenticated, redirectToSignIn]
  );

  // 异步认证检查：用于需要在调用前做额外处理的场景
  const checkAuth = useCallback(async (returnUrl?: string) => {
    if (!isAuthenticated) {
      redirectToSignIn(returnUrl);
      return false;
    }
    return true;
  }, [isAuthenticated, redirectToSignIn]);

  return {
    isAuthenticated,
    status, // 'loading' | 'authenticated' | 'unauthenticated'
    session,
    requireAuth,
    checkAuth,
    redirectToSignIn,
  };
}

/**
 * 便捷导出：使用 useRequireAuth 并自动处理未认证情况
 */
export function useAuthGuard<T extends (...args: any[]) => any>(fn: T) {
  const { requireAuth } = useRequireAuth();
  return requireAuth(fn);
}

/**
 * 获取当前认证状态（不包含重定向逻辑）
 * 适用于只需要读取状态，不需要重定向的场景
 */
export function useAuthStatus() {
  const { data: session, status } = useSession();
  return {
    isAuthenticated: Boolean(session?.user),
    status,
    user: session?.user,
  };
}

export default useRequireAuth;
