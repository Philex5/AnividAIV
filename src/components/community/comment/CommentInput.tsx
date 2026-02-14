"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTranslations } from "next-intl";

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

export function CommentInput({
  onSubmit,
  placeholder,
  autoFocus = false,
  submitLabel,
  cancelLabel,
  onCancel,
}: CommentInputProps) {
  const t = useTranslations("comments");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requireAuth } = useRequireAuth();

  const activePlaceholder = placeholder || t("placeholder");
  const activeSubmitLabel = submitLabel || t("submit");
  const activeCancelLabel = cancelLabel || t("cancel");

  const handleSubmit = requireAuth(async () => {
    if (!content.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-3">
      <Textarea
        placeholder={activePlaceholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus={autoFocus}
        className="min-h-[80px] resize-none"
        maxLength={1000}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            {activeCancelLabel}
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {activeSubmitLabel}
        </Button>
      </div>
    </div>
  );
}
