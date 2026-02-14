import React from "react";
import { notFound } from "next/navigation";
import { findCharacterByUuid } from "@/models/character";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { parseCharacterModules } from "@/types/oc";
import { toImageUrl } from "@/lib/r2-utils";
import { OGCardTemplate } from "@/components/og/OGCardTemplates";
import { findworldByUuid } from "@/models/oc-world";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string }>;
}): Promise<Metadata> {
  const { uuid } = await params;
  return {
    title: `OG Preview - ${uuid}`,
  };
}

interface PageProps {
  params: Promise<{
    locale: string;
    uuid: string;
  }>;
}

export default async function OGPreviewDetailPage({
  params,
}: PageProps) {
  const { locale, uuid } = await params;

  // 加载国际化配置
  let t;
  try {
    const messages = await import(`@/i18n/pages/oc-share-card/${locale}.json`);
    t = messages.default || messages;
  } catch (e) {
    const messages = await import(`@/i18n/pages/oc-share-card/en.json`);
    t = messages.default || messages;
  }

  const character = await findCharacterByUuid(uuid);

  if (!character) {
    notFound();
  }

  const modules = parseCharacterModules(character.modules);

  // 获取世界信息 + 主题色
  // 优先级：角色模块自定义颜色 -> 世界观主色 -> 默认紫色
  let themeColor = modules.appearance?.theme_color || "#8b5cf6";
  const worldUuid = character.world_uuid || (character as any).worldUuid;
  let worldName: string | undefined;
  let world: any = null;

  if (worldUuid) {
    try {
      world = await findworldByUuid(worldUuid);
      if (world?.name) {
        worldName = world.name;
      }
    } catch (err) {
      console.error("Failed to fetch world info:", err);
    }
  }

  if (!modules.appearance?.theme_color && world?.theme_colors && typeof world.theme_colors === "object") {
    const colors = world.theme_colors as Record<string, string>;
    themeColor = colors.primary || Object.values(colors)[0] || themeColor;
  }

  // 获取角色图片 (挑选最佳清晰度用于 OG 展示)
  let profileImageUrl: string | undefined;
  const targetImageUuid = character.profile_generation_image_uuid || character.avatar_generation_image_uuid;

  if (targetImageUuid) {
    try {
      const imageObj = await findGenerationImageByUuid(targetImageUuid);
      if (imageObj) {
        const path = imageObj.thumbnail_detail || imageObj.image_url;
        profileImageUrl = toImageUrl(path);
      }
    } catch (err) {
      console.error("Failed to fetch target image for OG:", err);
    }
  }

  // 默认图片回退
  const logoUrl = "https://artworks.anividai.com/assets/logo.webp";
  const resolvedProfile = profileImageUrl || logoUrl;

  // 构建 API 生成图片的 URL
  const ogImageUrl = `/api/og/character/${uuid}?t=${Date.now()}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">OC Card Debugger</h1>
            <p className="text-zinc-400 mt-1">
              Character: <code className="text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">{character.name}</code>
              {worldName ? (
                <>
                  <span className="mx-2 text-zinc-700">|</span>
                  World: <span className="text-zinc-300 font-medium">{worldName}</span>
                </>
              ) : null}
              <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-white/5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColor }} />
                <code className="text-[10px] text-zinc-500 uppercase">{themeColor}</code>
              </span>
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-12">
          {/* 实时组件渲染预览 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h2 className="text-lg font-semibold">Live Component Render</h2>
              <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">Browser SVG/HTML</span>
            </div>
            
            <div className="flex justify-center bg-[#050505] rounded-3xl border border-white/5 overflow-hidden p-12 shadow-2xl">
              <div style={{ width: 1200, height: 630, position: 'relative', zoom: 0.65 }}>
                <OGCardTemplate
                  character={character}
                  modules={modules}
                  world={world}
                  avatarUrl={resolvedProfile}
                  profileImageUrl={resolvedProfile}
                  template="tcg"
                  themeColor={themeColor}
                  t={t}
                />
              </div>
            </div>
          </section>

          {/* 实际 API 图片预览 */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 className="text-lg font-semibold">API Generated Image</h2>
              <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">/api/og/character/[uuid]</span>
            </div>
            
            <div className="flex justify-center bg-[#050505] rounded-3xl border border-white/5 overflow-hidden p-12 shadow-2xl">
              <div className="relative group">
                <img 
                  src={ogImageUrl} 
                  alt="OG Card" 
                  className="rounded-lg shadow-2xl border border-white/10"
                  style={{ width: '780px', height: 'auto' }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <a 
                    href={ogImageUrl} 
                    target="_blank" 
                    className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
                  >
                    Open Original Image
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="pt-12 pb-24 border-t border-white/10 text-center text-zinc-500 text-sm">
          <p>
            Character ID: {uuid} • Theme color source:{" "}
            {modules.appearance?.theme_color
              ? "Character Module"
              : worldName
                ? `World (${worldName})`
                : "Default"}
          </p>
        </footer>
      </div>
    </div>
  );
}
