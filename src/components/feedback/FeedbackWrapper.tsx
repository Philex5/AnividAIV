"use client";

import { usePathname } from "next/navigation";
import Feedback from "@/components/feedback";

export default function FeedbackWrapper({ locale }: { locale: string }) {
  const pathname = usePathname();

  // Check if current path should show feedback
  // For non-default locales, path includes locale prefix (e.g., /zh/admin)
  // For default locale (en), path doesn't include locale prefix (e.g., /admin)
  const pathToCheck = locale === 'en' ? pathname : pathname.replace(`/${locale}`, '');
  const shouldShowFeedback = !pathToCheck.startsWith('/admin') &&
                             !pathToCheck.startsWith('/chat');

  if (!shouldShowFeedback) {
    return null;
  }

  return <Feedback />;
}