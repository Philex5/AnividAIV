import { User } from "./user";

export type AdminUserRow = Pick<
  User,
  | "id"
  | "uuid"
  | "email"
  | "created_at"
  | "last_active_at"
  | "display_name"
  | "avatar_url"
  | "locale"
  | "signin_type"
  | "signin_ip"
  | "signin_provider"
  | "signin_openid"
  | "signup_country"
  | "signup_ref"
  | "signup_utm_source"
  | "invite_code"
  | "updated_at"
  | "invited_by"
  | "is_affiliate"
  | "is_sub"
  | "sub_expired_at"
  | "sub_plan_type"
>;
