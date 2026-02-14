"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SiGithub, SiGmail, SiGoogle } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useAppContext } from "@/contexts/app";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTranslations } from "next-intl";

export default function SignModal() {
  const t = useTranslations();
  const { showSignModal, setShowSignModal, signModalMessage } = useAppContext();

  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("sign_modal.sign_in_title")}</DialogTitle>
            <DialogDescription>
              {t("sign_modal.continue_after_login")}
            </DialogDescription>
          </DialogHeader>
          <ProfileForm customMessage={signModalMessage} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={showSignModal} onOpenChange={setShowSignModal}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("sign_modal.sign_in_title")}</DrawerTitle>
          <DrawerDescription>
            {t("sign_modal.continue_after_login")}
          </DrawerDescription>
        </DrawerHeader>
        <ProfileForm className="px-4" customMessage={signModalMessage} />
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{t("sign_modal.cancel_title")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

interface ProfileFormProps extends React.ComponentProps<"form"> {
  customMessage?: string;
}

function ProfileForm({ className, customMessage }: ProfileFormProps) {
  const t = useTranslations();

  // 获取当前页面的 URL 作为登录后的回调地址
  const getCallbackUrl = () => {
    if (typeof window === "undefined") return "/";
    return window.location.href;
  };

  return (
    <div className={cn("grid items-start gap-4", className)}>
      {/* <div className="grid gap-2">
        <Label htmlFor="email">{t("sign_modal.email_title")}</Label>
        <Input type="email" id="email" placeholder="xxx@xxx.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{t("sign_modal.password_title")}</Label>
        <Input id="password" type="password" />
      </div>
      <Button type="submit" className="w-full flex items-center gap-2">
        <SiGmail className="w-4 h-4" />
        {t("sign_modal.email_sign_in")}
      </Button> */}

      {process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" && (
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={() => {
            signIn("google", { callbackUrl: getCallbackUrl() });
          }}
        >
          <SiGoogle className="w-4 h-4" />
          {t("sign_modal.google_sign_in")}
        </Button>
      )}

      {process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true" && (
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={() => {
            signIn("github", { callbackUrl: getCallbackUrl() });
          }}
        >
          <SiGithub className="w-4 h-4" />
          {t("sign_modal.github_sign_in")}
        </Button>
      )}
      
      {/* 显示设置保留提示 */}
      {customMessage && (
        <div className="text-center mt-3">
          <p className="text-xs text-muted-foreground">
            {t("sign_modal.settings_preserved")}
          </p>
        </div>
      )}
    </div>
  );
}
