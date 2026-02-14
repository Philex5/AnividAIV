export type ArtworkType = "oc" | "image" | "video" | "character";

export interface AuthorBrief {
  id: string;
  name: string;
  avatar: string;
  membership_level?: string | null;
  membership_display_name?: string | null;
}

export interface ArtworkStats {
  likes: number;
  views: number;
  comments: number;
  favorites: number;
}

export interface ArtworkCharacter {
  uuid: string;
  name: string;
  avatar_url: string;
}

export interface ArtworkPreview {
  id: string;
  type: ArtworkType;
  title: string;
  cover_url: string;
  media_urls?: string[];
  author: AuthorBrief;
  stats: ArtworkStats;
  tags?: string[];
  meta?: Record<string, unknown>;
  liked?: boolean;
  favorited?: boolean;
  created_at?: string;
  model_id?: string;
  model_name?: string;
  characters?: ArtworkCharacter[];
  prompt?: string;
  original_prompt?: string;
  final_prompt?: string;
  description?: string;
  gen_type?: string;
  moderation_status?: "normal" | "banned" | "featured";
}

export interface ArtworkDetail extends ArtworkPreview {
  description?: string;
  prompt?: string;
}

export interface CommunityListResponse {
  items: ArtworkPreview[];
  nextCursor: string | null;
}

export interface CommunityPage {
  title: string;
  subtitle: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
  intro?: {
    heading: string;
    paragraph: string;
  };
  contentGuide?: {
    heading: string;
    items: string[];
  };
  faq?: {
    heading: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  search: {
    placeholder: string;
    button: string;
    clear: string;
  };
  tabs: {
    all: string;
    oc: string;
    image: string;
    video: string;
  };
  sort: {
    trending: string;
    newest: string;
    top: string;
  };
  filters: {
    filterButton: string;
    drawerTitle: string;
    drawerDescription: string;
    apply: string;
    clear: string;
  };
  genTypes: {
    title: string;
    options: Record<string, string>;
  };
  states: {
    comingSoon: string;
    loading: string;
    loadingMore: string;
    noResults: string;
    loadFailed: string;
    retry: string;
  };
  aria: {
    sort: string;
    search: string;
    filters: string;
    closeDetail: string;
    like: string;
    favorite: string;
    share: string;
    download: string;
    more: string;
    useOc: string;
  };
  actions: {
    like: string;
    fav: string;
    share: string;
    download: string;
    more: string;
    copyLink: string;
    viewDetail: string;
    viewMore: string;
    useOc: string;
  };
  detail: {
    loading: string;
    error: string;
    prompt: string;
    description: string;
    tags: string;
    ocTraits: string;
    stats: {
      likes: string;
      views: string;
      comments: string;
    };
    meta: {
      duration: string;
      resolution: string;
      model?: string;
      characters?: string;
      created_at?: string;
    };
    empty: {
      description: string;
    };
  };
  labels: {
    duration: string;
    resolution: string;
  };
  toasts: {
    loadFailed: string;
    loadMoreFailed: string;
    detailFailed: string;
    copySuccess: string;
    copyFailed: string;
    likeFailed: string;
    favoriteFailed: string;
    shareMoreComingSoon: string;
    useOcComingSoon: string;
    downloadSuccess: string;
    downloadFailed: string;
  };
}
