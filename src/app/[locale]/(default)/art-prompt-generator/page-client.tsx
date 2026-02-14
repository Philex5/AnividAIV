"use client";

import { PromptGeneratorTool } from "@/components/art-prompt-generator/PromptGeneratorTool";
import { MarketingIntroduction } from "@/components/marketing/MarketingIntroduction";
import { MarketingHowToUse } from "@/components/marketing/MarketingHowToUse";
import { MarketingBenefits } from "@/components/marketing/MarketingBenefits";
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { Showcase } from "@/components/art-prompt-generator/Showcase";
import AppFooter from "@/components/blocks/footer/AppFooter";
import { ArtPromptGeneratorPage } from "@/types/pages/art-prompt-generator";
import { FeatureRecommend } from "@/components/feature-recommend/FeatureRecommend";


interface ArtPromptGeneratorPageClientProps {
  pageData: ArtPromptGeneratorPage;
  isLoggedIn: boolean;
}

export function ArtPromptGeneratorPageClient({
  pageData,
  isLoggedIn,
}: ArtPromptGeneratorPageClientProps) {
  // 如果用户已登录，显示简化的全屏布局
  if (isLoggedIn) {
    return (
      <div className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] bg-background lg:overflow-hidden">
        <div className="container mx-auto px-4 py-4 lg:py-8 h-full">
          <PromptGeneratorTool pageData={pageData} className="h-full" />
        </div>
      </div>
    );
  }

  // 如果用户未登录，显示完整的营销页面布局
  return (
    <div className="min-h-full bg-background">
      {/* 第一页：全屏工具体验 */}
      <section className="min-h-[calc(100svh-56px)] lg:h-[calc(100vh-56px)] lg:overflow-hidden">
        <div className="container mx-auto px-4 py-4 lg:py-8 h-full">
          <PromptGeneratorTool pageData={pageData} className="h-full" />
        </div>
      </section>

      {/* 第二页开始：营销组件 */}
      <div className="container mx-auto px-4 space-y-16 md:space-y-24 py-16">
        {/* Showcase - 展示预置 prompt 结果 */}
        <Showcase pageData={pageData} />

        {/* Introduction - 功能介绍 */}
        <MarketingIntroduction
          title={pageData.introduction?.title || "Art Prompt Generator"}
          description={pageData.introduction?.description || ""}
          tagline={pageData.introduction?.tagline || "Unlock Your Creativity"}
        />

        {/* How to Use - 使用步骤 */}
        <MarketingHowToUse
          title={pageData.how_to_use?.title || "How to Use"}
          steps={pageData.how_to_use?.steps?.map((step, index) => ({
            number: `0${index + 1}`,
            title: step.title,
            description: step.description,
          })) || []}
        />

        {/* Benefits - 核心优势 */}
        <MarketingBenefits
          title={pageData.benefits?.title || "Why Use Our Art Prompt Generator?"}
          subtitle={pageData.benefits?.eyebrow}
          benefits={pageData.benefits?.items?.map((item, index) => ({
            icon: `/imgs/icons/anime-benefits/benefit_${(index % 6) + 1}.webp`, // Use anime icons as placeholder
            title: item.title,
            description: item.description,
          })) || []}
        />

      {/* 特性推荐组件 */}
      <FeatureRecommend currentSlug="chat" />

        {/* FAQ - 常见问题 */}
        <MarketingFAQ
          title={pageData.faq?.title || "Frequently Asked Questions"}
          subtitle={pageData.faq?.eyebrow}
          items={pageData.faq?.items || []}
        />

        {/* CTA Section - 行动号召 */}
        <MarketingCTA
          title={pageData.cta?.title || "Ready to Generate Art Prompts?"}
          description={pageData.cta?.description || "Start creating amazing AI art prompts today."}
          buttonText={pageData.cta?.primary_button || "Start Generating"}
        />
      </div>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
