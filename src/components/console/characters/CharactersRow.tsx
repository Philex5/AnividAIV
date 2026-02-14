"use client";
import Link from "next/link";
import { getCreamyCharacterUrl, getMemberBadgeUrl, getModelIconUrl } from "@/lib/asset-loader";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type CharacterAvatar = {
  uuid: string;
  name: string;
  avatarUrl: string | null;
  hasAvatar: boolean;
};

export default function CharactersRow({
  locale,
  data,
  labels,
  chat_label,
}: {
  locale: string;
  data: CharacterAvatar[];
  labels: {
    title: string;
    empty: string;
    create: string;
    all_ocs: string;
  };
  chat_label: string;
}) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div>
      <div className="flex items-center justify-end mb-3 w-full">
        <Link
          href={`/${locale}/my-creations`}
          className="text-primary hover:underline text-sm inline-flex items-center cursor-pointer"
        >
          {/* Reuse section title as link label for simplicity */}
          {labels.all_ocs} <ArrowRight className="ml-1 w-4 h-4" />
        </Link>
      </div>

      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Create new */}
          <Link
            href={`/${locale}/oc-maker`}
            className="flex-none w-24 h-24 rounded-lg border border-dashed grid place-items-center text-muted-foreground hover:text-foreground hover:border-foreground/30 cursor-pointer"
            aria-label={labels.create}
          >
            <span className="text-2xl">＋</span>
          </Link>

          {/* Existing characters */}
          {hasData ? (
            data.map((c) => (
              <Link
                key={c.uuid}
                href={`/${locale}/characters/${c.uuid}`}
                className="flex-none w-24 cursor-pointer"
                aria-label={c.name}
              >
                <div className="w-24 h-24 rounded-lg overflow-hidden border bg-card">
                  {c.hasAvatar && c.avatarUrl ? (
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">
                      {c.name?.[0] || "?"}
                    </div>
                  )}
                </div>
                <div
                  className="mt-1 text-xs text-foreground line-clamp-1 text-center"
                  title={c.name}
                >
                  {c.name}
                </div>
              </Link>
            ))
          ) : (
            <div className="flex items-center text-sm text-muted-foreground">
              {labels.empty}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
