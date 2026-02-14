import { and, asc, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { chatSessions, characterChats, characters } from "@/db/schema";
import { findCharacterByUuid } from "@/models/character";
import { CharacterModules, parseCharacterModules } from "@/types/oc";

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof characterChats.$inferSelect;
export type NewChatMessage = typeof characterChats.$inferInsert;

/**
 * Get a random greeting from character's modules.personality.greeting
 * @param character - The character object
 * @returns A random greeting string or null if no greetings available
 */
function getRandomGreeting(character: any): string | null {
  try {
    // Parse modules from character
    const modules: CharacterModules = parseCharacterModules(character.modules);

    // Get greetings array from personality module
    const greetings = modules.personality?.greeting;

    if (!greetings || !Array.isArray(greetings) || greetings.length === 0) {
      return null;
    }

    // Filter out empty greetings
    const validGreetings = greetings.filter(g => g && typeof g === "string" && g.trim().length > 0);

    if (validGreetings.length === 0) {
      return null;
    }

    // Return random greeting
    const randomIndex = Math.floor(Math.random() * validGreetings.length);
    return validGreetings[randomIndex].trim();
  } catch (error) {
    console.warn("[Chat] Failed to get random greeting:", error);
    return null;
  }
}

export async function getOrCreateSession(params: {
  userUuid: string;
  characterUuid: string;
  sessionId?: string;
  title?: string;
}): Promise<ChatSession> {
  const { userUuid, characterUuid, sessionId, title } = params;

  if (sessionId) {
    const [exist] = await db()
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.session_id, sessionId))
      .limit(1);
    if (exist) return exist;
  }

  // Auto-generate title if not provided (use character name directly for IM-like experience)
  let sessionTitle = title;
  let character: any = null;
  if (!sessionTitle) {
    character = await findCharacterByUuid(characterUuid);
    sessionTitle = character?.name || "New Chat";
  }

  const sid = randomUUID();
  const [session] = await db()
    .insert(chatSessions)
    .values({
      session_id: sid,
      user_uuid: userUuid,
      character_uuid: characterUuid,
      title: sessionTitle,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  // Add greeting message when creating new session
  try {
    // Fetch character if not already fetched
    if (!character) {
      character = await findCharacterByUuid(characterUuid);
    }

    if (character) {
      const greeting = getRandomGreeting(character);
      if (greeting) {
        // Get next index for the greeting message
        const [last] = await db()
          .select({ idx: characterChats.message_index })
          .from(characterChats)
          .where(eq(characterChats.session_id, sid))
          .orderBy(desc(characterChats.message_index))
          .limit(1);
        const nextIndex = (last?.idx || 0) + 1;

        // Insert greeting as assistant message
        await db()
          .insert(characterChats)
          .values({
            uuid: randomUUID(),
            session_id: sid,
            message_index: nextIndex,
            role: "assistant",
            content: greeting,
            message_content: greeting,
            metadata: {
              type: "greeting",
              auto_generated: true,
            },
            character_uuid: characterUuid,
            user_uuid: userUuid,
            created_at: new Date(),
            message_type: "character",
          });
      }
    }
  } catch (error) {
    // Log error but don't fail the session creation
    console.warn("[Chat] Failed to add greeting message:", error);
  }

  return session;
}

export async function listSessionsByUser(params: {
  userUuid: string;
  characterUuid?: string;
  limit?: number;
  offset?: number;
  orderBy?: "updated" | "created";
}) {
  const { userUuid, characterUuid, limit = 20, offset = 0, orderBy = "updated" } = params;
  const where = characterUuid
    ? and(eq(chatSessions.user_uuid, userUuid), eq(chatSessions.character_uuid, characterUuid))
    : eq(chatSessions.user_uuid, userUuid);

  const rows = await db()
    .select()
    .from(chatSessions)
    .where(where)
    .orderBy(orderBy === "updated" ? desc(chatSessions.updated_at) : desc(chatSessions.created_at))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function appendMessage(params: {
  userUuid: string;
  characterUuid: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any;
}) {
  const { userUuid, characterUuid, sessionId, role, content, metadata } = params;

  // Verify character exists
  const character = await findCharacterByUuid(characterUuid);
  if (!character) {
    throw new Error("Character not found");
  }

  // get next index
  const [last] = await db()
    .select({ idx: characterChats.message_index })
    .from(characterChats)
    .where(eq(characterChats.session_id, sessionId))
    .orderBy(desc(characterChats.message_index))
    .limit(1);
  const nextIndex = (last?.idx || 0) + 1;

  const [msg] = await db()
    .insert(characterChats)
    .values({
      uuid: randomUUID(),
      session_id: sessionId,
      message_index: nextIndex,
      role,
      content,
      message_content: content,
      metadata: metadata || null,
      character_uuid: characterUuid,
      user_uuid: userUuid,
      created_at: new Date(),
      message_type: role === "user" ? "user" : "character",
    })
    .returning();

  // update session counters
  await db()
    .update(chatSessions)
    .set({
      message_count: sql`${chatSessions.message_count} + 1`,
      last_message_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(chatSessions.session_id, sessionId));

  return msg;
}

export async function getHistoryBySession(sessionId: string, limit: number = 50, offset: number = 0, order: "asc" | "desc" = "asc") {
  const rows = await db()
    .select()
    .from(characterChats)
    .where(eq(characterChats.session_id, sessionId))
    .orderBy(order === "asc" ? asc(characterChats.message_index) : desc(characterChats.message_index))
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function archiveSessionMessages(sessionId: string, userUuid: string) {
  // archive all messages for this session
  await db()
    .update(characterChats)
    .set({
      is_archived: true,
    })
    .where(
      and(
        eq(characterChats.session_id, sessionId),
        eq(characterChats.user_uuid, userUuid)
      )
    );

  // reset session message count and update timestamp
  await db()
    .update(chatSessions)
    .set({
      message_count: 0,
      last_message_at: null,
      updated_at: new Date(),
    })
    .where(eq(chatSessions.session_id, sessionId));
}

/**
 * Delete a session and all its messages
 * @param sessionId - The session ID to delete
 * @param userUuid - The user UUID for ownership verification
 * @throws Error if session not found or doesn't belong to user
 */
export async function deleteSession(sessionId: string, userUuid: string): Promise<void> {
  // First verify the session belongs to the user
  const [session] = await db()
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.session_id, sessionId),
        eq(chatSessions.user_uuid, userUuid)
      )
    )
    .limit(1);

  if (!session) {
    throw new Error("Session not found or access denied");
  }

  // Delete all messages for this session (cascade via foreign key would also work)
  await db()
    .delete(characterChats)
    .where(eq(characterChats.session_id, sessionId));

  // Delete the session itself
  await db()
    .delete(chatSessions)
    .where(eq(chatSessions.session_id, sessionId));
}
