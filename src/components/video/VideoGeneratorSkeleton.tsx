export function VideoGeneratorSkeleton() {
  return (
    <div className="h-full w-full flex flex-col lg:flex-row lg:h-full">
      {/* 左侧面板骨架 */}
      <div className="w-full lg:w-96 xl:w-[28rem] 2xl:w-[32rem] lg:flex-shrink-0 p-3 lg:pr-2">
        <div className="glass-card flex flex-col lg:h-full rounded-xl overflow-hidden p-4 space-y-4">
          <div className="h-8 bg-muted/50 rounded-md animate-pulse" />
          <div className="h-32 bg-muted/50 rounded-md animate-pulse" />
          <div className="h-20 bg-muted/50 rounded-md animate-pulse" />
          <div className="h-24 bg-muted/50 rounded-md animate-pulse" />
          <div className="h-16 bg-muted/50 rounded-md animate-pulse" />
        </div>
      </div>

      {/* 右侧展示区骨架 */}
      <div className="flex-1 flex flex-col min-h-0 p-3">
        <div className="glass-card rounded-xl h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted/50 rounded-full animate-pulse mx-auto" />
            <div className="h-4 bg-muted/50 rounded-md w-48 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
