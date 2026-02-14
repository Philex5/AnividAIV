"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { dollarsToCents } from "@/lib/currency";

interface AddCostDialogProps {
  onSuccess?: () => void;
}

export default function AddCostDialog({ onSuccess }: AddCostDialogProps) {
  const t = useTranslations("admin.revenue");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    month: "",
    platform: "",
    amount: "",
    currency: "USD",
    note: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/costs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: formData.month,
          platform: formData.platform,
          amount: dollarsToCents(parseFloat(formData.amount)),
          currency: formData.currency,
          note: formData.note,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add cost");
      }

      setOpen(false);
      setFormData({
        month: "",
        platform: "",
        amount: "",
        currency: "USD",
        note: "",
      });
      onSuccess?.();
    } catch (error) {
      console.error("Error adding cost:", error);
      alert("Failed to add cost");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("costs.add_cost")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("costs.add_cost")}</DialogTitle>
          <DialogDescription>
            Add a new cost entry for a specific month and platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="month">Month (YYYY-MM)</Label>
              <Input
                id="month"
                type="text"
                placeholder="2025-01"
                value={formData.month}
                onChange={(e) => handleChange("month", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="platform">Platform</Label>
              <Input
                id="platform"
                type="text"
                placeholder="AWS, OpenAI, etc."
                value={formData.platform}
                onChange={(e) => handleChange("platform", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="100.00"
                value={formData.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
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
              <Label htmlFor="note">Note (Optional)</Label>
              <Input
                id="note"
                type="text"
                placeholder="Additional notes"
                value={formData.note}
                onChange={(e) => handleChange("note", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Cost"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
