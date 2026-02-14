"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMarketingHero } from "@/components/chat/ChatMarketingHero";
import { ChatOCCarouselGallery } from "@/components/chat/ChatOCCarouselGallery";
import { MarketingIntroduction } from "@/components/marketing/MarketingIntroduction";
import { MarketingBenefits } from "@/components/marketing/MarketingBenefits";
import { MarketingHowToUse } from "@/components/marketing/MarketingHowToUse";
import { MarketingFAQ } from "@/components/marketing/MarketingFAQ";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { FeatureRecommend } from "@/components/feature-recommend/FeatureRecommend";
import AppFooter from "@/components/blocks/footer/AppFooter";

interface ChatPageData {
  title?: string;
  subtitle?: string;
  input_placeholder?: string;
  send_button?: string;
  cost_hint?: string;
  no_sessions?: string;
  streaming_indicator?: string;
  new_session?: string;
  session_list?: string;
  error_generation_failed?: string;
  insufficient_credits?: string;
  recharge_button?: string;
  select_character?: string;
  select_character_for_new_chat?: string;

  // Model selector texts
  select_model?: string;
  model_base?: string;
  model_premium?: string;
  model_base_badge?: string;
  model_premium_badge?: string;
  model_locked?: string;
  model_upgrade_required?: string;

  // Progress bar texts
  progress_conversation_rounds?: string;
  progress_tokens_used?: string;

  // Upgrade dialog texts
  upgrade_max_rounds_title?: string;
  upgrade_max_rounds_description?: string;
  upgrade_max_tokens_title?: string;
  upgrade_max_tokens_description?: string;
  upgrade_model_not_allowed_title?: string;
  upgrade_model_not_allowed_description?: string;
  upgrade_required_title?: string;
  upgrade_required_description?: string;
  upgrade_benefits_title?: string;
  upgrade_clear_chat?: string;
  upgrade_upgrade_now?: string;

  // Quota texts
  quota_monthly_quota?: string;
  quota_remaining?: string;
  quota_resets_on?: string;

  // Marketing page texts
  hero?: {
    title?: string;
    description?: string;
    tagline?: string;
  };
  hero_badges?: {
    free_monthly?: string;
    no_card?: string;
    community?: string;
    smart?: string;
  };
  introduction?: {
    title?: string;
    description?: string;
    tagline?: string;
  };
  benefits?: {
    section_title?: string;
    section_subtitle?: string;
    real_time?: {
      title?: string;
      description?: string;
    };
    multiple_characters?: {
      title?: string;
      description?: string;
    };
    contextual_memory?: {
      title?: string;
      description?: string;
    };
    community_sharing?: {
      title?: string;
      description?: string;
    };
    ai_powered?: {
      title?: string;
      description?: string;
    };
    free_monthly?: {
      title?: string;
      description?: string;
    };
    multiple_styles?: {
      title?: string;
      description?: string;
    };
    personalization?: {
      title?: string;
      description?: string;
    };
    safe_environment?: {
      title?: string;
      description?: string;
    };
  };
  how_to_use?: {
    title?: string;
    description?: string;
    step1?: {
      title?: string;
      description?: string;
    };
    step2?: {
      title?: string;
      description?: string;
    };
    step3?: {
      title?: string;
      description?: string;
    };
    step4?: {
      title?: string;
      description?: string;
    };
  };
  faq?: {
    title?: string;
    description?: string;
    q1?: {
      question?: string;
      answer?: string;
    };
    q2?: {
      question?: string;
      answer?: string;
    };
    q3?: {
      question?: string;
      answer?: string;
    };
    q4?: {
      question?: string;
      answer?: string;
    };
    q5?: {
      question?: string;
      answer?: string;
    };
    q6?: {
      question?: string;
      answer?: string;
    };
    q7?: {
      question?: string;
      answer?: string;
    };
    q8?: {
      question?: string;
      answer?: string;
    };
  };
  call_to_action?: {
    title?: string;
    description?: string;
    start_chatting?: string;
    browse_characters?: string;
  };
}

interface ChatMarketingPageClientProps {
  pageData: ChatPageData;
  characterUuid?: string;
  sessionId?: string;
  isLoggedIn?: boolean;
}

export default function ChatMarketingPageClient({
  pageData,
  characterUuid,
  sessionId,
}: ChatMarketingPageClientProps) {
  return (
    <div className="min-h-full">
      {/* Page 1: Full-screen hero section */}
      <section className="chat-hero-section">
        <ChatMarketingHero
          pageData={{
            heroTitle:
              pageData.hero?.title ||
              "Character AI Chat with Original Characters",
            heroDescription:
              pageData.hero?.description ||
              "Experience the ultimate ai character chat platform for original characters. Enjoy ai chat character free with community OCs or your creations. Our ai chat bot delivers real-time ai chat online with 500 free conversations monthly. Start your oc chat journey today!",
            heroTagline:
              pageData.hero?.tagline || "AI-Powered Character Chat Bot",
            startChatting:
              pageData.call_to_action?.start_chatting || "Start Chatting",
            signInPrompt:
              "Sign in to start chatting with your original characters",
            hero_badges: pageData.hero_badges,
          }}
        />
      </section>

      {/* OC Gallery Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <ChatOCCarouselGallery pageData={pageData} />
        </div>
      </section>

      {/* Page 2 onwards: Marketing content */}
      {/* Chat Introduction */}
      <MarketingIntroduction
        title={pageData.introduction?.title || "Why Character AI Chat with Original Characters?"}
        description={pageData.introduction?.description || "Experience the power of ai character chat with your original characters. Engage in meaningful oc chat conversations using our advanced ai chat bot. Create unique personalities and enjoy ai chat online like never before."}
        tagline={pageData.introduction?.tagline || "AI-Powered Character AI Chat"}
      />

      {/* Benefits - why use chat with ocs */}
      <MarketingBenefits
        title={pageData.benefits?.section_title || "Why Our Character AI Chat Platform is the Best"}
        subtitle={pageData.benefits?.section_subtitle || "Experience premium ai chat character features designed for original character enthusiasts"}
        benefits={[
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_1.webp",
            title: pageData.benefits?.real_time?.title || "Real-time AI Chat Online",
            description: pageData.benefits?.real_time?.description || "Experience lightning-fast responses in our ai chat online system. Engage in natural, fluid character ai chat conversations powered by cutting-edge AI technology that understands context and emotion.",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_2.webp",
            title: pageData.benefits?.multiple_characters?.title || "OC Chat with Any Original Character",
            description: pageData.benefits?.multiple_characters?.description || "Access thousands of original characters from our community or create your own. Our ai character chat platform supports unlimited ai chat character free of charge with your personal creations.",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_3.webp",
            title: pageData.benefits?.contextual_memory?.title || "Advanced Contextual Memory",
            description: pageData.benefits?.contextual_memory?.description || "Our AI chat bot remembers every detail from your oc chat conversations. Original characters develop relationships, recall past discussions, and build deeper connections over time.",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_4.webp",
            title: pageData.benefits?.community_sharing?.title || "Community-Driven AI Chats",
            description: pageData.benefits?.community_sharing?.description || "Discover amazing original characters created by our community. Share your own characters and participate in our ai chat character free ecosystem.",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_5.webp",
            title: pageData.benefits?.ai_powered?.title || "Premium AI Chat Bot Intelligence",
            description: pageData.benefits?.ai_powered?.description || "Every ai chat response is generated using advanced AI models, perfectly matching your original character's personality, background, and speaking style.",
          },
          {
            icon: "/imgs/icons/oc-maker-benefits/benefit_6.webp",
            title: pageData.benefits?.free_monthly?.title || "100 Free AI Chat Character Conversations Monthly",
            description: pageData.benefits?.free_monthly?.description || "Start chatting immediately with 500 free ai chat character conversations every month. No credit card required for basic access - pure ai chat character free experience.",
          },
        ]}
      />

      {/* How to use - Direct reuse */}
      <MarketingHowToUse
        title={pageData.how_to_use?.title || "How to Start Your AI Character Chat Journey"}
        subtitle={pageData.how_to_use?.description || "Begin your character ai chat experience in minutes with our simple process"}
        steps={[
          {
            number: "01",
            title: pageData.how_to_use?.step1?.title || "Sign Up Free - No Credit Card Required",
            description: pageData.how_to_use?.step1?.description || "Create your account to access 500 monthly free ai chat character conversations. Browse our community library of original characters or use OC Maker to craft your own unique characters.",
          },
          {
            number: "02",
            title: pageData.how_to_use?.step2?.title || "Choose Your Original Character & Start AI Chatting",
            description: pageData.how_to_use?.step2?.description || "Select from thousands of community original characters or your own creations. Our ai chat bot lets you begin oc chat conversations instantly.",
          },
          {
            number: "03",
            title: pageData.how_to_use?.step3?.title || "Build Stories Through AI Chat Character Free",
            description: pageData.how_to_use?.step3?.description || "Enjoy unlimited storytelling as your character ai chat conversations evolve. Original characters remember your history and create deeper narratives over time.",
          },
          {
            number: "04",
            title: pageData.how_to_use?.step4?.title || "Share & Discover More AI Chats Online",
            description: pageData.how_to_use?.step4?.description || "Share your best conversations with the community and discover new original characters. Our ai chat online ecosystem grows with your creativity.",
          },
        ]}
      />

      {/* 特性推荐组件 */}
      <FeatureRecommend currentSlug="chat" />


      {/* FAQ - Direct reuse */}
      <MarketingFAQ
        title={pageData.faq?.title || "Character AI Chat Frequently Asked Questions"}
        subtitle={pageData.faq?.description || "Everything you need to know about our ai character chat platform"}
        items={[
          {
            question: pageData.faq?.q1?.question || "What is Character AI Chat with Original Characters?",
            answer: pageData.faq?.q1?.answer || "Our ai character chat platform allows you to have real-time oc chat conversations with your original characters or community-shared OCs using advanced AI technology. Experience ai chat character free with 500 monthly conversations at no cost.",
          },
          {
            question: pageData.faq?.q2?.question || "How does the free AI chat character system work?",
            answer: pageData.faq?.q2?.answer || "After signing up (no credit card required), you receive 500 free ai chat character conversations monthly. Enjoy ai chat online with any OC - your creations or community original characters. Our AI chat bot remembers all conversations and responds based on character personality.",
          },
          {
            question: pageData.faq?.q3?.question || "Can I do AI chat online with multiple original characters?",
            answer: pageData.faq?.q3?.answer || "Yes! Our character ai chat platform supports unlimited oc chat with multiple original characters. Each OC maintains unique personality traits and conversation history, giving you diverse ai chat online experiences.",
          },
          {
            question: pageData.faq?.q4?.question || "Is there really a free AI chat character option?",
            answer: pageData.faq?.q4?.answer || "Absolutely! Enjoy 500 free ai chat character conversations every month with no credit card required. Our ai free chat system includes full access to character creation, community browsing, and AI responses.",
          },
          {
            question: pageData.faq?.q5?.question || "How does the credit system work after free quota?",
            answer: pageData.faq?.q5?.answer || "Start with 500 monthly free ai chat character conversations. Additional messages cost 1 credit (MC) each. Earn credits through community participation or purchase them - your ai chat online experience continues seamlessly.",
          },
          {
            question: pageData.faq?.q6?.question || "Can I access community OCs in AI chats?",
            answer: pageData.faq?.q6?.answer || "Yes! Enjoy oc chat with thousands of community-created original characters in our ai chat character free ecosystem. Discover diverse characters, from anime-style to original concepts, all ready for instant character ai chat interactions.",
          },
          {
            question: pageData.faq?.q7?.question || "How does contextual memory improve AI chats?",
            answer: pageData.faq?.q7?.answer || "Our advanced AI chat bot remembers your entire conversation history with each character. Original characters develop relationships, recall past events, and evolve their responses - creating authentic, ongoing ai chat narratives.",
          },
          {
            question: pageData.faq?.q8?.question || "Can I delete or manage my AI chat history?",
            answer: pageData.faq?.q8?.answer || "Yes, you have full control over your ai chat online data. Clear conversation history, rename chat sessions, or start fresh with any original character at any time.",
          },
        ]}
      />

      {/* CTA Section */}
      <MarketingCTA
        title={pageData.call_to_action?.title || "Ready to Start Your Character AI Chat Journey?"}
        description={pageData.call_to_action?.description || "Join thousands of users enjoying free ai chat character conversations. Create your first original character or browse community OCs - get 500 monthly ai chats character free with no credit card required. Experience ai chat online like never before. Start oc chat in under 60 seconds!"}
        buttonText={pageData.call_to_action?.start_chatting || "Start Free AI Character Chat Now"}
      />

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
