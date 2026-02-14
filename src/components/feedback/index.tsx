"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import Image from "next/image";
import {
  getCreamyCharacterUrl,
  getMemberBadgeUrl,
  getModelIconUrl,
  getPublicAssetUrl,
} from "@/lib/asset-loader";

import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";
import { useState } from "react";
import { SocialItem } from "@/types/blocks/base";
import { useTranslations } from "next-intl";

export default function Feedback({
  socialLinks,
}: {
  socialLinks?: SocialItem[];
}) {
  const t = useTranslations();

  const { user, setShowSignModal, showFeedback, setShowFeedback } =
    useAppContext();

  const [feedback, setFeedback] = useState("");
  const [type, setType] = useState<
    "general" | "bug_report" | "feature_request" | "user_experience"
  >("user_experience");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!user) {
      setShowSignModal(true);
      return;
    }

    if (!feedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    try {
      setLoading(true);

      const req = {
        content: feedback,
        type: type,
      };

      const resp = await fetch("/api/add-feedback", {
        method: "POST",
        body: JSON.stringify(req),
      });
      if (!resp.ok) {
        toast.error("Submit failed with status " + resp.status);
        return;
      }

      const { code, message } = await resp.json();
      if (code !== 0) {
        toast.error(message);
        return;
      }

      toast.success(t("feedback.success"));

      setFeedback("");
      setType("user_experience");
      setShowFeedback(false);
    } catch (error) {
      toast.error("Failed to submit, please try again later");
    } finally {
      setLoading(false);
    }
  };

  const feedbackTypes = [
    { value: "general", label: "General Feedback" },
    { value: "bug_report", label: "Bug Report" },
    { value: "feature_request", label: "Feature Request" },
    { value: "user_experience", label: "User Experience" },
  ];

  return (
    <div className="fixed bottom-10 right-2 z-50">
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-transparent"
            onClick={() => setShowFeedback(true)}
          >
            <Image
              src={getPublicAssetUrl("imgs/icons/feedback.webp")}
              alt="Feedback"
              width={256}
              height={256}
              className="h-9 w-9"
            />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-panel sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {t("feedback.title")}
            </DialogTitle>
            <DialogDescription className="text-base">
              {t("feedback.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            <Textarea
              placeholder={t("feedback.placeholder")}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[150px] text-base resize-none"
            />
          </div>

          <div className="mt-4 flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              {t("feedback.type_tip")}
            </p>
            <div className="w-full">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
              >
                {feedbackTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-start items-center gap-4">
            {socialLinks && socialLinks.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("feedback.contact_tip")}
                </p>
                <div className="flex gap-4">
                  {socialLinks?.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={link.title}
                    >
                      <Icon name={link.icon || ""} className="text-xl" />
                    </a>
                  ))}
                </div>
              </>
            )}
            <div className="flex-1"></div>
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? t("feedback.loading") : t("feedback.submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
