"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AdminTopOcItem } from "@/components/admin/chats/types";

function getInitial(name: string): string {
  const text = (name || "").trim();
  return text ? text.slice(0, 1).toUpperCase() : "O";
}

export default function TopOcCards({
  items,
  t,
}: {
  items: AdminTopOcItem[];
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t("top_oc.title")}</h2>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {items.map((item, index) => (
          <Card key={item.characterId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/60">
                    {item.avatarUrl ? <AvatarImage src={item.avatarUrl} alt={item.characterName} /> : null}
                    <AvatarFallback>{getInitial(item.characterName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base leading-none">{item.characterName}</CardTitle>
                    <CardDescription className="mt-1">{item.characterId}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline">#{index + 1}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground">
                {t("top_oc.sessions", { count: item.sessionCount })}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {t("top_oc.users", { count: item.userCount })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("top_oc.empty")}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

