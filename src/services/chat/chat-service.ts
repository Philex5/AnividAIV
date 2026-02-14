import { z } from "zod";
import {
  getUserBalance,
  decreaseCredits,
  refundCredits,
  CreditsTransType,
} from "@/services/credit";
import chatLimits from "@/configs/chat/chat-limits.json" assert { type: "json" };
import {
  appendMessage,
  getHistoryBySession,
  getOrCreateSession,
} from "@/models/chat";
import { findCharacterByUuid } from "@/models/character";
import { ChatContextManager } from "./chat-context-manager";
import { ChatPromptBuilder } from "./chat-prompt-builder";
import { streamTextWithFallback } from "@/services/llm/llm-service";
import { getMembershipLevel } from "@/services/membership";
import { MembershipLevel } from "@/types/membership";
import { ChatQuotaService } from "./chat-quota-service";

export const SendMessageSchema = z.object({
  character_uuid: z.string().uuid("Invalid character UUID"),
  session_id: z.string().uuid("Invalid session ID").optional(),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message length cannot exceed 2000 characters"),
  stream: z.boolean().default(true),
  model: z.enum(["base", "premium"]).default("base"),
});

export class ChatService {
  private contextManager: ChatContextManager;
  private promptBuilder: ChatPromptBuilder;

  constructor(private userUuid: string) {
    this.contextManager = new ChatContextManager();
    this.promptBuilder = new ChatPromptBuilder();
  }

  async getUserChatConfig() {
    const level = await getMembershipLevel(this.userUuid);
    return {
      level,
      config: (chatLimits as any)[level],
    };
  }

  /**
   * 检查聊天限制（轮数、tokens、单轮输入）
   */
  async checkChatLimits(sessionId: string): Promise<{
    canContinue: boolean;
    rounds: number;
    tokens: number;
    error?: { code: string; message: string };
  }> {
    const { level, config } = await this.getUserChatConfig();
    const messages = await getHistoryBySession(sessionId);
    const rounds = Math.floor(messages.length / 2); // 对话轮数 = 消息数/2

    // 检查轮数限制
    if (rounds >= config.context_window_size) {
      return {
        canContinue: false,
        rounds,
        tokens: this.calculateTokens(messages),
        error: {
          code: "MAX_ROUNDS_EXCEEDED",
          message: `You have reached the maximum of ${config.context_window_size} conversation rounds. Please upgrade or clear the conversation to continue.`,
        },
      };
    }

    // 检查总tokens限制
    const totalTokens = this.calculateTokens(messages);
    if (totalTokens >= config.max_total_tokens) {
      return {
        canContinue: false,
        rounds,
        tokens: totalTokens,
        error: {
          code: "MAX_TOKENS_EXCEEDED",
          message: `You have reached the maximum token limit of ${config.max_total_tokens}. Please upgrade or clear the conversation to continue.`,
        },
      };
    }

    return {
      canContinue: true,
      rounds,
      tokens: totalTokens,
    };
  }

  /**
   * 验证模型使用权限
   */
  async validateModelPermission(model: "base" | "premium"): Promise<{
    allowed: boolean;
    requiredLevel?: string;
  }> {
    const { level, config } = await this.getUserChatConfig();
    const permissions = config.model_permissions;

    if (permissions[model]) {
      return { allowed: true };
    }

    // 确定需要什么级别的会员才能使用此模型
    const requiredLevel = model === "premium" ? "plus" : "free";
    return { allowed: false, requiredLevel };
  }

  /**
   * 计算消息的tokens数量（粗略估算）
   */
  calculateTokens(messages: any[]): number {
    // 粗略估算：1 token ≈ 4个字符
    let total = 0;
    for (const msg of messages) {
      if (msg.role !== "system") {
        total += Math.ceil((msg.content?.length || 0) / 4);
      }
    }
    return total;
  }

  /**
   * 智能裁剪历史上下文
   */
  smartTrimContext(messages: any[], maxRounds: number): any[] {
    // 保留系统提示和最近N轮对话
    const userAssistantPairs: any[] = [];
    const systemMessages: any[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemMessages.push(msg);
      } else {
        userAssistantPairs.push(msg);
      }
    }

    // 只保留最近N轮对话（N * 2条消息）
    const recentPairs = userAssistantPairs.slice(-maxRounds * 2);

    return [...systemMessages, ...recentPairs];
  }

  async sendMessage(
    input: z.infer<typeof SendMessageSchema>
  ): Promise<Response> {
    const { character_uuid, session_id, message, model = "base" } = input;

    try {
      // get session first for limit checks
      const session = await getOrCreateSession({
        userUuid: this.userUuid,
        characterUuid: character_uuid,
        sessionId: session_id,
      });

      // check chat limits before proceeding
      const limitCheck = await this.checkChatLimits(session.session_id);
      if (!limitCheck.canContinue) {
        return Response.json(
          {
            success: false,
            error: limitCheck.error,
          },
          { status: 429 }
        );
      }

      // validate model permission
      const modelPermission = await this.validateModelPermission(model);
      if (!modelPermission.allowed) {
        return Response.json(
          {
            success: false,
            error: {
              code: "MODEL_NOT_ALLOWED",
              message: `The ${model} model requires ${modelPermission.requiredLevel} membership or higher.`,
            },
          },
          { status: 403 }
        );
      }

      // permission check
      const character = await findCharacterByUuid(character_uuid);
      if (!character) {
        return Response.json(
          { success: false, error: "Character not found" },
          { status: 404 }
        );
      }
      if (
        character.visibility_level !== "public" &&
        character.user_uuid !== this.userUuid
      ) {
        return Response.json(
          {
            success: false,
            error: "You don't have permission to chat with this character",
          },
          { status: 403 }
        );
      }

      // check chat quota (new quota system)
      const quota = await ChatQuotaService.getCurrentQuota(this.userUuid);
      // Pro会员享受无限畅聊，monthly_quota = -1表示无限
      const isUnlimited = quota.monthly_quota === -1;
      if (!isUnlimited && quota.monthly_used >= quota.monthly_quota) {
        return Response.json(
          {
            success: false,
            error: {
              code: "QUOTA_EXCEEDED",
              message: `Monthly chat quota exceeded (${quota.monthly_used}/${quota.monthly_quota} AP used). Upgrade your plan to continue chatting.`,
              quota: {
                used: quota.monthly_used,
                total: quota.monthly_quota,
                reset_at: quota.quota_reset_at,
              },
            },
          },
          { status: 402 }
        );
      }

      // get user chat config for metadata
      const { level, config } = await this.getUserChatConfig();

      // persist user message (optimistic)
      await appendMessage({
        userUuid: this.userUuid,
        characterUuid: character_uuid,
        sessionId: session.session_id,
        role: "user",
        content: message,
        metadata: {
          user_level: level,
          model: model,
          max_tokens: config.max_tokens_per_round,
          timestamp: new Date().toISOString(),
        },
      });

      // get conversation context (sliding window)
      const conversationHistory =
        await this.contextManager.getConversationContext(
          session.session_id,
          this.userUuid
        );

      // build character system prompt
      const systemPrompt = this.promptBuilder.buildCharacterPrompt(character);

      // === Debug Logging: Print complete chat context ===
      console.log("\n[Chat Debug] ========================================");
      console.log("[Chat Debug] Chat Request Details");
      console.log("[Chat Debug] ========================================");
      console.log("[Chat Debug] User UUID:", this.userUuid);
      console.log("[Chat Debug] User Level:", level);
      console.log(
        "[Chat Debug] Character:",
        character.name,
        `(UUID: ${character_uuid})`
      );
      console.log("[Chat Debug] Session ID:", session.session_id);
      console.log("[Chat Debug] User Input:", message);
      console.log("[Chat Debug] ----------------------------------------");
      console.log("[Chat Debug] System Prompt (Complete):");
      console.log(systemPrompt);
      console.log("[Chat Debug] ----------------------------------------");
      console.log("[Chat Debug] Conversation History:");
      console.log(JSON.stringify(conversationHistory, null, 2));
      console.log("[Chat Debug] ========================================\n");

      // prepare request parameters
      const modelMap = {
        base: "gpt-3.5-turbo",
        premium: "gpt-4.1",
      };
      const requestParams = {
        model: modelMap[model],
        system: systemPrompt,
        messages: conversationHistory,
        temperature: 0.8,
        maxTokens: config.max_tokens_per_round,
      };

      // call LLM and wait for complete response
      const result = await streamTextWithFallback({
        model: requestParams.model,
        system: requestParams.system,
        messages: requestParams.messages,
        temperature: requestParams.temperature,
        maxTokens: requestParams.maxTokens,
        provider: "xiaojing",
        scenario: "chat",
      });

      // collect full response
      let assistantMessage = "";
      for await (const chunk of result.textStream) {
        assistantMessage += chunk;
      }

      // estimate tokens (rough approximation)
      const tokensUsed = Math.ceil(assistantMessage.length / 4);

      // === Debug Logging: Print AI response ===
      console.log("\n[Chat Debug] ========================================");
      console.log("[Chat Debug] XiaoJingAI Response");
      console.log("[Chat Debug] ========================================");
      console.log("[Chat Debug] Assistant Message:", assistantMessage);
      console.log("[Chat Debug] Estimated Tokens Used:", tokensUsed);
      console.log("[Chat Debug] ========================================\n");

      // persist assistant message with enhanced metadata
      await appendMessage({
        userUuid: this.userUuid,
        characterUuid: character_uuid,
        sessionId: session.session_id,
        role: "assistant",
        content: assistantMessage,
        metadata: {
          tokens_used: tokensUsed,
          model: requestParams.model,
          user_level: level,
          context_messages: conversationHistory.length,
          max_tokens: requestParams.maxTokens,
        },
      } as any);

      // consume quota after successful generation
      await ChatQuotaService.consumeQuota(
        this.userUuid,
        session.session_id,
        tokensUsed
      );

      // return complete response
      return Response.json({
        success: true,
        data: {
          message: assistantMessage,
          session_id: session.session_id,
          tokens_used: tokensUsed,
          model: model,
          user_level: level,
        },
      });
    } catch (e) {
      console.error("LLM call failed:", e);
      // In quota system, no refund needed on failure
      // The quota is only consumed after successful generation
      return Response.json(
        {
          success: false,
          error: "Message generation failed. Please try again.",
        },
        { status: 500 }
      );
    }
  }

  /**
   * 流式发送消息 - 实时返回响应
   */
  async *sendMessageStreamed(
    input: z.infer<typeof SendMessageSchema>
  ): AsyncGenerator<any, void, unknown> {
    const { character_uuid, session_id, message, model = "base" } = input;

    try {
      // get session first for limit checks
      const session = await getOrCreateSession({
        userUuid: this.userUuid,
        characterUuid: character_uuid,
        sessionId: session_id,
      });

      // check chat limits before proceeding
      const limitCheck = await this.checkChatLimits(session.session_id);
      if (!limitCheck.canContinue) {
        yield {
          type: "error",
          error: limitCheck.error,
        };
        return;
      }

      // validate model permission
      const modelPermission = await this.validateModelPermission(model);
      if (!modelPermission.allowed) {
        yield {
          type: "error",
          error: {
            code: "MODEL_NOT_ALLOWED",
            message: `The ${model} model requires ${modelPermission.requiredLevel} membership or higher.`,
          },
        };
        return;
      }

      // permission check
      const character = await findCharacterByUuid(character_uuid);
      if (!character) {
        yield {
          type: "error",
          error: "Character not found",
        };
        return;
      }
      if (
        character.visibility_level !== "public" &&
        character.user_uuid !== this.userUuid
      ) {
        yield {
          type: "error",
          error: "You don't have permission to chat with this character",
        };
        return;
      }

      // check chat quota (new quota system)
      const quota = await ChatQuotaService.getCurrentQuota(this.userUuid);

      const isUnlimited = quota.monthly_quota === -1;
      if (!isUnlimited && quota.monthly_used >= quota.monthly_quota) {
        yield {
          type: "error",
          error: {
            code: "QUOTA_EXCEEDED",
            message: `Monthly chat quota exceeded (${quota.monthly_used}/${quota.monthly_quota} AP used). Upgrade your plan to continue chatting.`,
            quota: {
              used: quota.monthly_used,
              total: quota.monthly_quota,
              reset_at: quota.quota_reset_at,
            },
          },
        };
        return;
      }

      // get user chat config for metadata
      const { level, config } = await this.getUserChatConfig();

      // persist user message
      await appendMessage({
        userUuid: this.userUuid,
        characterUuid: character_uuid,
        sessionId: session.session_id,
        role: "user",
        content: message,
        metadata: {
          user_level: level,
          model: model,
          max_tokens: config.max_tokens_per_round,
          timestamp: new Date().toISOString(),
        },
      });

      // get conversation context (sliding window)
      const conversationHistory =
        await this.contextManager.getConversationContext(
          session.session_id,
          this.userUuid
        );

      // build character system prompt
      const systemPrompt = this.promptBuilder.buildCharacterPrompt(character);

      // prepare request parameters
      const modelMap = {
        base: "gpt-3.5-turbo",
        premium: "gpt-4.1",
      };
      const requestParams = {
        model: modelMap[model],
        system: systemPrompt,
        messages: conversationHistory,
        temperature: 0.8,
        maxTokens: config.max_tokens_per_round,
      };

      // Initial response with session info
      yield {
        type: "session",
        session_id: session.session_id,
      };

      // Start streaming
      const result = await streamTextWithFallback({
        model: requestParams.model,
        system: requestParams.system,
        messages: requestParams.messages,
        temperature: requestParams.temperature,
        maxTokens: requestParams.maxTokens,
        provider: "xiaojing",
        scenario: "chat",
      });

      // collect full response while streaming chunks
      let assistantMessage = "";
      let chunkCount = 0;
      const chunkSize = 50; // Send partial updates every 50 chars

      for await (const chunk of result.textStream) {
        assistantMessage += chunk;
        chunkCount++;

        // Stream partial response periodically
        if (chunkCount % 3 === 0 || assistantMessage.length % chunkSize < chunk.length) {
          yield {
            type: "chunk",
            content: assistantMessage,
          };
        }
      }

      // estimate tokens (rough approximation)
      const tokensUsed = Math.ceil(assistantMessage.length / 4);

      // persist assistant message with enhanced metadata
      await appendMessage({
        userUuid: this.userUuid,
        characterUuid: character_uuid,
        sessionId: session.session_id,
        role: "assistant",
        content: assistantMessage,
        metadata: {
          tokens_used: tokensUsed,
          model: requestParams.model,
          user_level: level,
          context_messages: conversationHistory.length,
          max_tokens: requestParams.maxTokens,
        },
      } as any);

      // consume quota after successful generation
      await ChatQuotaService.consumeQuota(
        this.userUuid,
        session.session_id,
        tokensUsed
      );

      // Final response with complete data
      yield {
        type: "complete",
        data: {
          message: assistantMessage,
          session_id: session.session_id,
          tokens_used: tokensUsed,
          model: model,
          user_level: level,
        },
      };
    } catch (e) {
      console.error("LLM stream failed:", e);
      yield {
        type: "error",
        error: "Message generation failed. Please try again.",
      };
    }
  }
}
