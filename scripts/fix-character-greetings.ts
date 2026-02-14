/**
 * Fix Character Greetings Script
 *
 * This script generates missing or invalid greeting fields for characters.
 * It uses LLM to generate 3 greeting phrases based on the character's complete information.
 *
 * Usage:
 *   npx tsx scripts/fix-character-greetings.ts
 *   npx tsx scripts/fix-character-greetings.ts --limit 10
 *   npx tsx scripts/fix-character-greetings.ts --uuid <character-uuid>
 */

import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getStandaloneDb } from "./db-standalone";
import { characters } from "../src/db/schema";
import { z } from "zod";
import type { Character } from "../src/models/character";

// Load environment variables BEFORE importing any config modules
config({ path: ".env", override: true });
config({ path: ".env.development", override: true });
config({ path: ".env.local", override: true });

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit"));
const uuidArg = args.find((a) => a.startsWith("--uuid"));
const limit = limitArg ? parseInt(limitArg.split("=")[1]) || undefined : undefined;
const targetUuid = uuidArg ? uuidArg.split("=")[1] : undefined;

interface CharacterWithModules extends Character {
  modules: any;
}

/**
 * Check if greeting field needs to be fixed
 * - Missing (null or undefined)
 * - Empty array
 * - String type (old format)
 * - Array contains empty strings
 */
function needsGreetingFix(modules: any): boolean {
  if (!modules) return true;

  const greeting = modules?.personality?.greeting;

  // Missing
  if (greeting === null || greeting === undefined) return true;

  // Old format: string
  if (typeof greeting === "string") return true;

  // Array but empty
  if (Array.isArray(greeting) && greeting.length === 0) return true;

  // Array but contains only empty strings
  if (
    Array.isArray(greeting) &&
    greeting.length > 0 &&
    greeting.every((g) => typeof g !== "string" || g.trim() === "")
  ) {
    return true;
  }

  return false;
}

/**
 * Build character info for LLM prompt
 */
function buildCharacterInfo(character: CharacterWithModules): string {
  const mods = character.modules || {};
  const appearance = mods.appearance || {};
  const personality = mods.personality || {};
  const background = mods.background || {};
  const skills = mods.skills || {};

  const parts: string[] = [];

  // Basic info
  parts.push(`Name: ${character.name}`);
  parts.push(`Gender: ${character.gender}`);
  if (character.age) parts.push(`Age: ${character.age}`);
  if (character.role) parts.push(`Role: ${character.role}`);
  if (character.species) parts.push(`Species: ${character.species}`);

  // Appearance
  if (appearance.body_type) parts.push(`Body Type: ${appearance.body_type}`);
  if (appearance.hair_color) parts.push(`Hair Color: ${appearance.hair_color}`);
  if (appearance.hair_style) parts.push(`Hair Style: ${appearance.hair_style}`);
  if (appearance.eye_color) parts.push(`Eye Color: ${appearance.eye_color}`);
  if (appearance.outfit_style) parts.push(`Outfit: ${appearance.outfit_style}`);
  if (appearance.accessories?.length) {
    parts.push(`Accessories: ${appearance.accessories.join(", ")}`);
  }
  if (appearance.appearance_features?.length) {
    parts.push(`Features: ${appearance.appearance_features.join(", ")}`);
  }

  // Personality
  if (personality.personality_tags?.length) {
    parts.push(`Personality Traits: ${personality.personality_tags.join(", ")}`);
  }
  if (personality.extended_attributes && Object.keys(personality.extended_attributes).length > 0) {
    const attrs = Object.entries(personality.extended_attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    parts.push(`Extended Attributes: ${attrs}`);
  }
  if (personality.quotes?.length) {
    parts.push(`Sample Quotes: ${personality.quotes.slice(0, 2).join("; ")}`);
  }

  // Background
  if (background.brief_introduction) {
    parts.push(`Brief Introduction: ${background.brief_introduction}`);
  }

  // Skills (brief)
  if (skills.abilities?.length) {
    const abilityNames = skills.abilities.map((a: any) => a.name).filter(Boolean).slice(0, 3);
    if (abilityNames.length > 0) {
      parts.push(`Abilities: ${abilityNames.join(", ")}`);
    }
  }

  return parts.join("\n");
}

/**
 * Generate greetings using LLM
 */
const GreetingSchema = z.object({
  greetings: z
    .array(z.string())
    .min(3)
    .max(3)
    .describe("Array of exactly 3 different greeting phrases"),
});

async function generateGreetings(characterInfo: string): Promise<string[]> {
  // Determine which provider to use
  const xiaojingKey = process.env.XIAOJING_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!xiaojingKey && !openrouterKey) {
    throw new Error("No LLM API key found. Please set XIAOJING_API_KEY or OPENROUTER_API_KEY environment variable.");
  }

  const useXiaojing = !!xiaojingKey;

  const baseURL = useXiaojing
    ? "https://api.open.xiaojingai.com/v1"
    : "https://openrouter.ai/api/v1";

  const apiKey = useXiaojing ? xiaojingKey : openrouterKey;
  const modelName = useXiaojing ? "gpt-4o-mini" : "openai/gpt-4o-mini";

  const systemPrompt = `You are a creative writer specializing in anime character dialogue. Generate exactly 3 different, unique greeting phrases that a character would say when starting a conversation.

Requirements:
- Each greeting should reflect the character's personality and background
- Greetings should be concise (10-30 words each)
- Use appropriate tone based on the character (formal, casual, friendly, mysterious, etc.)
- Vary the greeting styles (e.g., one casual, one formal, one enthusiastic)
- Output MUST be valid JSON only, no markdown`;

  const userPrompt = `Based on the following character information, generate 3 different greeting phrases for chat conversations:

${characterInfo}

Return a JSON object with this structure:
{
  "greetings": ["greeting 1", "greeting 2", "greeting 3"]
}`;

  try {
    const client = createOpenAI({
      baseURL,
      apiKey,
    });

    const { text } = await generateText({
      model: client(modelName),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
      maxTokens: 500,
    });

    // Parse JSON response
    const raw = text.trim();
    let jsonText = raw;

    // Extract JSON if there's extra text
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      jsonText = raw.slice(start, end + 1);
    }

    const parsed = JSON.parse(jsonText);
    const result = GreetingSchema.parse(parsed);

    return result.greetings;
  } catch (error) {
    console.error("Failed to generate greetings:", error);
    throw error;
  }
}

/**
 * Process a single character
 */
async function processCharacter(db: any, character: CharacterWithModules): Promise<boolean> {
  console.log(`\nProcessing: ${character.name} (${character.uuid})`);

  try {
    // Build character info
    const characterInfo = buildCharacterInfo(character);
    console.log("Character info:", characterInfo);

    // Generate greetings
    console.log("Generating greetings...");
    const greetings = await generateGreetings(characterInfo);
    console.log("Generated greetings:", greetings);

    // Update modules
    const modules = character.modules || {};
    if (!modules.personality) {
      modules.personality = {};
    }
    modules.personality.greeting = greetings;

    // Update database
    await db
      .update(characters)
      .set({
        modules,
        updated_at: new Date(),
      })
      .where(eq(characters.uuid, character.uuid));

    console.log(`✓ Successfully updated ${character.name}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to process ${character.name}:`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const db = getStandaloneDb();

  console.log("=".repeat(60));
  console.log("Character Greeting Fix Script");
  console.log("=".repeat(60));

  let query = sql`
    SELECT uuid, name, gender, age, role, species, brief_introduction, personality_tags, modules
    FROM characters
  `;

  if (targetUuid) {
    query = sql`${query} WHERE uuid = ${targetUuid}`;
  }

  if (limit) {
    query = sql`${query} LIMIT ${limit}`;
  }

  const result = await db.execute(query);
  const allCharacters = result as CharacterWithModules[];

  console.log(`Found ${allCharacters.length} character(s) to check`);

  const needsFix: CharacterWithModules[] = [];

  for (const char of allCharacters) {
    if (needsGreetingFix(char.modules)) {
      needsFix.push(char);
      console.log(`- ${char.name} (${char.uuid}): needs greeting fix`);
    }
  }

  console.log(`\n${needsFix.length} character(s) need greeting fix`);

  if (needsFix.length === 0) {
    console.log("No characters need fixing. Exiting.");
    return;
  }

  // Confirm
  if (!targetUuid) {
    console.log("\nPress Ctrl+C to cancel, or wait 3 seconds to continue...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Process each character
  let successCount = 0;
  let failCount = 0;

  for (const character of needsFix) {
    const success = await processCharacter(db, character);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  Total processed: ${needsFix.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log("=".repeat(60));

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
