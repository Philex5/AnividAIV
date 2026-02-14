export interface CommentWithUser {
  id: number;
  uuid: string;
  user_uuid: string;
  art_id: string;
  art_type: string;
  content: string;
  parent_uuid: string | null;
  reply_to_user_uuid: string | null;
  like_count: number;
  is_deleted: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  user: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  is_liked?: boolean;
}
