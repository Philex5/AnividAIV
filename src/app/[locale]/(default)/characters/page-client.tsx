"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

import { ArtworkCard } from "@/components/community/ArtworkCard"
import { ArtworkDetailModal } from "@/components/community/detail/ArtworkDetailModal"
import { CharactersFiltersBar } from "@/components/characters/filters/CharactersFiltersBar"
import { Button } from "@/components/ui/button"
import AppFooter from "@/components/blocks/footer/AppFooter"
import Crumb from "@/components/blocks/crumb"
import type {
  CharacterPreview,
  CharactersPage,
  CharacterListResponse,
} from "@/types/pages/characters"
import type { ArtworkPreview, CommunityPage } from "@/types/pages/community"

type SortValue = "latest" | "trending" | "top"

const DEFAULT_SORT: SortValue = "latest"

function buildListParams(
  filters: {
    sort: SortValue
    style?: string | null
    species?: string | null
    gender?: "male" | "female" | "other" | null
    role?: string | null
    world?: string | null
  },
  page: number
) {
  const params = new URLSearchParams()
  params.set("sort", filters.sort)
  params.set("page", String(page))
  if (filters.style) params.set("style", filters.style)
  if (filters.species) params.set("species", filters.species)
  if (filters.gender) params.set("gender", filters.gender)
  if (filters.role) params.set("role", filters.role)
  if (filters.world) params.set("world", filters.world)
  params.set("limit", "24")
  return params
}

// Convert CharacterPreview to ArtworkPreview
function convertToArtworkPreview(char: CharacterPreview): ArtworkPreview {
  const coverUrl = char.profile_url || char.avatar_url || ""
  return {
    id: char.uuid,
    type: "oc",
    title: char.name,
    cover_url: coverUrl,
    media_urls: coverUrl ? [coverUrl] : undefined,
    author: {
      id: char.user_uuid || "",
      name: char.creator_name || "Unknown",
      avatar: char.creator_avatar || "",
    },
    stats: {
      likes: char.like_count,
      views: char.views || 0,
      comments: char.comment_count,
      favorites: char.favorite_count,
    },
    liked: char.liked || false,
    favorited: char.favorited || false,
    created_at: char.created_at || undefined,
    meta: {
      gender: char.gender || undefined,
      age: undefined,
      species: char.species || undefined,
      role: char.role || undefined,
    },
  }
}

export default function CharactersPageClient({
  pageData,
}: {
  pageData: CharactersPage
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sortParam = searchParams.get("sort")
  const styleParam = searchParams.get("style")
  const speciesParam = searchParams.get("species")
  const genderParam = searchParams.get("gender")
  const roleParam = searchParams.get("role")
  const worldParam = searchParams.get("world")
  const pageParam = searchParams.get("page")

  const filters = useMemo(() => {
    const normalizedSort: SortValue =
      sortParam === "latest" || sortParam === "trending" || sortParam === "top"
        ? sortParam
        : DEFAULT_SORT

    const normalizedGender: "male" | "female" | "other" | null =
      genderParam === "male" || genderParam === "female" || genderParam === "other"
        ? genderParam
        : null

    return {
      sort: normalizedSort,
      style: styleParam,
      species: speciesParam,
      gender: normalizedGender,
      role: roleParam,
      world: worldParam,
    }
  }, [sortParam, styleParam, speciesParam, genderParam, roleParam, worldParam])

  const currentPage = Math.max(1, Number(pageParam) || 1)

  const [items, setItems] = useState<CharacterPreview[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [styles, setStyles] = useState<Array<{ key: string; name: string }>>([])
  const [speciesList, setSpeciesList] = useState<Array<{ key: string; name: string }>>([])
  const [rolesList, setRolesList] = useState<Array<{ key: string; name: string }>>([])
  const [worldsList, setWorldsList] = useState<Array<{ uuid: string; name: string }>>([])

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<ArtworkPreview | undefined>(undefined)

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // Load styles
        const stylesData = await import("@/configs/styles/character_styles.json")
        const stylesOptions = stylesData.default.items.map((item: any) => ({
          key: item.key,
          name: item.name,
        }))
        setStyles(stylesOptions)

        // Load species
        const speciesData = await import("@/configs/characters/species.json")
        const speciesOptions = speciesData.default.items.map((item: any) => ({
          key: item.key,
          name: item.name,
        }))
        setSpeciesList(speciesOptions)

        // Load roles
        const rolesData = await import("@/configs/characters/roles.json")
        const rolesOptions = rolesData.default.items.map((item: any) => ({
          key: item.key,
          name: item.name,
        }))
        setRolesList(rolesOptions)

        // Load worlds
        const worldsResponse = await fetch("/api/worlds?visibility_level=public&limit=100")
        if (worldsResponse.ok) {
          const worldsData = await worldsResponse.json()
          if (worldsData.data?.worlds) {
            const worldsOptions = worldsData.data.worlds.map((w: any) => ({
              uuid: w.uuid,
              name: w.name,
            }))
            setWorldsList(worldsOptions)
          }
        }
      } catch (err) {
        console.error("Failed to load filter options:", err)
      }
    }

    loadFilterOptions()
  }, [])

  // Load characters
  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    const params = buildListParams(filters, currentPage)

    const load = async () => {
      try {
        const response = await fetch(`/api/characters/public?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(await response.text())
        }
        const result = await response.json()
        const data = result.data as CharacterListResponse
        setItems(data.items)
        setTotal(data.total)
      } catch (err) {
        if (controller.signal.aborted) return
        console.error("Characters list load failed:", err)
        const message = pageData.states.loadFailed
        setError(message)
        toast.error(pageData.toasts.loadFailed)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [filters, currentPage, reloadKey, pageData])

  const updateQuery = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(searchParams.toString())
      mutator(nextParams)
      // Reset to page 1 when filters change
      nextParams.delete("page")
      const query = nextParams.toString()
      const target = query ? `${pathname}?${query}` : pathname
      router.push(target)
    },
    [pathname, router, searchParams]
  )

  const handleSortChange = useCallback(
    (nextSort: SortValue) => {
      updateQuery((sp) => {
        sp.set("sort", nextSort)
      })
    },
    [updateQuery]
  )

  const handleStyleChange = useCallback(
    (nextStyle: string | null) => {
      updateQuery((sp) => {
        if (nextStyle) {
          sp.set("style", nextStyle)
        } else {
          sp.delete("style")
        }
      })
    },
    [updateQuery]
  )

  const handleSpeciesChange = useCallback(
    (nextSpecies: string | null) => {
      updateQuery((sp) => {
        if (nextSpecies) {
          sp.set("species", nextSpecies)
        } else {
          sp.delete("species")
        }
      })
    },
    [updateQuery]
  )

  const handleGenderChange = useCallback(
    (nextGender: "male" | "female" | "other" | null) => {
      updateQuery((sp) => {
        if (nextGender) {
          sp.set("gender", nextGender)
        } else {
          sp.delete("gender")
        }
      })
    },
    [updateQuery]
  )

  const handleRoleChange = useCallback(
    (nextRole: string | null) => {
      updateQuery((sp) => {
        if (nextRole) {
          sp.set("role", nextRole)
        } else {
          sp.delete("role")
        }
      })
    },
    [updateQuery]
  )

  const handleWorldChange = useCallback(
    (nextWorld: string | null) => {
      updateQuery((sp) => {
        if (nextWorld) {
          sp.set("world", nextWorld)
        } else {
          sp.delete("world")
        }
      })
    },
    [updateQuery]
  )

  const handleClearAll = useCallback(() => {
    updateQuery((sp) => {
      sp.delete("style")
      sp.delete("species")
      sp.delete("gender")
      sp.delete("role")
      sp.delete("world")
    })
  }, [updateQuery])

  const handlePageChange = useCallback((newPage: number) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("page", String(newPage))
    const query = nextParams.toString()
    const target = query ? `${pathname}?${query}` : pathname
    router.push(target)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [pathname, router, searchParams])

  const handleToggleLike = useCallback(async (id: string, next: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.uuid === id
          ? {
              ...item,
              liked: next,
              like_count: Math.max(0, item.like_count + (next ? 1 : -1)),
            }
          : item
      )
    )

    try {
      const response = await fetch(`/api/characters/${id}/like`, {
        method: next ? "POST" : "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to update like")
      }
    } catch (error) {
      setItems((prev) =>
        prev.map((item) =>
          item.uuid === id
            ? { ...item, liked: !next, like_count: item.like_count }
            : item
        )
      )
      toast.error(pageData.toasts.likeFailed)
    }
  }, [pageData])

  const handleToggleFavorite = useCallback(async (id: string, next: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.uuid === id
          ? {
              ...item,
              favorited: next,
              favorite_count: Math.max(0, item.favorite_count + (next ? 1 : -1)),
            }
          : item
      )
    )

    try {
      const response = await fetch(`/api/characters/${id}/favorite`, {
        method: next ? "POST" : "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to update favorite")
      }
    } catch (error) {
      setItems((prev) =>
        prev.map((item) =>
          item.uuid === id
            ? { ...item, favorited: !next, favorite_count: item.favorite_count }
            : item
        )
      )
      toast.error(pageData.toasts.favoriteFailed)
    }
  }, [pageData])

  const handleOpenDetail = useCallback((artwork: ArtworkPreview) => {
    setDetailItem(artwork)
    setDetailId(artwork.id)
    setDetailOpen(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false)
    setDetailId(null)
    setDetailItem(undefined)
  }, [])

  const totalPages = Math.ceil(total / 24)
  const isEmptyState = !isLoading && !error && items.length === 0

  // Convert items to ArtworkPreview format for ArtworkCard
  const artworkItems = useMemo(() => items.map(convertToArtworkPreview), [items])

  // Create a mock CommunityPage with necessary translations
  const mockCommunityPage: CommunityPage = useMemo(() => ({
    title: pageData.title,
    subtitle: pageData.subtitle,
    search: {
      placeholder: pageData.search.placeholder,
      button: pageData.search.button,
      clear: pageData.search.clear,
    },
    tabs: {
      all: "All",
      oc: "OC",
      image: "Image",
      video: "Video",
    },
    sort: {
      trending: pageData.sort.trending,
      newest: pageData.sort.latest,
      top: pageData.sort.top,
    },
    filters: {
      filterButton: "Filters",
      drawerTitle: "Refine artworks",
      drawerDescription: "Adjust sorting to discover the artworks you like.",
      apply: "Apply",
      clear: "Clear",
    },
    genTypes: {
      title: "Subtype",
      options: {},
    },
    states: {
      comingSoon: "Content is coming soon",
      loading: pageData.states.loading,
      loadingMore: pageData.states.loadingMore,
      noResults: pageData.states.noResults,
      loadFailed: pageData.states.loadFailed,
      retry: pageData.states.retry,
    },
    aria: {
      sort: pageData.aria.sort,
      search: pageData.aria.search,
      filters: pageData.aria.filters,
      closeDetail: "Close detail",
      like: pageData.aria.like,
      favorite: pageData.aria.favorite,
      share: "Share artwork",
      download: "Download artwork",
      more: "More actions",
      useOc: "Use this OC",
    },
    actions: {
      like: pageData.actions.like,
      fav: pageData.actions.fav,
      share: pageData.actions.share,
      download: pageData.actions.download,
      more: pageData.actions.more,
      copyLink: "Copy link",
      viewDetail: pageData.aria.viewDetail,
      viewMore: "View more",
      useOc: "Use this OC",
    },
    detail: {
      loading: "Loading artwork...",
      error: "Failed to fetch artwork detail",
      prompt: "PROMPT",
      description: "Description",
      tags: "Tags",
      ocTraits: "Traits",
      stats: {
        likes: pageData.card.likes,
        views: pageData.card.views,
        comments: "Comments",
      },
      meta: {
        duration: "Duration",
        resolution: "Resolution",
        model: "MODEL",
        characters: "OC",
        noCharacters: "None",
        created_at: "CREATED AT",
      },
      empty: {
        description: "",
      },
    },
    labels: {
      duration: "{count} sec",
      resolution: "{value} resolution",
    },
    toasts: {
      loadFailed: pageData.toasts.loadFailed,
      loadMoreFailed: pageData.toasts.loadMoreFailed,
      detailFailed: "Failed to fetch artwork detail",
      copySuccess: "Artwork link copied",
      copyFailed: "Failed to copy link",
      likeFailed: pageData.toasts.likeFailed,
      favoriteFailed: pageData.toasts.favoriteFailed,
      shareMoreComingSoon: "More sharing options are coming soon",
      useOcComingSoon: "OC reuse workflow is coming soon",
      downloadSuccess: "Download started",
      downloadFailed: "Failed to download artwork",
    },
    comments: {
      title: "{count} Comments",
      placeholder: "Add a comment...",
      replyPlaceholder: "Reply to {name}...",
      submit: "Comment",
      reply: "Reply",
      cancel: "Cancel",
      loadMore: "Load more comments",
      viewReplies: "View replies",
      hideReplies: "Hide replies",
      deleted: "This comment has been deleted.",
      noComments: "No comments yet. Be the first to comment!",
      deleteConfirm: "Are you sure you want to delete this comment?",
      toasts: {
        posted: "Comment posted",
        postFailed: "Failed to post comment",
        replied: "Reply posted",
        replyFailed: "Failed to post reply",
        deleted: "Comment deleted",
        deleteFailed: "Failed to delete comment",
        actionFailed: "Action failed",
      },
    },
  }), [pageData])

  // Breadcrumb items
  const breadcrumbItems = [
    { title: pageData.breadcrumb.home, url: "/" },
    { title: pageData.breadcrumb.characters, url: "/characters", is_active: true },
  ]

  return (
    <>
      <div className="mx-auto flex max-w-[1920px] flex-col gap-4 px-4 pt-2 pb-6">
        {/* Breadcrumb */}
        <div className="-mt-4 px-2 py-1">
          <Crumb items={breadcrumbItems} />
        </div>

        {/* Header */}
        <div className="flex flex-col gap-2 py-4">
          <h1 className="text-3xl font-bold">{pageData.title}</h1>
          <p className="text-muted-foreground">{pageData.subtitle}</p>
        </div>

        {/* Filters */}
        <div className="px-2">
          <CharactersFiltersBar
            sort={filters.sort}
            style={filters.style}
            species={filters.species}
            gender={filters.gender}
            role={filters.role}
            world={filters.world}
            onSortChange={handleSortChange}
            onStyleChange={handleStyleChange}
            onSpeciesChange={handleSpeciesChange}
            onGenderChange={handleGenderChange}
            onRoleChange={handleRoleChange}
            onWorldChange={handleWorldChange}
            onClearAll={handleClearAll}
            pageData={pageData}
            styles={styles}
            speciesOptions={speciesList}
            roles={rolesList}
            worlds={worldsList}
          />
        </div>

        {/* Content */}
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <span>{error}</span>
            <Button
              type="button"
              size="sm"
              onClick={() => setReloadKey((prev) => prev + 1)}
            >
              {pageData.states.retry}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="columns-2 gap-3 md:columns-4 min-[1600px]:columns-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-3"
              >
                <div className="aspect-[4/5] w-full rounded-xl bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : isEmptyState ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <span>{pageData.states.noResults}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleClearAll}
            >
              {pageData.filters.clear}
            </Button>
          </div>
        ) : (
          <>
            <div className="columns-2 gap-3 md:columns-4 min-[1600px]:columns-5">
              {artworkItems.map((artwork) => (
                <div key={artwork.id} className="break-inside-avoid">
                  <ArtworkCard
                    artwork={artwork}
                    onOpen={handleOpenDetail}
                    onToggleLike={handleToggleLike}
                    onToggleFavorite={handleToggleFavorite}
                    pageData={mockCommunityPage}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 py-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-10"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <ArtworkDetailModal
        open={detailOpen}
        artworkId={detailId}
        listItem={detailItem}
        onClose={handleCloseDetail}
        onToggleLike={handleToggleLike}
        onToggleFavorite={handleToggleFavorite}
        pageData={mockCommunityPage}
      />

      <AppFooter />
    </>
  )
}
