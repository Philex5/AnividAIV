"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OCMakerPage } from "@/types/pages/landing";

type QuickGenerateResponse = {
  code: number;
  message: string;
  data?: {
    character: any;
    generation_task: { uuid: string; status: string } | null;
    ai_reasoning?: { extracted_features?: string[]; suggestions?: string[] } | null;
  };
};

export function QuickGenerationPanel(props: {
  pageData?: OCMakerPage;
  onApply: (payload: {
    character: any;
    generationTaskUuid: string | null;
  }) => void;
  onAuthRequired?: () => void;
  onFineTune?: () => void;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<QuickGenerateResponse["data"] | null>(
    null
  );

  const quickGenText = props.pageData?.quick_gen;
  if (!quickGenText) {
    throw new Error("Missing i18n keys: oc-maker.quick_gen");
  }

  const canSubmit = useMemo(() => description.trim().length > 0, [description]);

  const handleGenerate = async () => {
    if (!canSubmit || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/oc-maker/quick-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          auto_generate_image: true,
        }),
      });

      if (response.status === 401) {
        props.onAuthRequired?.();
        return;
      }

      const json = (await response.json()) as QuickGenerateResponse;
      if (!response.ok || json.code !== 0 || !json.data?.character) {
        const errMsg = (json as any)?.error || json.message || quickGenText.errors?.failed;
        throw new Error(errMsg);
      }

      setResult(json.data);
      props.onApply({
        character: json.data.character,
        generationTaskUuid: json.data.generation_task?.uuid || null,
      });

      toast.success(quickGenText.toast?.generated);
    } catch (error) {
      console.error("Quick generation failed:", error);
      toast.error(
        error instanceof Error ? error.message : quickGenText.errors?.failed
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUse = () => {
    if (!result?.character?.uuid) return;
    router.push(`/characters/${result.character.uuid}`);
  };

  const handleFineTune = () => {
    props.onFineTune?.();
    toast.message(quickGenText.toast?.prefilled);
  };

  const handleReset = () => {
    setResult(null);
    setDescription("");
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold">{quickGenText.title}</div>
        <div className="text-xs text-muted-foreground">
          {quickGenText.subtitle}
        </div>
      </div>

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={quickGenText.placeholder}
        className="min-h-20"
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGenerate} disabled={!canSubmit || isGenerating}>
          {isGenerating
            ? quickGenText.button?.generating
            : quickGenText.button?.generate}
        </Button>
        <Button variant="secondary" onClick={handleReset} disabled={isGenerating}>
          {quickGenText.button?.reset}
        </Button>
      </div>

      {result?.character && (
        <div className="rounded-md border bg-muted/20 p-3 space-y-2">
          <div className="text-sm font-medium">
            {quickGenText.result?.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {quickGenText.result?.name_label + ": "}
            <span className="text-foreground">{result.character.name}</span>
          </div>
          {result.character.brief_introduction ? (
            <div className="text-xs text-muted-foreground">
              {quickGenText.result?.intro_label + ": "}
              <span className="text-foreground">
                {result.character.brief_introduction}
              </span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={handleUse}>
              {quickGenText.actions?.use}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleFineTune}>
              {quickGenText.actions?.fine_tune}
            </Button>
            <Button size="sm" variant="outline" onClick={handleGenerate}>
              {quickGenText.actions?.regenerate}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
