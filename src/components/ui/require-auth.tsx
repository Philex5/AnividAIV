"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

/**
 * 认证守卫组件 Props
 */
export interface RequireAuthProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 点击时的回调函数 */
  onClick?: (e: React.MouseEvent) => void | Promise<void>;
  /** 自定义认证检查逻辑 */
  checkAuth?: () => boolean;
  /** 自定义登录页面 URL（可选） */
  signInUrl?: string;
  /** 是否显示登录提示 */
  showTooltip?: boolean;
  /** 登录提示文本 */
  tooltipText?: string;
  /** 按钮 Props（当 children 是 Button 时使用） */
  buttonProps?: ButtonProps;
  /** 自定义类名 */
  className?: string;
}

/**
 * 认证守卫组件
 * 包装需要认证的操作，未登录时自动重定向到登录页
 */
export function RequireAuth({
  children,
  onClick,
  checkAuth,
  signInUrl,
  showTooltip = false,
  tooltipText = "Please sign in to perform this action",
  buttonProps,
  className,
}: RequireAuthProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  // 获取当前页面的完整 URL
  const getReturnUrl = useCallback(() => {
    if (typeof window === "undefined") return "/";
    return window.location.href;
  }, []);

  // 重定向到登录页
  const redirectToSignIn = useCallback((returnUrl?: string) => {
    const url = returnUrl || getReturnUrl();
    const signInPath = signInUrl || `/auth/signin?callbackUrl=${encodeURIComponent(url)}`;
    router.push(signInPath);
  }, [router, getReturnUrl, signInUrl]);

  // 处理点击事件
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      // 阻止事件冒泡
      e.preventDefault();
      e.stopPropagation();

      // 检查认证状态
      const isAuthenticated = checkAuth ? checkAuth() : Boolean(session?.user);

      if (!isAuthenticated) {
        redirectToSignIn();
        return;
      }

      // 执行自定义 onClick
      if (onClick) {
        try {
          await onClick(e);
        } catch (error) {
          console.error("Operation failed:", error);
          // 错误处理由父组件负责
        }
      }
    },
    [onClick, checkAuth, session?.user, redirectToSignIn]
  );

  // 如果是 Button 组件且没有自定义 onClick，则包装 Button
  if (React.isValidElement<ButtonProps>(children) && children.type === Button) {
    return React.cloneElement(children, {
      ...buttonProps,
      ...children.props,
      onClick: handleClick,
      className: cn(className, children.props.className),
    });
  }

  // 默认包装方式：添加 onClick 处理器
  return (
    <div
      className={cn(
        "inline-block cursor-pointer",
        status === "loading" && "pointer-events-none opacity-50",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

/**
 * 简化版本：专门用于包装按钮
 */
export function AuthButton({
  children,
  onClick,
  ...props
}: Omit<RequireAuthProps, "children" | "buttonProps"> & {
  children: React.ReactNode;
  buttonProps?: ButtonProps;
}) {
  return (
    <RequireAuth
      {...props}
      buttonProps={props.buttonProps}
      onClick={onClick}
    >
      {children}
    </RequireAuth>
  );
}

export default RequireAuth;
