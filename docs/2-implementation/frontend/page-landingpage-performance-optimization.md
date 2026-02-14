# Landing Page Performance Optimization Strategy

**Created**: 2026-02-02
**Status**: Design
**Priority**: High
**Related**: FEAT-landingpage-performance

---

## Background

The landing page has two major performance issues affecting user experience:

1. Hero video takes 1-2s to display first frame
2. OC Maker feature card's character showcase loads too slowly

---

## Problem Analysis

### Issue 1: Hero Video Loading Delay

**Current Implementation** (`src/components/blocks/hero-video/index.tsx:56-68`):

```tsx
<video
  autoPlay
  loop
  muted
  playsInline
  className="w-full h-full object-cover"
  poster="https://artworks.anividai.com/assets/hero-poster.webp"
>
  <source
    src="https://artworks.anividai.com/assets/hero_video_smaller.mp4"
    type="video/mp4"
  />
</video>
```

**Root Causes**:

1. Video file may be too large
2. No preloading strategy implemented
3. Browser needs to buffer enough data before playing
4. Poster image not preloaded

### Issue 2: OC Maker Card Content Loading

**Current Implementation** (`src/components/blocks/features/oc-maker-bento.tsx:48-78`):

```tsx
export function OCMakerBentoLayout() {
  const {
    characters: ocGalleryCharacters,
    loading: ocGalleryLoading,
  } = useOCGallery();

  const {
    characters: dbCharacters,
    loading: dbLoading,
  } = usePublicCharactersFromDB({
    uuids: spotlightUuids,
    enabled: !ocGalleryLoading,
  });

  // During loading: only shows pulse animation
  if (loading || !activeCharacter) {
    return <div className="absolute inset-0 bg-muted/20 animate-pulse" />;
  }
```

**Root Causes**:

1. Sequential data fetching (OC Gallery → DB Characters)
2. No progressive content rendering
3. No image preloading for character assets
4. Loading state provides poor UX (just pulse animation)
5. Data fetched on every page visit (no caching of character images)

---

## Optimization Strategy

### Phase 1: Hero Video Optimization (Quick Wins)

#### 1.1 Add Video Preload

- Add `preload="auto"` to video element
- Add `<link rel="preload">` in document head for video file
- Preload poster image

**Implementation**:

```tsx
// In next.config.mjs or layout.tsx
<link rel="preload" href="https://artworks.anividai.com/assets/hero-poster.webp" as="image" />
<link rel="preload" href="https://artworks.anividai.com/assets/hero_video_smaller.mp4" as="video" type="video/mp4" />
```

```tsx
// In hero-video component
<video
  preload="auto"
  autoPlay
  loop
  muted
  playsInline
  // ...
>
```

#### 1.2 Optimize Video File

- Ensure video is properly compressed
- Consider using lower resolution for mobile
- Use modern codec (H.265/AV1) with fallback

#### 1.3 Improve Loading State

- Show poster immediately with loading indicator
- Add progressive reveal animation

---

### Phase 2: OC Maker Card Optimization

#### 2.1 Implement Progressive Rendering

**Current**: Empty pulse animation until all data loads
**Optimized**: Show skeleton with preview immediately

```tsx
// New loading states
1. Initial: Show optimized skeleton preview
2. Data ready: Fade in character content
3. Images loaded: Reveal full detail
```

**Implementation**:

```tsx
// 1. Create a visual skeleton that matches final layout
function OCMakerSkeleton() {
  return (
    <div className="absolute inset-0">
      {/* Character silhouette with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent" />

      {/* Card placeholders */}
      <div className="absolute top-8 left-6 w-64 h-32 bg-card/20 rounded-[1.8rem] animate-pulse" />
      <div className="absolute top-8 right-6 w-56 h-40 bg-card/20 rounded-[1.8rem] animate-pulse" />
      <div className="absolute bottom-36 left-6 w-64 h-32 bg-card/20 rounded-[1.8rem] animate-pulse" />
      <div className="absolute bottom-32 right-6 w-48 h-48 bg-card/20 rounded-[1.8rem] animate-pulse" />
    </div>
  );
}
```

#### 2.2 Implement Image Preloading

```tsx
// Preload character images before showing them
function useImagePreload(urls: string[]) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!urls.length) return;

    const images = urls.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });

    Promise.all(
      images.map((img) => {
        return new Promise((resolve) => {
          if (img.complete) resolve(true);
          img.onload = () => resolve(true);
        });
      }),
    ).then(() => setLoaded(true));
  }, [urls]);

  return loaded;
}
```

#### 2.3 Optimize Data Fetching

**Current**: Sequential fetch (OC Gallery → wait → DB Characters)
**Optimized**: Parallel fetch with optimistic rendering

```tsx
// Fetch in parallel, render as soon as first data available
const [ocGalleryData, dbCharactersData] = await Promise.all([
  fetchOCGalleryData(),
  fetchDBCharactersData(),
]);
```

#### 2.4 Add Client-Side Caching

```tsx
// Cache fetched characters in memory/localStorage
const CHARACTER_CACHE_KEY = "landing_page_characters_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function useCachedCharacters(uuids: string[]) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem(CHARACTER_CACHE_KEY);
    if (cached) {
      const { timestamp, characters } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        setData(characters);
        return;
      }
    }

    // Fetch fresh data
    fetchAndCacheCharacters(uuids);
  }, [uuids]);
}
```

#### 2.5 Reduce Initial Payload

**Option A: Use static preview for first render**

- Show first character from static config immediately
- Replace with fresh data when loaded

**Option B: Server-side data fetching**

- Move character fetching to server component
- Pass preloaded data to client component

---

### Phase 3: Advanced Optimizations

#### 3.1 Implement Intersection Observer for Lazy Loading

```tsx
// Only fetch character data when card is in viewport
function useInViewFetch(ref: RefObject<HTMLElement>, fetchFn: () => void) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchFn();
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, fetchFn]);
}
```

#### 3.2 Use React Suspense for Data Fetching

```tsx
// Wrap components in Suspense boundaries
<Suspense fallback={<OCMakerSkeleton />}>
  <OCMakerBentoLayout />
</Suspense>
```

#### 3.3 Optimize Image Delivery

1. **Use responsive images**:

   ```tsx
   <img
     srcSet={`
       ${imageUrl}?w=400 400w,
       ${imageUrl}?w=800 800w,
       ${imageUrl} 1200w
     `}
     sizes="(max-width: 768px) 400px, 800px"
   />
   ```

2. **Add blur placeholders**:

   ```tsx
   // Generate tiny blur hash for instant preview
   <img
     style={{ filter: "blur(10px)" }}
     src={tinyImageUrl}
     onLoad={(e) => (e.target.style.filter = "none")}
   />
   ```

3. **Use WebP format with fallbacks**:
   ```tsx
   <picture>
     <source srcSet={`${imageUrl}.webp`} type="image/webp" />
     <img src={`${imageUrl}.jpg`} />
   </picture>
   ```

---

## Implementation Priority

### Immediate (This Week)

1. ✅ Add video preload attributes
2. ✅ Improve OC Maker loading skeleton
3. ✅ Implement image preloading for character assets

### Short Term (Next 2 Weeks)

4. ✅ Add client-side caching for character data
5. ✅ Optimize data fetching (parallel requests)
6. ✅ Add progressive rendering states

### Medium Term (Next Month)

7. ✅ Implement intersection observer for lazy loading
8. ✅ Optimize image delivery (responsive images, WebP)
9. ✅ Consider server-side data fetching

---

## Success Metrics

| Metric                         | Target  | Current |
| ------------------------------ | ------- | ------- |
| Hero video first frame         | < 500ms | ~1-2s   |
| OC Maker content ready         | < 1s    | ~2-3s   |
| LCP (Largest Contentful Paint) | < 2.5s  | TBD     |
| FID (First Input Delay)        | < 100ms | TBD     |
| CLS (Cumulative Layout Shift)  | < 0.1   | TBD     |

---

## Related Files

### Files to Modify

1. `src/components/blocks/hero-video/index.tsx` - Hero video component
2. `src/components/blocks/features/oc-maker-bento.tsx` - OC Maker card
3. `src/app/[locale]/(default)/page.tsx` - Landing page
4. `src/lib/hooks/useConfigs.ts` - Data fetching hooks
5. `next.config.mjs` - Preload configuration

### Files to Create

1. `src/components/loading/OCMakerSkeleton.tsx` - Loading skeleton
2. `src/lib/hooks/useImagePreload.ts` - Image preloading hook
3. `src/lib/hooks/useCachedCharacters.ts` - Character caching hook

---

## Testing Checklist

- [ ] Hero video plays within 500ms on 3G connection
- [ ] OC Maker shows skeleton immediately
- [ ] Character images fade in smoothly
- [ ] No layout shift during loading
- [ ] Cached data loads on repeat visits
- [ ] Mobile performance acceptable
- [ ] No console errors during loading

---

## Risks & Mitigation

| Risk                    | Mitigation                                        |
| ----------------------- | ------------------------------------------------- |
| Cache staleness         | Use short TTL (5 min) with stale-while-revalidate |
| Increased memory usage  | Limit cache size, implement LRU eviction          |
| Video preload bandwidth | Only preload on WiFi, use lower res for mobile    |
| Skeleton mismatch       | Ensure skeleton matches final layout exactly      |
