import { User } from "./user";

export interface Feedback {
  id?: number;
  created_at: string;
  status: string;
  user_uuid: string;
  content: string;
  type: "general" | "bug_report" | "feature_request" | "user_experience";
  user?: User;
}
