import "next-auth";

declare module "next-auth" {
  interface JWT {
    user?: {
      uuid?: string;
      display_name?: string;
      avatar_url?: string;
      created_at?: string;
    };
  }

  interface Session {
    user: {
      uuid?: string;
      display_name?: string;
      avatar_url?: string;
      created_at?: string;
    } & DefaultSession["user"];
  }
}
