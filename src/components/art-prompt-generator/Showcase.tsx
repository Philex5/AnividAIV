"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toImageUrl } from "@/lib/r2-utils";
import { ArtPromptGeneratorPage } from "@/types/pages/art-prompt-generator";

interface ShowcaseItem {
  id: string;
  prompt: string;
  image: string;
  category: string;
}

interface ShowcaseProps {
  pageData: ArtPromptGeneratorPage;
}

export function Showcase({ pageData }: ShowcaseProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 预置的 prompt 示例及对应的图片
  const showcaseItems: ShowcaseItem[] = [
    {
      id: "showcase-1",
      prompt: "A cyberpunk cat dancing ballet in underwater ruins, pixel art style, dramatic lighting",
      image: "gallery/art-prompt-generator/showcase-1.webp",
      category: "Cyberpunk",
    },
    {
      id: "showcase-2",
      prompt: "A sleepless astronaut melting on cotton candy clouds, minimalist line art style, Rembrandt lighting",
      image: "gallery/art-prompt-generator/showcase-2.webp",
      category: "Surreal",
    },
    {
      id: "showcase-3",
      prompt: "A anthropomorphic teapot weaving starlight in a Victorian train station, oil painting style, cinematic composition",
      image: "gallery/art-prompt-generator/showcase-3.webp",
      category: "Fantasy",
    },
    {
      id: "showcase-4",
      prompt: "A cosmic whale swimming through city streets at sunset, watercolor style, ethereal glow",
      image: "gallery/art-prompt-generator/showcase-4.webp",
      category: "Dreamlike",
    },
    {
      id: "showcase-5",
      prompt: "A samurai robot meditating in cherry blossom garden, ukiyo-e style, soft pastel colors",
      image: "gallery/art-prompt-generator/showcase-5.webp",
      category: "Japanese",
    },
    {
      id: "showcase-6",
      prompt: "A steampunk owl reading ancient books in floating library, detailed illustration style, warm ambient light",
      image: "gallery/art-prompt-generator/showcase-6.webp",
      category: "Steampunk",
    },
  ];

  const handleCopyPrompt = (item: ShowcaseItem) => {
    navigator.clipboard
      .writeText(item.prompt)
      .then(() => {
        setCopiedId(item.id);
        toast.success(pageData.tool?.copy_success || "Prompt copied!");
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        toast.error(
          pageData.showcase?.copy_failed ||
            pageData.tool?.copy_failed ||
            "Failed to copy prompt"
        );
      });
  };

  const handleUseInGenerator = (item: ShowcaseItem) => {
    const params = new URLSearchParams({
      prompt: item.prompt,
      preset: "none",
    });
    router.push(`/ai-anime-generator?${params.toString()}`);
  };

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {pageData.showcase?.title || "Inspiration Gallery"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {pageData.showcase?.description ||
              "Explore creative prompt combinations and their stunning results"}
          </p>
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showcaseItems.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              <img
                src={toImageUrl(item.image)}
                alt={item.prompt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Category Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur-sm px-3 py-1 text-xs font-medium text-foreground border">
                  {item.category}
                </span>
              </div>

              {/* Prompt & Actions Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-background/95 via-background/70 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
                <p className="text-sm text-foreground line-clamp-5 mb-3">
                  {item.prompt}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    onClick={() => handleCopyPrompt(item)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    {copiedId === item.id
                      ? pageData.showcase?.copied || "Copied!"
                      : pageData.showcase?.copy_button || "Copy Prompt"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 font-medium"
                    onClick={() => handleUseInGenerator(item)}
                  >
                    {pageData.showcase?.use_in_generator_button ||
                      "Generate Same"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>

        {/* Call to Action */}
        {pageData.showcase?.cta_text && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              {pageData.showcase.cta_text}
            </p>
            <Button size="lg" asChild>
              <a href="#prompt-tool">
                {pageData.showcase.cta_button || "Try Generator"}
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
