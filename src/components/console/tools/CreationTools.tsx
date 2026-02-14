import { Link } from "@/i18n/navigation";
import ocAppsConfig from "@/configs/apps/oc-apps.json";
import { getToolIconUrl } from "@/lib/asset-loader";

type OcApp = {
  slug: string;
  kind: "image" | "text" | "video";
  name: string;
};

const toText = (value: unknown): string =>
  typeof value === "string" ? value : "";

export default function CreationTools({
  locale,
  tools,
}: {
  locale: string;
  tools: any;
}) {
  const apps: OcApp[] = Array.isArray(ocAppsConfig?.apps)
    ? ocAppsConfig.apps.map((a: any) => ({
        slug: a.slug,
        kind: a.kind,
        name: a.name,
      }))
    : [];

  const sectionTitle = toText(tools?.title);
  const animeTitle = toText(tools?.anime?.title);
  const animeDesc = toText(tools?.anime?.desc);
  const videoTitle = toText(tools?.video?.title);
  const videoDesc = toText(tools?.video?.desc);

  const storySource = tools?.storyCreator || {};
  const chatsSource = tools?.chats || {};
  const storyTitle = toText(storySource?.title) || toText(chatsSource?.title);
  const storyDesc =
    toText(storySource?.desc) ||
    toText(chatsSource?.soon) ||
    toText(chatsSource?.desc);
  const storyStatus = toText(storySource?.status);
  const storyTitleAll = (() => {
    return `${storyTitle} (${storyStatus})`;
  })();

  const appsTitle = toText(tools?.apps?.title);
  const appsEmpty = toText(tools?.apps?.empty);
  const appsComingSoonTitle = toText(tools?.apps?.comingSoon?.title);
  const appsComingSoonDesc = toText(tools?.apps?.comingSoon?.desc);
  const hasComingSoonContent = Boolean(
    appsComingSoonTitle || appsComingSoonDesc,
  );

  return (
    <div className="mt-0">
      <h2
        id="home-creation-tools"
        className="text-2xl font-semibold text-foreground mb-4"
      >
        {sectionTitle}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Base tools */}
        <Link
          href={{ pathname: "/ai-anime-generator" }}
          className="block rounded-lg border p-4 hover:shadow-sm bg-card cursor-pointer"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-base font-medium text-foreground">
                {animeTitle}
              </div>
              <div className="text-sm text-muted-foreground">{animeDesc}</div>
            </div>
            <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getToolIconUrl("anime_generator")}
                alt=""
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </Link>

        <Link
          href={{ pathname: "/ai-anime-video-generator" }}
          className="block rounded-lg border p-4 hover:shadow-sm bg-card cursor-pointer"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-base font-medium text-foreground">
                {videoTitle}
              </div>
              <div className="text-sm text-muted-foreground">{videoDesc}</div>
            </div>
            <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getToolIconUrl("video_generator")}
                alt=""
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </Link>

        <div
          className="block rounded-lg border p-4 bg-muted/40 text-muted-foreground cursor-not-allowed"
          aria-disabled="true"
        >
          <div className="flex items-center justify-between gap-4 opacity-90">
            <div className="flex-1">
              <div className="text-base font-medium text-muted-foreground">
                {storyTitleAll}
              </div>
              <div className="text-sm text-muted-foreground">{storyDesc}</div>
            </div>
            <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 opacity-60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getToolIconUrl("story_creator")}
                alt=""
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Studo Tools */}
        <div className="text-2xl font-semibold text-foreground col-span-full mt-2 ">
          {appsTitle}
        </div>

        {apps.length === 0 ? (
          <div className="text-sm text-muted-foreground">{appsEmpty}</div>
        ) : (
          <>
            {apps.slice(0, 6).map((app) => {
              const keyBase = tools?.apps?.list?.[app.name];
              const title = toText(keyBase?.title) || app.name;
              const desc = toText(keyBase?.desc);

              // 暂无独立路由，先跳至 OC Maker 以便测试
              const href = { pathname: `${app.slug}` } as const;

              return (
                <Link
                  key={app.name}
                  href={href}
                  className="block rounded-lg border p-4 hover:shadow-sm bg-card cursor-pointer"
                >
                  <div className="text-base font-medium text-foreground">
                    {title}
                  </div>
                  <div className="text-sm text-muted-foreground">{desc}</div>
                </Link>
              );
            })}

            {hasComingSoonContent ? (
              <div
                className="rounded-lg border border-dashed p-4 bg-muted/40 text-muted-foreground cursor-default flex flex-col gap-2"
                aria-disabled="true"
              >
                {appsComingSoonTitle ? (
                  <div className="text-base font-medium text-muted-foreground">
                    {appsComingSoonTitle}
                  </div>
                ) : null}
                {appsComingSoonDesc ? (
                  <div className="text-sm text-muted-foreground">
                    {appsComingSoonDesc}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
