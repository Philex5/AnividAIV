"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { getCreamyCharacterUrl, getMemberBadgeUrl } from "@/lib/asset-loader";
import { cn } from "@/lib/utils";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

interface UserInfoCardProps {
  user: {
    uuid: string;
    display_name?: string | null;
    email: string;
    avatar_url?: string | null;
    is_sub: boolean;
    sub_expired_at?: Date | null;
    sub_plan_type?: string | null;
  };
  creditBalance: number;
}

export default function UserInfoCard({
  user,
  creditBalance,
}: UserInfoCardProps) {
  const getInitials = (email: string, displayName?: string | null) => {
    const name = displayName || email;
    return name.slice(0, 2).toUpperCase();
  };

  const isSub =
    user.is_sub &&
    user.sub_expired_at &&
    new Date(user.sub_expired_at) > new Date();

  // Get membership level based on sub_plan_type
  const getMembershipLevel = () => {
    // If user is pro and has a plan type, use it
    if (isSub && user.sub_plan_type && user.sub_plan_type.trim()) {
      return user.sub_plan_type.trim();
    }
    // Otherwise, use 'free' or 'pro' based on is_sub status
    return isSub ? 'pro' : 'free';
  };

  const membershipLevel = getMembershipLevel();

  // Get membership display name
  const getMembershipDisplayName = () => {
    const level = membershipLevel;
    // Map membership level to display name
    const levelMap: Record<string, string> = {
      free: 'Free Member',
      pro: 'Pro Member',
      basic: 'Basic Member',
      plus: 'Plus Member',
      premium: 'Premium Member',
      vip: 'VIP Member',
      enterprise: 'Enterprise Member',
    };

    const displayName = levelMap[level] || level;
    return `AnividAI ${displayName}`;
  };

  const membershipDisplayName = getMembershipDisplayName();

  // Validate avatar URL - check for both null and empty string
  const { displayUrl: userAvatarUrl } = useResolvedImageUrl(user.avatar_url);
  const hasValidAvatar = Boolean(userAvatarUrl);
  const userInitials = getInitials(user.email, user.display_name);

  return (
    <Card radius="xl" className="bg-background/40 backdrop-blur-xl border-primary/20 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -ml-12 -mb-12 blur-2xl pointer-events-none" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center space-x-5 flex-1">
            {/* 用户头像 */}
            <div className="relative group">
              {isSub && (
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-primary/10 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
              )}
              <Avatar className={cn(
                "h-20 w-20 ring-4 ring-background shadow-lg transition-transform duration-300 group-hover:scale-105",
                isSub ? "ring-primary/20" : "ring-muted"
              )}>
                {hasValidAvatar ? (
                  <AvatarImage
                    src={userAvatarUrl}
                    alt={user.display_name || user.email}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-primary/5 text-primary font-bold text-3xl">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* 用户基本信息 */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold tracking-tight text-foreground truncate">
                  {user.display_name || user.email.split("@")[0]}
                </h2>

                {/* 会员等级标识 */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer flex-shrink-0 transition-transform hover:scale-110 active:scale-95">
                        <Image
                          src={getMemberBadgeUrl(`${membershipLevel}_member`)}
                          alt={`${membershipLevel} Member`}
                          width={32}
                          height={32}
                          className="rounded-full shadow-sm border border-primary/10 bg-background/50"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-background/90 backdrop-blur-md border-primary/20">
                      <p className="font-medium text-primary">{membershipDisplayName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <p className="text-sm text-muted-foreground font-medium opacity-80 truncate">{user.email}</p>
            </div>
          </div>

          {/* 积分信息 */}
          <div className="flex-shrink-0">
            <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background/70 to-primary/5 p-4 sm:px-6 shadow-sm backdrop-blur-sm transition-all hover:from-primary/15 hover:to-primary/10">
              <div className="pointer-events-none absolute -right-5 -top-6 h-16 w-16 rounded-full bg-primary/20 blur-2xl" />

              <div className="flex items-end gap-2">
                <div className="flex items-end gap-1.5">
                  <p className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-2xl font-black leading-none tracking-tight text-transparent tabular-nums sm:text-3xl">
                    {creditBalance.toLocaleString()}
                  </p>
                  <Image
                    src={getCreamyCharacterUrl("meow_coin")}
                    alt="MC"
                    width={24}
                    height={24}
                    className="h-6 w-6 self-end object-contain"
                  />
                </div>
                <span className="pb-0.5 text-sm font-semibold leading-none text-muted-foreground">(MC)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
