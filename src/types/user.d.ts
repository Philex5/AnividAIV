export interface User {
  id?: number;
  uuid?: string;
  email: string;
  created_at?: Date | null;
  last_active_at?: Date | null;
  display_name?: string | null;
  avatar_url?: string | null;
  gender?: "male" | "female" | "other" | null;
  bio?: string | null;
  background_url?: string | null;
  locale?: string | null;
  signin_type?: string | null;
  signin_ip?: string | null;
  signin_provider?: string | null;
  signin_openid?: string | null;
  signup_country?: string | null;
  signup_ref?: string | null;
  signup_utm_source?: string | null;
  updated_at?: Date | null;
  credits?: UserCredits;
  invite_code?: string;
  invited_by?: string;
  is_affiliate?: boolean;
  is_admin?: boolean;
  is_sub?: boolean;
  sub_expired_at?: Date | null;
  sub_plan_type?: string | null;
}

export interface UserCredits {
  left_credits: number;
  is_recharged?: boolean;
}
