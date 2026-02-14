import characterChatConfig from "@/configs/prompts/character-chat.json" assert { type: "json" };
import type { Character } from "@/models/character";
import { parseCharacterModules, CharacterModules } from "@/types/oc";

export class ChatPromptBuilder {
  /**
   * Build character system prompt
   *
   * Variable replacement:
   * {character_name} → character.name
   * {character_age} → character.age
   * {character_gender} → character.gender
   * {character_species} → character.species
   * {role} → character.role
   * {personality_tags} → formatted personality description
   * {background_story} → modules.background.background_story
   * {speaking_style_section} → inferred speaking style from quotes
   * {behavioral_guidance} → behavioral patterns based on personality
   * {example_quotes_section} → character quotes as style reference
   */
  buildCharacterPrompt(character: Character): string {
    const template = characterChatConfig.system_prompt_template;

    const modules = parseCharacterModules(character.modules);
    const personalityDescription = this.buildPersonalityDescription(
      (modules.personality?.personality_tags as string[] | undefined) ||
        (character.personality_tags as string[] | null)
    );

    const fallbackBackground =
      "This character has an interesting background waiting to be discovered through conversation.";
    const backgroundStory =
      modules.background?.background_story || fallbackBackground;

    // Build new sections
    const speakingStyleSection = this.buildSpeakingStyleSection(modules);
    const behavioralGuidance = this.buildBehavioralGuidance(modules);
    const exampleQuotesSection = this.buildExampleQuotesSection(modules);

    return template
      .replace("{character_name}", character.name || "Character")
      .replace("{character_age}", character.age?.toString() || "unknown")
      .replace("{character_gender}", character.gender || "unknown")
      .replace("{character_species}", character.species || "human")
      .replace("{role}", character.role || "individual")
      .replace("{personality_tags}", personalityDescription)
      .replace("{background_story}", backgroundStory)
      .replace("{speaking_style_section}", speakingStyleSection)
      .replace("{behavioral_guidance}", behavioralGuidance)
      .replace("{example_quotes_section}", exampleQuotesSection);
  }

  /**
   * Build personality description from tags
   */
  private buildPersonalityDescription(tags: string[] | null): string {
    if (!tags || tags.length === 0) {
      return "friendly, approachable";
    }
    return tags.join(", ");
  }

  /**
   * Build speaking style section from quotes and personality
   * Analyzes quotes to infer speaking patterns
   */
  private buildSpeakingStyleSection(modules: CharacterModules): string {
    const quotes = modules.personality?.quotes;
    const tags = modules.personality?.personality_tags || [];
    const extendedAttrs = modules.personality?.extended_attributes || {};

    const styleParts: string[] = [];

    // Infer speaking style from personality tags
    if (tags.includes("Tsundere")) {
      styleParts.push("Speaks in a tsundere manner - initially cold or harsh but occasionally shows warmth");
    } else if (tags.includes("Kuudere")) {
      styleParts.push("Speaks in a calm, cool, and collected manner with minimal emotion");
    } else if (tags.includes("Yandere")) {
      styleParts.push("Speaks sweetly but with underlying intensity and possessiveness");
    } else if (tags.includes("Genki")) {
      styleParts.push("Speaks with high energy, enthusiasm, and many exclamation marks");
    } else if (tags.includes("Dandere")) {
      styleParts.push("Speaks quietly and shyly, opening up more as trust builds");
    } else if (tags.includes("Shy")) {
      styleParts.push("Speaks hesitantly, often using soft language and sometimes stuttering");
    } else if (tags.includes("Confident") || tags.includes("Bold")) {
      styleParts.push("Speaks with confidence and directness");
    } else if (tags.includes("Polite")) {
      styleParts.push("Speaks formally and respectfully");
    }

    // Analyze quotes for additional style cues
    if (quotes && quotes.length > 0) {
      const quoteAnalysis = this.analyzeQuotesForStyle(quotes);
      if (quoteAnalysis) {
        styleParts.push(quoteAnalysis);
      }
    }

    // Check for extended attributes
    if (extendedAttrs.MBTI) {
      const mbtiStyle = this.getMBTISpeakingStyle(extendedAttrs.MBTI as string);
      if (mbtiStyle) styleParts.push(mbtiStyle);
    }

    if (styleParts.length === 0) {
      return "Speaking Style: Natural and conversational";
    }

    return `Speaking Style: ${styleParts.join(". ")}.`;
  }

  /**
   * Analyze quotes to infer speaking style
   */
  private analyzeQuotesForStyle(quotes: string[]): string {
    const hasExclamations = quotes.some(q => q.includes("!"));
    const hasEllipses = quotes.some(q => q.includes("..."));
    const avgLength = quotes.reduce((sum, q) => sum + q.length, 0) / quotes.length;

    const cues: string[] = [];

    if (hasExclamations) {
      cues.push("uses exclamations to show emotion");
    }
    if (hasEllipses) {
      cues.push("pauses thoughtfully in speech");
    }
    if (avgLength > 50) {
      cues.push("tends to give longer, detailed responses");
    } else if (avgLength < 20) {
      cues.push("speaks in short, direct phrases");
    }

    return cues.length > 0 ? cues.join(", ") : "";
  }

  /**
   * Get speaking style based on MBTI type
   */
  private getMBTISpeakingStyle(mbti: string): string {
    const styleMap: Record<string, string> = {
      "INTJ": "speaks precisely and analytically, often looking at the big picture",
      "INTP": "speaks thoughtfully with questions and theories",
      "ENTJ": "speaks directly and confidently, often taking lead",
      "ENTP": "speaks enthusiastically with many ideas and possibilities",
      "INFJ": "speaks insightfully about deeper meanings and connections",
      "INFP": "speaks with warmth about values and feelings",
      "ENFJ": "speaks inspiringly about people and possibilities",
      "ENFP": "speaks with excitement about ideas and connections",
      "ISTJ": "speaks factually and practically",
      "ISFJ": "speaks kindly about details and people's needs",
      "ESTJ": "speaks clearly and decisively about action",
      "ESFJ": "speaks warmly about people and harmony",
      "ISTP": "speaks concisely about practical solutions",
      "ISFP": "speaks gently about experiences and feelings",
      "ESTP": "speaks directly about immediate action",
      "ESFP": "speaks energetically about present experiences",
    };

    return styleMap[mbti.toUpperCase()] || "";
  }

  /**
   * Build behavioral guidance based on personality traits
   */
  private buildBehavioralGuidance(modules: CharacterModules): string {
    const tags = modules.personality?.personality_tags || [];
    const guidance: string[] = [];

    // Behavioral patterns based on personality
    if (tags.includes("Shy") || tags.includes("Dandere")) {
      guidance.push("May hesitate before sharing personal thoughts");
      guidance.push("Gradually opens up as the conversation progresses");
    } else if (tags.includes("Tsundere")) {
      guidance.push("May act dismissive initially but shows care through actions");
      guidance.push("Gets flustered when kindness is pointed out");
    } else if (tags.includes("Genki") || tags.includes("Cheerful")) {
      guidance.push("Brings positive energy to conversations");
      guidance.push("Expresses enthusiasm with actions and exclamations");
    } else if (tags.includes("Mysterious")) {
      guidance.push("Speaks somewhat vaguely about own past");
      guidance.push("Reveals information slowly over time");
    } else if (tags.includes("Serious")) {
      guidance.push("Responds thoughtfully and considers words carefully");
      guidance.push("Shows dry humor occasionally");
    }

    // Add general guidance if no specific traits matched
    if (guidance.length === 0) {
      guidance.push("Responds naturally to conversation flow");
      guidance.push("Shows interest in learning about the user");
    }

    // Add interest-based guidance if available
    const extendedAttrs = modules.personality?.extended_attributes || {};
    if (extendedAttrs.Likes) {
      const likes = Array.isArray(extendedAttrs.Likes)
        ? extendedAttrs.Likes
        : [extendedAttrs.Likes];
      if (likes.length > 0) {
        guidance.push(`Has interests including: ${likes.join(", ")}`);
        guidance.push("Willingly discusses these but also curious about user's interests");
      }
    }

    return `Behavioral Patterns:\n${guidance.map(g => `- ${g}`).join("\n")}`;
  }

  /**
   * Build example quotes section for style reference
   */
  private buildExampleQuotesSection(modules: CharacterModules): string {
    const quotes = modules.personality?.quotes;

    if (!quotes || quotes.length === 0) {
      return "";
    }

    return `\nCharacter Quotes (for style reference):\n${quotes.map(q => `- "${q}"`).join("\n")}`;
  }
}
