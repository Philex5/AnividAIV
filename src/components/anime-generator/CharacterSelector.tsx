"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/app";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

interface CharacterAvatar {
  uuid: string;
  name: string;
  avatarUrl: string | null;
  hasAvatar: boolean;
}
interface CharacterSelectorProps {
  value: string | string[]; // 支持单选和多选
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
  disabledReason?: string; // 禁用原因,用于Tooltip
  className?: string;
  pageData: AnimeGeneratorPage;
  multiSelect?: boolean; // 是否支持多选
  maxSelection?: number; // 最大选择数量，默认为1
}

export function CharacterSelector({
  value,
  onChange,
  disabled = false,
  disabledReason,
  className,
  pageData,
  multiSelect = false,
  maxSelection = 1,
}: CharacterSelectorProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user } = useAppContext();
  const t = useTranslations();
  const tParams = useTranslations("parameters");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userCharacters, setUserCharacters] = useState<CharacterAvatar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [lastLoadedUserId, setLastLoadedUserId] = useState<string | null>(null);
  const [hasLoadedOnMount, setHasLoadedOnMount] = useState(false);

  // 加载用户角色
  useEffect(() => {
    const loadUserCharacters = async () => {
      // 如果用户未登录，清空数据
      if (!user || status === "unauthenticated") {
        setUserCharacters([]);
        setIsLoading(false);
        setLastLoadedUserId(null);
        setHasLoadedOnMount(false);
        return;
      }

      // 如果 session 状态还在加载中，等待
      if (status === "loading") {
        return;
      }

      // 检查是否已经为当前用户加载过数据，避免重复请求
      const currentUserId = user.uuid;
      if (
        currentUserId &&
        currentUserId === lastLoadedUserId &&
        hasLoadedOnMount
      ) {
        return;
      }

      // 用户已登录且 session 已准备好，加载角色数据
      if (user && status === "authenticated" && currentUserId) {
        try {
          setIsLoading(true);
          const response = await fetch(
            "/api/users/character-avatars?deviceType=desktop"
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          // Characters are already sorted by updated_at desc from API
          const characters = data.data?.characters || [];

          setUserCharacters(characters);
          setLastLoadedUserId(currentUserId);
          setHasLoadedOnMount(true);
        } catch (error) {
          console.error("Failed to load user characters:", error);
          setUserCharacters([]);
          // 可以在这里添加错误提示给用户
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadUserCharacters();
  }, [user?.uuid, status]);

  // 检查滚动状态
  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // 监听滚动事件
  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      checkScrollability();
      element.addEventListener("scroll", checkScrollability);
      const resizeObserver = new ResizeObserver(checkScrollability);
      resizeObserver.observe(element);

      return () => {
        element.removeEventListener("scroll", checkScrollability);
        resizeObserver.disconnect();
      };
    }
  }, [userCharacters]);

  // 移除这个条件渲染，始终显示标题和按钮

  const handleCharacterSelect = (characterId: string) => {
    if (disabled) return;

    if (multiSelect) {
      const selectedArray = Array.isArray(value) ? value : value ? [value] : [];
      const isSelected = selectedArray.includes(characterId);

      if (isSelected) {
        // 取消选择
        const newSelection = selectedArray.filter((id) => id !== characterId);
        onChange(newSelection);
      } else {
        // 添加选择
        if (maxSelection === 1) {
          // 当最大数量为1时，直接替换
          onChange([characterId]);
        } else if (selectedArray.length < maxSelection) {
          // 多选模式且未达到最大数量
          const newSelection = [...selectedArray, characterId];
          onChange(newSelection);
        }
      }
    } else {
      // 单选模式
      const currentValue = Array.isArray(value) ? value[0] || "" : value;
      onChange(characterId === currentValue ? "" : characterId);
    }
  };

  const handleCreateOC = () => {
    router.push("/oc-maker");
  };

  // 手动刷新角色数据的方法
  const refreshCharacters = async () => {
    if (!user || status !== "authenticated") return;

    try {
      setIsLoading(true);
      const response = await fetch(
        "/api/users/character-avatars?deviceType=desktop"
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Characters are already sorted by updated_at desc from API
      const characters = data.data?.characters || [];

      setUserCharacters(characters);
      setLastLoadedUserId(user.uuid || null);
    } catch (error) {
      console.error("Failed to refresh user characters:", error);
      // 保持现有数据，不清空
    } finally {
      setIsLoading(false);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      const newScrollLeft =
        direction === "left"
          ? scrollRef.current.scrollLeft - scrollAmount
          : scrollRef.current.scrollLeft + scrollAmount;

      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "text-sm font-medium",
            disabled && disabledReason && "text-muted-foreground"
          )}>
            {tParams("character")}
          </h3>
          {multiSelect && (
            <span className="text-xs text-muted-foreground">
              {Array.isArray(value) ? value.length : value ? 1 : 0}/
              {maxSelection}
            </span>
          )}
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateOC}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-1 h-7 px-2 text-xs rounded-md",
                    disabled && disabledReason && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <PlusIcon className="w-3 h-3" />
                  {pageData.create_oc}
                </Button>
              </div>
            </TooltipTrigger>
            {disabled && disabledReason ? (
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{disabledReason}</p>
              </TooltipContent>
            ) : (
              <TooltipContent side="top">
                <p className="text-sm">{pageData.create_oc}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {(status === "loading" || isLoading || !user) &&
      status !== "unauthenticated" ? (
        <div className="flex items-center justify-center py-4">
          <div className="text-sm text-muted-foreground">
            {t("parameters.loading_characters")}
          </div>
        </div>
      ) : user && userCharacters.length > 0 ? (
        <div className={cn(
          "relative",
          disabled && disabledReason && "opacity-50 pointer-events-none"
        )}>
          {/* 左滚动按钮 */}
          {canScrollLeft && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
          )}

          {/* 右滚动按钮 */}
          {canScrollRight && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          )}

          {/* 角色列表 */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {userCharacters.map((character) => {
              const selectedArray = Array.isArray(value)
                ? value
                : value
                  ? [value]
                  : [];
              const isSelected = selectedArray.includes(character.uuid);
              const isMaxSelectionReached =
                multiSelect &&
                selectedArray.length >= maxSelection &&
                !isSelected;

              return (
                <div
                  key={character.uuid}
                  className={cn(
                    "flex-shrink-0 cursor-pointer transition-all duration-200",
                    "hover:scale-105 hover:shadow-md",
                    isSelected &&
                      "ring-2 ring-primary ring-offset-2 rounded-lg",
                    isMaxSelectionReached && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => handleCharacterSelect(character.uuid)}
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                    {character.hasAvatar && character.avatarUrl ? (
                      <Image
                        src={character.avatarUrl}
                        alt={character.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-xs font-medium text-center px-1">
                          {character.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}

                    {/* 选中状态指示器 */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                        <CheckIcon className="h-2 w-2" />
                      </div>
                    )}
                  </div>

                  {/* 角色名称 */}
                  <div className="mt-1 text-xs text-center font-medium line-clamp-1 max-w-16">
                    {character.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
