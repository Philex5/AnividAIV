"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { 
  CalendarCheck, Gift, Trophy, Loader2, Zap, Check, CheckCircle2, 
  Star, Flame, Award, Coins, ChevronRight, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/contexts/app";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

interface CheckInStatus {
  isTodayCheckedIn: boolean;
  streakCount: number;
  nextReward: number;
}

export default function CheckInButton() {
  const t = useTranslations("incentive");
  const tUser = useTranslations("user");
  const { user, refreshCredits, setShowSignModal } = useAppContext();
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchStatus = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/incentive/status");
      const data = await res.json();
      if (data.code === 0) {
        setStatus(data.data.checkIn);
      }
    } catch (error) {
      console.error("Fetch check-in status failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
  }, [user]);

  const handleCheckIn = async () => {
    if (!user) {
      setShowSignModal(true);
      return;
    }
    if (isCheckingIn || status?.isTodayCheckedIn) return;

    setIsCheckingIn(true);
    try {
      const res = await fetch("/api/incentive/check-in", { method: "POST" });
      const data = await res.json();
      if (data.code === 0) {
        const { reward, streakCount } = data.data;
        setStatus({
          isTodayCheckedIn: true,
          streakCount,
          nextReward: 0,
        });
        
        // Premium confetti effect
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 9999,
        };

        function fire(particleRatio: number, opts: any) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
        
        toast.success(t("check_in_success", { amount: reward }));
        refreshCredits();
        fetchStatus();
      } else {
        toast.error(data.message || t("check_in_failed"));
      }
    } catch (error) {
      toast.error(t("check_in_failed"));
    } finally {
      setIsCheckingIn(false);
    }
  };

  const isGuest = !user;
  const currentDayInCycle = status ? (status.isTodayCheckedIn ? status.streakCount : status.streakCount + 1) : 1;
  const cycleDay = ((currentDayInCycle - 1) % 30) + 1;
  const progressValue = (cycleDay / 30) * 100;
  
  const milestones = [
    { day: 5, reward: 20, icon: Gift },
    { day: 10, reward: 30, icon: Award },
    { day: 30, reward: 70, icon: Trophy, isBig: true }
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            if (isGuest) {
              e.preventDefault();
              setShowSignModal(true);
            }
          }}
          className={cn(
            "h-8 px-2.5 flex items-center gap-1.5 rounded-full transition-all duration-500 border relative group overflow-hidden",
            status?.isTodayCheckedIn 
              ? "text-muted-foreground bg-secondary/10 border-secondary/20" 
              : isGuest
                ? "text-primary/70 border-primary/10 hover:bg-primary/5"
                : "text-white border-transparent bg-gradient-to-r from-[#c07895] to-[#ff9500] shadow-md shadow-primary/10 hover:shadow-primary/30 hover:scale-105 active:scale-95"
          )}
        >
          {/* Animated Background Pulse for unchecked */}
          {!isGuest && !status?.isTodayCheckedIn && (
            <span className="absolute inset-0 rounded-full bg-white/20 animate-pulse group-hover:animate-none" />
          )}

          <div className="relative flex items-center justify-center z-10">
            {status?.isTodayCheckedIn ? (
              <CalendarCheck className="h-4 w-4" />
            ) : (
              <motion.div
                animate={!isGuest ? { 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1]
                } : {}}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
              >
                <Gift className={cn("h-4 w-4", isGuest ? 'opacity-50' : 'fill-white/20')} />
              </motion.div>
            )}
          </div>
          
          <span className="hidden md:inline text-[11px] font-black uppercase tracking-tight z-10">
            {status?.isTodayCheckedIn ? t("checked_in") : t("check_in")}
          </span>

          {status && status.streakCount > 0 && (
            <div className={cn(
              "flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-black z-10 h-5",
              status.isTodayCheckedIn ? "bg-muted/50 text-muted-foreground" : "bg-black/20 text-white"
            )}>
              <Flame className={cn("h-2.5 w-2.5", !status.isTodayCheckedIn && "text-orange-400 fill-orange-400")} />
              {status.streakCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      
      {!isGuest && (
        <PopoverContent 
          className="w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px] glass-panel" 
          align="end"
          sideOffset={8}
        >
          <div className="relative">
            {/* Header with Pattern Background */}
            <div className="bg-[#1a1a2e] text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl -ml-12 -mb-12" />
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-[var(--color-golden-yellow)] fill-[var(--color-golden-yellow)]/20 animate-bounce" />
                    <h4 className="font-anime font-black text-3xl tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-warm-orange)] to-[var(--color-golden-yellow)]">
                      {t("daily_check_in")}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <div className="flex -space-x-1">
                      {[...Array(3)].map((_, i) => (
                        <Flame key={i} className={cn("h-4 w-4 text-[var(--color-vibrant-orange)] fill-[var(--color-vibrant-orange)]", i === 1 && "animate-pulse")} />
                      ))}
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest ml-1">
                      {t("streak", { count: status?.streakCount || 0 })}
                    </span>
                  </div>
                </div>
                
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-inner shadow-white/10 overflow-hidden p-2">
                  <Image
                    src={getCreamyCharacterUrl("meow_coin")}
                    alt="MC"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain animate-pulse"
                  />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="bg-background/95 p-6 space-y-6">
              {/* 7 Days Grid */}
              <div className="grid grid-cols-7 gap-2">
                {[...Array(7)].map((_, i) => {
                  const dayNum = Math.max(1, (cycleDay > 0 ? Math.floor((cycleDay - 1) / 7) * 7 : 0) + i + 1);
                  const isPast = dayNum < cycleDay;
                  const isCurrent = dayNum === cycleDay;
                  const isChecked = isPast || (isCurrent && status?.isTodayCheckedIn);
                  const isFuture = !isChecked && !isCurrent;
                  
                  return (
                    <motion.div 
                      key={i} 
                      whileHover={isFuture ? { y: -2 } : {}}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className={cn(
                        "w-full aspect-[4/5] rounded-xl flex flex-col items-center justify-center relative transition-all duration-500 border-2 overflow-hidden group/day",
                        isChecked 
                          ? "bg-[var(--color-warm-orange)]/10 border-[var(--color-warm-orange)] shadow-[inset_0_0_12px_rgba(var(--color-warm-orange),0.2)]" 
                          : isCurrent && !status?.isTodayCheckedIn
                            ? "bg-background border-[var(--color-warm-orange)] border-dashed animate-pulse ring-4 ring-[var(--color-warm-orange)]/10"
                            : "bg-muted/20 border-transparent hover:bg-muted/40"
                      )}>
                        {isChecked ? (
                          <>
                            <motion.div 
                              initial={{ scale: 2, opacity: 0, rotate: -20 }}
                              animate={{ scale: 1, opacity: 1, rotate: -12 }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                              <div className="border-2 border-[var(--color-mascot-pink)]/40 text-[var(--color-mascot-pink)]/40 text-[8px] font-black px-1 py-0.5 rounded rotate-[-12deg] uppercase tracking-tighter">
                                Claimed
                              </div>
                            </motion.div>
                            <Star className="h-5 w-5 text-[var(--color-warm-orange)] fill-[var(--color-warm-orange)] mb-1 drop-shadow-[0_0_8px_rgba(var(--color-warm-orange),0.5)]" />
                          </>
                        ) : (
                          <span className={cn(
                            "text-sm font-black transition-colors duration-300",
                            isCurrent ? "text-[var(--color-warm-orange)]" : "text-muted-foreground/40 group-hover/day:text-muted-foreground"
                          )}>
                            {dayNum}
                          </span>
                        )}
                        
                        {isCurrent && !status?.isTodayCheckedIn && (
                          <div className="absolute bottom-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-warm-orange)] animate-ping" />
                          </div>
                        )}

                        {/* Glossy Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
                      </div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                        D{dayNum}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress & Milestones */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Monthly Goals</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-black">{cycleDay}/30</Badge>
                  </div>
                  <span className="text-[11px] font-black text-[var(--color-warm-orange)] uppercase">{Math.round(progressValue)}%</span>
                </div>
                
                <div className="relative pt-2 pb-20 mx-3">
                  <div className="h-3 w-full bg-muted/30 rounded-full overflow-hidden relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressValue}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[var(--color-warm-orange)] to-[var(--color-mascot-pink)] relative"
                    >
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    </motion.div>
                  </div>
                  
                  {/* Milestone Markers */}
                  {milestones.map((m) => {
                    const MilestoneIcon = m.icon;
                    const isReached = cycleDay >= m.day;
                    const pos = (m.day / 30) * 100;
                    
                    return (
                      <div 
                        key={m.day}
                        className="absolute top-0 flex flex-col items-center -translate-x-1/2 group"
                        style={{ left: `${pos}%` }}
                      >
                        <motion.div 
                          animate={isReached ? { y: [0, -2, 0] } : {}}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className={cn(
                            "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-500 z-10 shadow-lg",
                            isReached 
                              ? "bg-gradient-to-br from-[var(--color-golden-yellow)] to-[var(--color-warm-orange)] border-[var(--color-premium-gold)] text-white shadow-primary/40 scale-110" 
                              : "bg-muted/80 border-muted text-muted-foreground/50 backdrop-blur-sm"
                          )}
                        >
                          {isReached ? <CheckCircle2 className="h-5 w-5 stroke-[3]" /> : <MilestoneIcon className="h-4 w-4" />}
                        </motion.div>
                        
                        <div className="mt-10 flex flex-col items-center gap-0.5 pointer-events-none">
                          <span className={cn(
                            "text-[10px] font-black leading-none uppercase tracking-tighter whitespace-nowrap",
                            isReached ? "text-[var(--color-vibrant-orange)]" : "text-muted-foreground/60"
                          )}>
                            Day {m.day}
                          </span>
                          <Badge 
                            variant={isReached ? "default" : "outline"} 
                            className={cn(
                              "text-[9px] h-3.5 px-1 font-black transition-all duration-300",
                              isReached ? "bg-[var(--color-warm-orange)] hover:bg-[var(--color-warm-orange)] border-none" : "opacity-40"
                            )}
                          >
                            <span className="flex items-center gap-0.5">
                              <Image
                                src={getCreamyCharacterUrl("meow_coin")}
                                alt={tUser("credits")}
                                width={10}
                                height={10}
                                className="h-2.5 w-2.5"
                              />
                              +{m.reward}
                            </span>
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button 
                  className={cn(
                    "w-full h-14 rounded-2xl shadow-xl transition-all duration-300 group overflow-hidden relative border-none",
                    status?.isTodayCheckedIn 
                      ? "bg-secondary/20 text-secondary-foreground" 
                      : "bg-gradient-to-r from-[var(--color-mascot-pink)] to-[var(--color-warm-orange)] text-white hover:scale-[1.02] active:scale-[0.98] shadow-primary/20"
                  )}
                  disabled={status?.isTodayCheckedIn || isCheckingIn || isLoading}
                  onClick={handleCheckIn}
                >
                  <AnimatePresence mode="wait">
                    {isCheckingIn ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </motion.div>
                    ) : status?.isTodayCheckedIn ? (
                      <motion.div
                        key="checked"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-black text-base">{t("already_checked_in")}</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="claim"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Zap className="h-5 w-5 fill-current animate-pulse" />
                        <span className="font-black text-lg tracking-tight">{t("claim_reward")}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
                
                <p className="text-[12px] text-muted-foreground text-center mt-4 font-bold flex items-center justify-center gap-1.5 uppercase tracking-tighter">
                  {status?.isTodayCheckedIn ? (
                    <>
                      <CalendarCheck className="h-3.5 w-3.5" />
                      {t("come_back_tomorrow")}
                    </>
                  ) : (
                    <>
                      <Gift className="h-3.5 w-3.5 text-[var(--color-warm-orange)]" />
                      {t("check_in_tip", { amount: status?.nextReward || 10 })}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
