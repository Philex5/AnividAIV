"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye } from "lucide-react";

interface Source {
  url: string;
  quality?: string;
  poster?: string | null;
}

export function VideoPlayerCard({
  sources,
  className,
  onViewDetails,
}: {
  sources: Source[];
  className?: string;
  onViewDetails?: () => void;
}) {
  const [current, setCurrent] = useState<Source | null>(sources[0] || null);

  const onQualityChange = (q: string) => {
    const match = sources.find((s) => (s.quality || "").toLowerCase() === q.toLowerCase());
    setCurrent(match || sources[0] || null);
  };

  const onDownload = () => {
    if (!current) return;
    const a = document.createElement("a");
    a.href = current.url;
    a.download = "video.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!current) return null;

  const qualities = sources.map((s) => s.quality).filter(Boolean) as string[];

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="w-full aspect-video bg-black rounded-md overflow-hidden">
          <video
            key={current.url}
            controls
            className="w-full h-full"
            poster={current.poster || undefined}
            src={current.url}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          {qualities.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quality</span>
              <Select onValueChange={onQualityChange} value={(current.quality || qualities[0]).toString()}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qualities.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onViewDetails && (
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                <Eye className="w-4 h-4 mr-1" />
                Details
              </Button>
            )}
            <Button variant="outline" onClick={onDownload}>
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

