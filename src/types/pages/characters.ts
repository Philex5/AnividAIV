export interface CharacterPreview {
  uuid: string;
  name: string;
  gender: string | null;
  species: string | null;
  role: string | null;
  brief_introduction: string | null;
  tags: string[] | null;
  like_count: number;
  favorite_count: number;
  comment_count: number;
  views?: number;
  world_uuid: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  user_uuid: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
  liked?: boolean;
  favorited?: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CharactersPage {
  title: string;
  subtitle: string;
  search: {
    placeholder: string;
    button: string;
    clear: string;
  };
  sort: {
    latest: string;
    trending: string;
    top: string;
  };
  filters: {
    title: string;
    style: string;
    species: string;
    gender: string;
    role: string;
    world: string;
    gender_all: string;
    gender_male: string;
    gender_female: string;
    gender_other: string;
    clear: string;
  };
  states: {
    loading: string;
    loadingMore: string;
    noResults: string;
    loadFailed: string;
    retry: string;
  };
  aria: {
    sort: string;
    filters: string;
    search: string;
    viewDetail: string;
    like: string;
    favorite: string;
  };
  toasts: {
    loadFailed: string;
    loadMoreFailed: string;
    likeFailed: string;
    favoriteFailed: string;
  };
  card: {
    by: string;
    likes: string;
    views: string;
  };
  breadcrumb: {
    home: string;
    characters: string;
  };
  actions: {
    like: string;
    fav: string;
    share: string;
    download: string;
    more: string;
  };
}

export interface CharacterListResponse {
  items: CharacterPreview[];
  total: number;
  page: number;
  limit: number;
}
