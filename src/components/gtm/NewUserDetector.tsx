"use client";

import { useEffect, useState } from "react";
import { trackUserRegistration } from "@/lib/gtm";

interface NewUserDetectorProps {
  userUuid: string;
  userEmail: string;
  signupMethod: string;
  signupProvider: string;
  welcomeCredits: number;
  creditsExpiredAt: string;
}

/**
 * 新用户注册事件检测器
 * 在客户端检测新用户注册并发送GTM事件
 * 原理：通过localStorage记录用户注册状态，避免重复发送
 */
export default function NewUserDetector({
  userUuid,
  userEmail,
  signupMethod,
  signupProvider,
  welcomeCredits,
  creditsExpiredAt,
}: NewUserDetectorProps) {
  const [hasTracked, setHasTracked] = useState(false);

  useEffect(() => {
    // 检查是否已经发送过事件（避免页面刷新重复发送）
    const trackKey = `gtm_user_registration_tracked_${userUuid}`;
    const isAlreadyTracked = localStorage.getItem(trackKey);

    if (!isAlreadyTracked) {
      try {
        // 发送GTM事件
        trackUserRegistration({
          user_uuid: userUuid,
          user_email: userEmail,
          signup_method: signupMethod,
          signup_provider: signupProvider,
          welcome_credits: welcomeCredits,
          credits_expired_at: creditsExpiredAt,
        });

        // 标记为已发送
        localStorage.setItem(trackKey, "true");
        setHasTracked(true);

        console.log(`[GTM] User registration event sent for ${userEmail}`);
      } catch (error) {
        console.error("[GTM] Failed to send user_registration event:", error);
      }
    }
  }, [userUuid, userEmail, signupMethod, signupProvider, welcomeCredits, creditsExpiredAt]);

  // 这个组件不渲染任何UI
  return null;
}
