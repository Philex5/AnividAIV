"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";

import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import AdminCharacterAvatar from "@/components/admin/chats/AdminCharacterAvatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/ui/pagination";
import { AdminChatSessionItem } from "@/components/admin/chats/types";

function shortenSessionId(sessionId: string): string {
  if (!sessionId || sessionId.length <= 14) {
    return sessionId;
  }

  return `${sessionId.slice(0, 6)}...${sessionId.slice(-6)}`;
}

export default function ChatSessionsTable({
  items,
  total,
  page,
  limit,
  onPageChange,
  onView,
  t,
}: {
  items: AdminChatSessionItem[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onView: (sessionId: string) => void;
  t: (key: string) => string;
}) {
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    if (limit <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(total / limit));
  }, [limit, total]);

  const handleCopy = async (sessionId: string) => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedSessionId(sessionId);
      toast.success(t("table.copy_success"));
      setTimeout(() => setCopiedSessionId(null), 1500);
    } catch {
      toast.error(t("table.copy_failed"));
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t("table.title")}</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.session_id")}</TableHead>
              <TableHead>{t("table.user")}</TableHead>
              <TableHead>{t("table.character")}</TableHead>
              <TableHead>{t("table.message_count")}</TableHead>
              <TableHead>{t("table.created_at")}</TableHead>
              <TableHead>{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.sessionId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{shortenSessionId(item.sessionId)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(item.sessionId)}
                      >
                        {copiedSessionId === item.sessionId ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex">
                          <div className="cursor-help">
                            <AdminUserAvatar
                              avatarUrl={item.user.avatarUrl}
                              name={item.user.name}
                              email={null}
                              className="h-8 w-8 border border-border/60"
                              fallbackClassName="text-[10px]"
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div>{item.user.name}</div>
                          <div>{item.user.id}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex">
                          <div className="cursor-help">
                            <AdminCharacterAvatar
                              avatarUrl={item.character.avatarUrl}
                              name={item.character.name}
                              className="h-8 w-8 border border-border/60"
                              fallbackClassName="text-[10px]"
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div>{item.character.name}</div>
                          <div>{item.character.id}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  <TableCell>{item.messageCount}</TableCell>
                  <TableCell>
                    {item.createdAt ? moment(item.createdAt).format("YYYY-MM-DD HH:mm:ss") : "-"}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => onView(item.sessionId)}>
                      {t("table.view")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t("table.empty")}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
