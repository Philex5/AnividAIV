"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle } from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
  onClearChat: () => void;
  errorCode?: string;
  currentLevel?: string;
  texts?: {
    maxRoundsTitle?: string;
    maxRoundsDescription?: string;
    maxTokensTitle?: string;
    maxTokensDescription?: string;
    modelNotAllowedTitle?: string;
    modelNotAllowedDescription?: string;
    upgradeRequiredTitle?: string;
    upgradeRequiredDescription?: string;
    benefitsTitle?: string;
    clearChat?: string;
    upgradeNow?: string;
  };
}

export function UpgradeDialog({
  open,
  onOpenChange,
  onUpgrade,
  onClearChat,
  errorCode,
  currentLevel = "free",
  texts = {}
}: UpgradeDialogProps) {

  const getErrorMessage = () => {
    switch (errorCode) {
      case "MAX_ROUNDS_EXCEEDED":
        return {
          title: texts.maxRoundsTitle || "Conversation Round Limit Reached",
          description: texts.maxRoundsDescription || "You've reached the maximum number of conversation rounds for your current plan. Upgrade to continue chatting or clear the conversation to start fresh."
        };
      case "MAX_TOKENS_EXCEEDED":
        return {
          title: texts.maxTokensTitle || "Token Limit Reached",
          description: texts.maxTokensDescription || "You've used all your tokens for this conversation. Upgrade to increase your limit or clear the conversation to start fresh."
        };
      case "MODEL_NOT_ALLOWED":
        return {
          title: texts.modelNotAllowedTitle || "Premium Model Required",
          description: texts.modelNotAllowedDescription || "The premium model is only available to Plus and Pro subscribers. Upgrade your plan to access premium models."
        };
      default:
        return {
          title: texts.upgradeRequiredTitle || "Upgrade Required",
          description: texts.upgradeRequiredDescription || "To continue chatting with enhanced features, please upgrade your plan."
        };
    }
  };

  const errorMessage = getErrorMessage();
  const currentLevelName = currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1);

  const nextLevelName = currentLevel === "free" ? "Basic" :
                        currentLevel === "basic" ? "Plus" :
                        currentLevel === "plus" ? "Pro" : "Pro";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {currentLevelName}
            </Badge>
            <ArrowRight className="w-4 h-4" />
            <Badge variant="default" className="text-sm">
              {nextLevelName}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-base">
            {errorMessage.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">{texts.benefitsTitle || "Upgrade Benefits:"}</h4>
              <ul className="space-y-2 text-sm">
                {currentLevel === "free" && (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Increase to 30 conversation rounds</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Access to faster generation queue</span>
                    </li>
                  </>
                )}
                {currentLevel === "basic" && (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Upgrade to 60 conversation rounds</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Access to Premium AI models</span>
                    </li>
                  </>
                )}
                {currentLevel === "plus" && (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Increase to 120 conversation rounds</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Unlimited token usage per round</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClearChat} className="w-full sm:w-auto">
            {texts.clearChat || "Clear Conversation"}
          </Button>
          <Button onClick={onUpgrade} className="w-full sm:w-auto">
            {texts.upgradeNow || "Upgrade Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
