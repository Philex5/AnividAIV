# Component: Share Card (分享卡片生成器)

**Related**: FEAT-OC-REBUILD | [feature-oc-rebuild.md](../features/feature-oc-rebuild.md)

## 概览

Share Card 组件负责生成精美的角色分享卡片图片，支持基于世界观的主题化模板、缓存优化及社交媒体分享。使用后端 Satori 渲染确保跨平台一致性。

## 组件路径

`src/components/character-detail/ShareCardDialog.tsx`

## 组件结构

### Dialog 展示
```
┌──────────────────────────────────────────────────┐
│ 分享您的角色                              [× 关闭] │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐  │
│ │ [生成的卡片图片预览]                       │  │
│ │                                             │  │
│ │  ┌───────────────────────────────────┐    │  │
│ │  │ [头像]                             │    │  │
│ │  │ 角色名称                           │    │  │
│ │  │ "打招呼语"                         │    │  │
│ │  │ [立绘]                             │    │  │
│ │  │ 世界观主题装饰元素                 │    │  │
│ │  │ #Tag1 #Tag2 #Tag3                 │    │  │
│ │  │ 品牌 Logo + anividai.com          │    │  │
│ │  └───────────────────────────────────┘    │  │
│ └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│ 模板选择:                                        │
│ ○ 赛博朋克风格 ● 奇幻风格 ○ 现代简约            │
├──────────────────────────────────────────────────┤
│ [📥 下载图片] [🔗 复制链接] [📱 分享到社交媒体]  │
└──────────────────────────────────────────────────┘
```

## Props API

```typescript
interface ShareCardDialogProps {
  character: Character;                      // 角色数据
  isOpen: boolean;                           // Dialog 是否打开
  onClose: () => void;                       // 关闭回调
  defaultTemplate?: 'cyberpunk' | 'fantasy' | 'modern' | 'auto'; // 默认模板
}
```

## 使用示例

```typescript
// 在 CharacterDetailPage 中使用
import { ShareCardDialog } from '@/components/character-detail/ShareCardDialog';

function CharacterDetailPage({ character }: { character: Character }) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsShareOpen(true)}>
        📤 分享
      </Button>

      <ShareCardDialog
        character={character}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </>
  );
}
```

## 内部实现

### 卡片生成流程

```typescript
// src/components/character-detail/ShareCardDialog.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function ShareCardDialog({ character, isOpen, onClose, defaultTemplate = 'auto' }: ShareCardDialogProps) {
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate);

  // 自动选择模板（基于世界观）
  const autoTemplate = useMemo(() => {
    if (!character.world_uuid) return 'modern';

    const world = getworldById(character.world_uuid);
    if (world?.slug === 'cyberpunk') return 'cyberpunk';
    if (world?.slug === 'fantasy') return 'fantasy';
    return 'modern';
  }, [character.world_uuid]);

  const template = selectedTemplate === 'auto' ? autoTemplate : selectedTemplate;

  // 生成分享卡片
  useEffect(() => {
    if (!isOpen) return;

    async function generateCard() {
      setIsGenerating(true);

      try {
        // 调用后端 API 生成卡片
        const response = await fetch(`/api/og/character/${character.uuid}`, {
          method: 'POST',
          body: JSON.stringify({ template })
        });

        const data = await response.json();
        setCardImageUrl(data.image_url);
      } catch (error) {
        console.error('Generate card failed:', error);
        toast.error('生成失败，请重试');
      } finally {
        setIsGenerating(false);
      }
    }

    generateCard();
  }, [isOpen, character.uuid, template]);

  // 下载图片
  const handleDownload = async () => {
    if (!cardImageUrl) return;

    const link = document.createElement('a');
    link.href = cardImageUrl;
    link.download = `${character.name}-share-card.png`;
    link.click();
  };

  // 复制链接
  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/characters/${character.uuid}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('URL is copyed!');
  };

  // 分享到社交媒体
  const handleShare = async (platform: 'twitter' | 'facebook' | 'reddit') => {
    const shareUrl = `${window.location.origin}/characters/${character.uuid}`;
    const text = `Check out my character ${character.name} on AnividAI!`;

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`
    };

    window.open(urls[platform], '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <h2>分享您的角色</h2>

        {/* 卡片预览 */}
        <div className="aspect-[1200/630] bg-muted rounded-lg overflow-hidden">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <Spinner /> 生成中...
            </div>
          ) : cardImageUrl ? (
            <img src={cardImageUrl} alt={`${character.name} share card`} />
          ) : (
            <div className="flex items-center justify-center h-full">
              预览加载失败
            </div>
          )}
        </div>

        {/* 模板选择 */}
        <div className="flex gap-2">
          <span className="text-sm">模板:</span>
          {['cyberpunk', 'fantasy', 'modern', 'auto'].map(tmpl => (
            <Button
              key={tmpl}
              variant={template === tmpl ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTemplate(tmpl as any)}
            >
              {tmpl === 'auto' ? '自动' : tmpl}
            </Button>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button onClick={handleDownload} disabled={!cardImageUrl}>
            📥 下载图片
          </Button>
          <Button onClick={handleCopyLink} variant="outline">
            🔗 复制链接
          </Button>
          <Button onClick={() => handleShare('twitter')} variant="outline">
            🐦 Twitter
          </Button>
          <Button onClick={() => handleShare('facebook')} variant="outline">
            📘 Facebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## 后端实现：Satori 渲染

**API 路径**: `src/app/api/og/character/[uuid]/route.ts`

```typescript
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export async function POST(req: Request, { params }: { params: { uuid: string } }) {
  const { template = 'modern' } = await req.json();

  // 1. 获取角色数据
  const character = await findCharacterByUuid(params.uuid);
  if (!character) return Response.json({ error: 'Not found' }, { status: 404 });

  // 2. 获取世界观配置（如有）
  let worldConfig = null;
  if (character.world_uuid) {
    const world = await findworldById(character.world_uuid);
    worldConfig = world?.config;
  }

  // 3. 选择模板
  const templateComponent = getTemplateComponent(template, worldConfig);

  // 4. 使用 Satori 渲染为 SVG
  const svg = await satori(
    templateComponent({ character, worldConfig }),
    {
      width: 1200,
      height: 630,
      fonts: await loadFonts(template, worldConfig)
    }
  );

  // 5. 转换为 PNG
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // 6. 上传到 R2 Storage
  const imageUrl = await uploadToR2(
    pngBuffer,
    `share-cards/${character.uuid}-${template}.png`
  );

  // 7. 缓存 7 天
  await redis.set(
    `share-card:${character.uuid}:${template}`,
    imageUrl,
    { ex: 7 * 24 * 3600 }
  );

  return Response.json({ image_url: imageUrl });
}
```

## 世界观主题模板

**文件位置**: `src/components/og/worldTemplates.tsx`

```tsx
// 赛博朋克模板
export function CyberpunkTemplate({ character, worldConfig }: TemplateProps) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: '4px solid #FF00FF',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Orbitron, sans-serif'
      }}
    >
      {/* 数字雨背景 */}
      <div style={{ position: 'absolute', opacity: 0.2 }}>
        {/* Matrix-style rain */}
      </div>

      {/* 头像 */}
      <img
        src={character.avatar_url}
        alt={character.name}
        style={{ width: '150px', height: '150px', borderRadius: '50%', border: '4px solid #00FFFF' }}
      />

      {/* 名称 */}
      <h1 style={{ fontSize: '60px', color: '#00FFFF', textShadow: '0 0 20px #00FFFF' }}>
        {character.name}
      </h1>

      {/* 立绘 */}
      <img
        src={character.profile_image_url}
        alt={character.name}
        style={{ width: '400px', marginTop: '20px' }}
      />

      {/* Tags */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        {character.tags.map(tag => (
          <span key={tag} style={{ background: '#FF00FF', padding: '8px 16px', borderRadius: '20px', color: '#fff' }}>
            #{tag}
          </span>
        ))}
      </div>

      {/* 品牌 Logo */}
      <div style={{ marginTop: 'auto', fontSize: '20px', color: '#fff' }}>
        anividai.com
      </div>
    </div>
  );
}

// 奇幻模板
export function FantasyTemplate({ character, worldConfig }: TemplateProps) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        background: `url('/images/og-bg-fantasy.jpg')`,
        backgroundSize: 'cover',
        border: '8px solid #8B4513',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Cinzel, serif'
      }}
    >
      {/* 羊皮纸纹理覆盖 */}
      <div style={{ position: 'absolute', opacity: 0.8, background: 'url(/textures/parchment.png)' }} />

      {/* 头像（金色边框） */}
      <img
        src={character.avatar_url}
        style={{ width: '150px', height: '150px', borderRadius: '50%', border: '6px solid gold' }}
      />

      {/* 名称（哥特字体） */}
      <h1 style={{ fontSize: '64px', color: '#8B4513', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
        {character.name}
      </h1>

      {/* 立绘 */}
      <img src={character.profile_image_url} style={{ width: '400px', marginTop: '20px' }} />

      {/* 装饰元素（花纹） */}
      <div style={{ marginTop: '20px' }}>
        ✦ ✧ ✦
      </div>

      {/* 品牌 */}
      <div style={{ marginTop: 'auto', fontSize: '18px', color: '#8B4513' }}>
        Created on AnividAI.com
      </div>
    </div>
  );
}

// 现代简约模板
export function ModernTemplate({ character, worldConfig }: TemplateProps) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        background: '#fff',
        padding: '60px',
        display: 'flex',
        flexDirection: 'row',
        gap: '40px',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* 左侧：立绘 */}
      <img
        src={character.profile_image_url}
        style={{ width: '400px', height: '510px', objectFit: 'cover', borderRadius: '16px' }}
      />

      {/* 右侧：信息 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <img src={character.avatar_url} style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
        <h1 style={{ fontSize: '56px', color: '#000', marginTop: '20px' }}>{character.name}</h1>
        <p style={{ fontSize: '24px', color: '#666', marginTop: '10px' }}>
          {character.modules.personality?.welcome_message || 'Discover my story...'}
        </p>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
          {character.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{ background: '#f0f0f0', padding: '6px 12px', borderRadius: '8px', fontSize: '16px' }}>
              #{tag}
            </span>
          ))}
        </div>

        <div style={{ marginTop: '20px', fontSize: '18px', color: '#999' }}>
          anividai.com
        </div>
      </div>
    </div>
  );
}
```

## 缓存策略

```typescript
// 1. 生成前检查缓存
const cacheKey = `share-card:${character.uuid}:${template}`;
const cachedUrl = await redis.get(cacheKey);

if (cachedUrl) {
  return Response.json({ image_url: cachedUrl });
}

// 2. 生成后存入缓存（TTL: 7 天）
await redis.set(cacheKey, imageUrl, { ex: 7 * 24 * 3600 });

// 3. 角色更新时清除缓存
await redis.del(`share-card:${character.uuid}:*`);
```

## 性能优化

1. **字体预加载**：在服务启动时加载常用字体到内存
2. **模板预编译**：使用 React 缓存编译后的模板
3. **R2 CDN**：分享卡片通过 Cloudflare CDN 分发

## 国际化

```json
// src/i18n/pages/character-detail/en.json
{
  "share_card_title": "Share Your Character",
  "share_card_template": "Template",
  "share_card_download": "Download Image",
  "share_card_copy_link": "Copy Link",
  "share_card_generating": "Generating...",
  "share_card_failed": "Generation failed"
}
```

## 相关文件

- 组件：`src/components/character-detail/ShareCardDialog.tsx`
- API：`src/app/api/og/character/[uuid]/route.ts`
- 模板：`src/components/og/worldTemplates.tsx`
- 字体加载：`src/lib/og-fonts.ts`

## 变更历史

- 2026-01-08 FEAT-OC-REBUILD 初始版本
  - Satori 后端渲染
  - 3 种世界观主题模板（Cyberpunk/Fantasy/Modern）
  - R2 Storage 缓存（7 天 TTL）
  - 支持下载、复制链接、社交媒体分享
