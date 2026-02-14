"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { dollarsToCents } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: {
    id: number;
    platform: string;
    amount: number;
    currency: string;
    note: string | null;
  } | null;
  onSuccess?: () => void;
}

export default function EditCostDialog({
  open,
  onOpenChange,
  cost,
  onSuccess,
}: EditCostDialogProps) {
  const t = useTranslations("admin.revenue");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    platform: "",
    amount: "",
    currency: "USD",
    note: "",
  });

  // 当cost变化时更新表单数据
  useEffect(() => {
    if (cost) {
      setFormData({
        platform: cost.platform,
        amount: (cost.amount / 100).toString(),
        currency: cost.currency,
        note: cost.note || "",
      });
    }
  }, [cost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cost) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/costs/${cost.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: formData.platform,
          amount: dollarsToCents(parseFloat(formData.amount)),
          currency: formData.currency,
          note: formData.note,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update cost");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating cost:", error);
      alert("Failed to update cost");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("edit_cost.title")}</DialogTitle>
          <DialogDescription>
            {t("edit_cost.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="platform">{t("edit_cost.platform")}</Label>
              <Input
                id="platform"
                type="text"
                value={formData.platform}
                onChange={(e) => handleChange("platform", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">{t("edit_cost.amount")}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{t("edit_cost.currency")}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleChange("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">{t("edit_cost.note")}</Label>
              <Input
                id="note"
                type="text"
                value={formData.note}
                onChange={(e) => handleChange("note", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? t("edit_cost.updating") : t("edit_cost.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
