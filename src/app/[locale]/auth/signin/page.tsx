import SignForm from "@/components/sign/form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAuthEnabled } from "@/lib/auth";
import { getLogoUrl } from "@/lib/asset-loader";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl: string | undefined }>;
}) {
  if (!isAuthEnabled()) {
    return redirect("/");
  }

  const { callbackUrl } = await searchParams;
  const session = await auth();
  if (session) {
    return redirect(callbackUrl || "/");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-3 self-center font-medium">
          <img
            src={getLogoUrl()}
            alt="logo"
            className="h-12 w-auto object-contain"
          />
          {/* {process.env.NEXT_PUBLIC_PROJECT_NAME} */}
        </a>
        <SignForm />
      </div>
    </div>
  );
}
