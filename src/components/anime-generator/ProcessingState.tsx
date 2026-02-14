"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2Icon,
  ClockIcon,
  XIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

interface ProcessingTask {
  generation_uuid: string;
  task_uuid: string;
  status: string;
  task_status?: string;
  queueStatus?: string;
  queuePosition?: number;
  totalInQueue?: number;
  estimatedWaitSeconds?: number;
  suggestedPollInterval?: number;
  isVip?: boolean;
  membershipTier?: 'free' | 'basic' | 'plus' | 'pro';
  created_at: string;
  batch_size: number;
  credits_used: number;
  message?: string;
}

interface ProcessingStateProps {
  task: ProcessingTask;
  onCancel?: (generationUuid: string) => void;
  onRetry?: (generationUuid: string) => void;
  onComplete?: (generationUuid: string) => void;
  className?: string;
  pageData: AnimeGeneratorPage;
}

export function ProcessingState({
  task,
  onCancel,
  onRetry,
  onComplete,
  className = "",
  pageData
}: ProcessingStateProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedProgress, setEstimatedProgress] = useState(0);

  // 计算处理时间
  useEffect(() => {
    const startTime = new Date(task.created_at).getTime();
    
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeElapsed(elapsed);
      
      // 估算进度（基于时间的粗略估算）
      if (task.status === "processing") {
        // 假设单张图30秒，批量图按比例计算
        const expectedDuration = task.batch_size * 30;
        const progress = Math.min((elapsed / expectedDuration) * 100, 95);
        setEstimatedProgress(progress);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [task.created_at, task.batch_size, task.status]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取状态显示信息
  const getStatusInfo = () => {
    // Check queue status first
    if (task.queueStatus === "queued") {
      return {
        icon: <ClockIcon className="w-5 h-5 text-amber-500" />,
        title: "In Queue",
        description: `Position ${task.queuePosition || 'N/A'} of ${task.totalInQueue || 'N/A'}`,
        color: "amber",
        showProgress: false,
        showCancel: true,
        showQueueInfo: true
      };
    }

    if (task.queueStatus === "dispatching") {
      return {
        icon: <Loader2Icon className="w-5 h-5 text-blue-500 animate-spin" />,
        title: "Dispatching",
        description: "Task is being sent to provider",
        color: "blue",
        showProgress: false,
        showCancel: true,
        showQueueInfo: true
      };
    }

    switch (task.status) {
      case "pending":
        return {
          icon: <ClockIcon className="w-5 h-5 text-amber-500" />,
          title: pageData.processing_state?.pending?.title || "Pending",
          description: pageData.processing_state?.pending?.description || "Waiting in queue",
          color: "amber",
          showProgress: false,
          showCancel: true
        };
      case "processing":
        return {
          icon: <Loader2Icon className="w-5 h-5 text-blue-500 animate-spin" />,
          title: pageData.processing_state?.processing?.title || "Processing",
          description: pageData.processing_state?.processing?.description || "Generating your images",
          color: "blue",
          showProgress: true,
          showCancel: true
        };
      case "completed":
        return {
          icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
          title: pageData.processing_state?.completed?.title || "Completed",
          description: pageData.processing_state?.completed?.description || "Images generated successfully",
          color: "green",
          showProgress: false,
          showCancel: false
        };
      case "failed":
        return {
          icon: <AlertCircleIcon className="w-5 h-5 text-red-500" />,
          title: pageData.processing_state?.failed?.title || "Failed",
          description: pageData.processing_state?.failed?.description || "Generation failed",
          color: "red",
          showProgress: false,
          showCancel: false
        };
      case "canceled":
        return {
          icon: <XIcon className="w-5 h-5 text-gray-500" />,
          title: pageData.processing_state?.canceled?.title || "Canceled",
          description: pageData.processing_state?.canceled?.description || "Generation was canceled",
          color: "gray",
          showProgress: false,
          showCancel: false
        };
      default:
        return {
          icon: <AlertCircleIcon className="w-5 h-5 text-gray-500" />,
          title: pageData.processing_state?.unknown?.title || "Unknown",
          description: pageData.processing_state?.unknown?.description || "Unknown status",
          color: "gray",
          showProgress: false,
          showCancel: false
        };
    }
  };

  const statusInfo = getStatusInfo();

  const handleCancel = () => {
    if (onCancel && (task.status === "pending" || task.status === "processing")) {
      onCancel(task.generation_uuid);
    }
  };

  const handleRetry = () => {
    if (onRetry && task.status === "failed") {
      onRetry(task.generation_uuid);
    }
  };

  const handleComplete = () => {
    if (onComplete && task.status === "completed") {
      onComplete(task.generation_uuid);
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* 状态图标 */}
          <div className="flex-shrink-0 mt-1">
            {statusInfo.icon}
          </div>

          {/* 主要内容 */}
          <div className="flex-1 space-y-4">
            {/* 标题和状态 */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-lg">{statusInfo.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {task.message || statusInfo.description}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={statusInfo.color === "blue" ? "default" : "secondary"}
                  className={cn(
                    statusInfo.color === "green" && "bg-green-100 text-green-800",
                    statusInfo.color === "red" && "bg-red-100 text-red-800",
                    statusInfo.color === "amber" && "bg-amber-100 text-amber-800",
                    statusInfo.color === "gray" && "bg-gray-100 text-gray-800"
                  )}
                >
                  {task.status}
                </Badge>
              </div>
            </div>

            {/* 进度条 */}
            {statusInfo.showProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {pageData.processing_state?.progress || "Progress"}
                  </span>
                  <span className="font-medium">{Math.round(estimatedProgress)}%</span>
                </div>
                <Progress value={estimatedProgress} className="w-full" />
              </div>
            )}

            {/* 队列信息 */}
            {statusInfo.showQueueInfo && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md space-y-3">
                {/* VIP优先级标识 */}
                {task.isVip && (
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                      {task.membershipTier?.toUpperCase() || 'VIP'} Priority
                    </Badge>
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      Faster processing for premium users
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">
                    Queue Position
                  </span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                    {task.queuePosition ? `#${task.queuePosition}` : 'N/A'} / {task.totalInQueue || 'N/A'}
                  </Badge>
                </div>
                {task.estimatedWaitSeconds && task.estimatedWaitSeconds > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-700 dark:text-amber-300">
                      Estimated Wait
                    </span>
                    <span className="font-medium text-amber-800 dark:text-amber-200">
                      {formatTime(task.estimatedWaitSeconds)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 详细信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{pageData.processing_state?.batch_size || "Batch Size"}</span>
                <span className="ml-2 font-medium">{task.batch_size} {pageData.images || "images"}</span>
              </div>
              <div>
                <span className="text-gray-500">{pageData.processing_state?.credits_used || "Credits Used"}</span>
                <span className="ml-2 font-medium">{task.credits_used} {pageData.credits || "credits"}</span>
              </div>
              <div>
                <span className="text-gray-500">{pageData.processing_state?.time_elapsed || "Time Elapsed"}</span>
                <span className="ml-2 font-medium">{formatTime(timeElapsed)}</span>
              </div>
              {task.status === "processing" && (
                <div>
                  <span className="text-gray-500">{pageData.processing_state?.estimated_remaining || "Estimated Remaining"}</span>
                  <span className="ml-2 font-medium">
                    {Math.max(0, task.batch_size * 30 - timeElapsed) > 0
                      ? formatTime(Math.max(0, task.batch_size * 30 - timeElapsed))
                      : pageData.processing_state?.coming_soon || "Coming soon"
                    }
                  </span>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-3 pt-2">
              {statusInfo.showCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center space-x-1"
                >
                  <XIcon className="w-4 h-4" />
                  <span>{pageData.processing_state?.cancel || "Cancel"}</span>
                </Button>
              )}

              {task.status === "failed" && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="flex items-center space-x-1"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                  <span>{pageData.processing_state?.retry || "Retry"}</span>
                </Button>
              )}

              {task.status === "completed" && onComplete && (
                <Button
                  size="sm"
                  onClick={handleComplete}
                  className="flex items-center space-x-1"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>{pageData.processing_state?.view_results || "View Results"}</span>
                </Button>
              )}
            </div>

            {/* 提示信息 */}
            {task.status === "processing" && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 {pageData.processing_state?.processing_tip || "Please wait while we generate your images"}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}