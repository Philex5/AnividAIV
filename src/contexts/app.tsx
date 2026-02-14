"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { cacheGet, cacheRemove } from "@/lib/cache";

import { CacheKey } from "@/services/constant";
import { ContextValue } from "@/types/context";
import { User } from "@/types/user";
import moment from "moment";
import useOneTapLogin from "@/hooks/useOneTapLogin";
import { useSession } from "next-auth/react";
import { isAuthEnabled, isGoogleOneTapEnabled } from "@/lib/auth";

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  if (isAuthEnabled() && isGoogleOneTapEnabled()) {
    useOneTapLogin();
  }

  const { data: session } = isAuthEnabled() ? useSession() : { data: null };

  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [signModalMessage, setSignModalMessage] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  
  // 积分相关状态
  const [credits, setCredits] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  
  // 缓存相关状态 - 使用ref避免触发重渲染循环
  const creditsCacheRef = useRef<{
    data: number;
    timestamp: number;
  } | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  
  // 防抖相关
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_DELAY = 1000; // 1秒防抖

  // 缓存有效期：5分钟
  const CACHE_DURATION = 5 * 60 * 1000;
  
  // 检查缓存是否有效
  const isCacheValid = (cache: { timestamp: number } | null): boolean => {
    if (!cache) return false;
    return Date.now() - cache.timestamp < CACHE_DURATION;
  };
  
  // 核心刷新积分逻辑
  const doRefreshCredits = async (forceRefresh = false) => {
    if (!session?.user) {
      setCredits(0);
      creditsCacheRef.current = null;
      return;
    }

    // 如果缓存有效且不是强制刷新，使用缓存数据
    if (!forceRefresh && creditsCacheRef.current && isCacheValid(creditsCacheRef.current)) {
      console.log("Context - Using cached credits:", creditsCacheRef.current.data);
      setCredits(creditsCacheRef.current.data);
      return;
    }

    // 防止重复请求
    if (isRefreshingRef.current) {
      console.log("Context - Credits refresh already in progress, skipping...");
      return;
    }

    isRefreshingRef.current = true;
    setIsLoadingCredits(true);
    setCreditsError(null);
    
    try {
      const response = await fetch("/api/get-user-balance", {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Context - Balance API response:", result);

        if (result.code === 0 && typeof result.data?.balance === 'number') {
          const balance = result.data.balance;

          // 更新积分和缓存
          setCredits(balance);
          creditsCacheRef.current = {
            data: balance,
            timestamp: Date.now()
          };

          console.log("Context - Set credits to:", balance);
        } else {
          const errorMessage = result.message || "Failed to get balance";

          if (errorMessage === "no auth") {
            console.log("Context - Balance API unauthenticated, resetting credits");
            setCredits(0);
            creditsCacheRef.current = null;
            return;
          }

          console.error("Context - API error:", errorMessage);
          setCreditsError(errorMessage);

          // 如果有缓存，在错误时使用缓存数据
          if (creditsCacheRef.current) {
            console.log("Context - Using cached credits due to API error");
            setCredits(creditsCacheRef.current.data);
          } else {
            setCredits(0);
          }
        }
      } else {
        console.error("Context - HTTP error:", response.status, response.statusText);
        setCreditsError(`HTTP ${response.status}: ${response.statusText}`);

        // 如果有缓存,在错误时使用缓存数据
        if (creditsCacheRef.current) {
          console.log("Context - Using cached credits due to HTTP error");
          setCredits(creditsCacheRef.current.data);
        } else {
          setCredits(0);
        }
      }
    } catch (error) {
      console.error("Context - Failed to fetch credits:", error);
      setCreditsError("Network error occurred");
      
      // 如果有缓存，在错误时使用缓存数据
      if (creditsCacheRef.current) {
        console.log("Context - Using cached credits due to network error");
        setCredits(creditsCacheRef.current.data);
      } else {
        setCredits(0);
      }
    } finally {
      setIsLoadingCredits(false);
      isRefreshingRef.current = false;
    }
  };
  
  // 防抖版本的刷新积分函数
  const refreshCredits = useCallback((forceRefresh = false) => {
    // 如果是强制刷新，立即执行
    if (forceRefresh) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      doRefreshCredits(true);
      return;
    }
    
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(() => {
      doRefreshCredits(false);
      debounceTimerRef.current = null;
    }, DEBOUNCE_DELAY);
  }, [session?.user]); // dependency on creditsCache removed

  const fetchUserInfo = async function () {
    if (isLoadingUser) {
      console.log("Context - User info fetch already in progress, skipping...");
      return;
    }

    setIsLoadingUser(true);
    try {
      const resp = await fetch("/api/get-user-info", {
        method: "POST",
      });

      if (!resp.ok) {
        throw new Error("fetch user info failed with status: " + resp.status);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);

      // 获取用户信息后刷新积分（不使用缓存，因为用户刚登录）
      refreshCredits(true);

      updateInvite(data);
    } catch (e) {
      console.log("fetch user info failed");
    } finally {
      setIsLoadingUser(false);
    }
  };

  const updateInvite = async (user: User) => {
    try {
      if (user.invited_by) {
        // user already been invited
        console.log("user already been invited", user.invited_by);
        return;
      }

      const inviteCode = cacheGet(CacheKey.InviteCode);
      if (!inviteCode) {
        // no invite code
        return;
      }

      const userCreatedAt = moment(user.created_at).unix();
      const currentTime = moment().unix();
      const timeDiff = Number(currentTime - userCreatedAt);

      if (timeDiff <= 0 || timeDiff > 7200) {
        // user created more than 2 hours
        console.log("user created more than 2 hours");
        return;
      }

      // update invite relation
      console.log("update invite", inviteCode, user.uuid);
      const req = {
        invite_code: inviteCode,
        user_uuid: user.uuid,
      };
      const resp = await fetch("/api/update-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });
      if (!resp.ok) {
        throw new Error("update invite failed with status: " + resp.status);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
      cacheRemove(CacheKey.InviteCode);
    } catch (e) {
      console.log("update invite failed: ", e);
    }
  };

  // 组件挂载时检查是否有 session，如有则加载用户信息
  useEffect(() => {
    if (session?.user) {
      console.log("Context - Initial session detected, fetching user info");
      fetchUserInfo();
    }
  }, []);

  // 添加一个ref来跟踪之前的session状态
  const prevSessionRef = useRef(session);

  useEffect(() => {
    const prevSession = prevSessionRef.current;
    
    // 只有在真正的登录状态变化时才刷新
    if (session && session.user) {
      // 如果之前没有session，或者用户发生了变化，才获取用户信息
      if (!prevSession?.user || prevSession.user.email !== session.user.email) {
        console.log("Context - User login detected, fetching user info");
        fetchUserInfo();
      } else {
        console.log("Context - Same user session, using cached data");
        // 对于同一用户，使用缓存刷新积分
        refreshCredits(false);
      }
    } else {
      // 用户登出
      if (prevSession?.user) {
        console.log("Context - User logout detected");
      }
      setUser(null);
      setCredits(0);
      creditsCacheRef.current = null;
    }
    
    // 更新之前的session引用
    prevSessionRef.current = session;
  }, [session]); // 移除 refreshCredits 依赖，避免循环依赖

  return (
    <AppContext.Provider
      value={{
        showSignModal,
        setShowSignModal,
        signModalMessage,
        setSignModalMessage,
        user,
        setUser,
        isLoadingUser,
        showFeedback,
        setShowFeedback,
        credits,
        setCredits,
        isLoadingCredits,
        creditsError,
        refreshCredits,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
