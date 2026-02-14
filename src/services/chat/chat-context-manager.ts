import { getHistoryBySession } from "@/models/chat";
import { getMembershipLevel } from "@/services/membership";
import chatLimits from "@/configs/chat/chat-limits.json" assert { type: "json" };

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export class ChatContextManager {
  /**
   * Get conversation context with sliding window
   *
   * Logic:
   * 1. Get window size based on user level (Free: 10 rounds, Pro: 20 rounds)
   * 2. Query most recent N*2 messages (user + assistant = 1 round)
   * 3. Format as LLM message array
   */
  async getConversationContext(
    sessionId: string,
    userUuid: string
  ): Promise<ConversationMessage[]> {
    const windowSize = await this.getWindowSize(userUuid);

    // Query most recent messages (limit = windowSize * 2)
    const messages = await getHistoryBySession(
      sessionId,
      windowSize * 2,
      0,
      "asc"
    );

    // Filter out archived messages and format
    return messages
      .filter((msg) => !msg.is_archived)
      .map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content || msg.message_content || "",
      }));
  }

  /**
   * Get window size based on user level
   */
  private async getWindowSize(userUuid: string): Promise<number> {
    const level = await getMembershipLevel(userUuid);
    return (chatLimits as any)[level].context_window_size;
  }
}
