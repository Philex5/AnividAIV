"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiErrorWarningLine, RiDeleteBin6Line } from "react-icons/ri";

interface DangerZoneTabProps {
  userUuid: string;
}

export default function DangerZoneTab({ userUuid }: DangerZoneTabProps) {
  const handleDeleteAccount = () => {
    // TODO: 实现账户删除逻辑
    alert("Account deletion functionality will be implemented");
  };

  return (
    <div className="glass-card rounded-3xl p-8 border-destructive/20">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-destructive/10 rounded-xl">
          <RiErrorWarningLine className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-destructive">Danger Zone</h2>
      </div>

      <div className="space-y-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <h3 className="font-bold text-destructive flex items-center gap-2">
              <RiErrorWarningLine className="h-5 w-5" />
              Critical Warning
            </h3>
            <p className="text-sm text-destructive/80 font-medium leading-relaxed">
              The following operations are irreversible. Once confirmed, your data cannot be recovered. Please proceed with extreme caution.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-extrabold text-lg">Delete My Account</h4>
            <p className="text-muted-foreground text-sm font-medium">
              Deleting your account will permanently remove all your data including:
            </p>
            <ul className="text-sm text-muted-foreground/80 space-y-2 ml-1">
              {[
                "User profile and security settings",
                "All AI generated images and videos",
                "Credits balance and full order history",
                "Original characters (OCs) and chat archives"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive/40" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="pt-4 border-t border-border/40">
            <Button 
              variant="destructive" 
              className="gap-2 rounded-full px-8 font-bold shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-all active:scale-95"
              onClick={handleDeleteAccount}
            >
              <RiDeleteBin6Line className="h-5 w-5" />
              Delete My Account Permanently
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}