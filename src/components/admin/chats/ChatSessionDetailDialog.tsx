"use client";

import moment from "moment";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import AdminCharacterAvatar from "@/components/admin/chats/AdminCharacterAvatar";
import { AdminChatSessionDetail } from "@/components/admin/chats/types";

function getRoleVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "assistant") {
    return "default";
  }
  if (role === "user") {
    return "secondary";
  }
  return "outline";
}

export default function ChatSessionDetailDialog({
  open,
  onOpenChange,
  data,
  loading,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AdminChatSessionDetail | null;
  loading: boolean;
  t: (key: string) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[92vw]">
        <DialogHeader>
          <DialogTitle>{t("session_detail.title")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t("session_detail.loading")}
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <AdminUserAvatar
                  avatarUrl={data.session.userAvatarUrl}
                  name={data.session.userName}
                  email={null}
                  className="h-8 w-8 border border-border/60"
                  fallbackClassName="text-[10px]"
                />
                <div className="text-sm">
                  <div className="font-medium">{data.session.userName}</div>
                  <div className="text-xs text-muted-foreground">{data.session.userId}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AdminCharacterAvatar
                  avatarUrl={data.session.characterAvatarUrl}
                  name={data.session.characterName}
                  className="h-8 w-8 border border-border/60"
                  fallbackClassName="text-[10px]"
                />
                <div className="text-sm">
                  <div className="font-medium">{data.session.characterName}</div>
                  <div className="text-xs text-muted-foreground">{data.session.characterId}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground ml-auto">
                {t("session_detail.message_count")}: {data.session.messageCount}
              </div>
            </div>

            <ScrollArea className="h-[60vh] rounded-lg border">
              <div className="p-4 space-y-3">
                {data.messages.map((message) => (
                  <div key={message.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleVariant(message.role)}>{message.role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          #{message.messageIndex}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {message.createdAt
                          ? moment(message.createdAt).format("YYYY-MM-DD HH:mm:ss")
                          : "-"}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                ))}
                {data.messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-10 text-center">
                    {t("session_detail.empty")}
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t("session_detail.empty")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
