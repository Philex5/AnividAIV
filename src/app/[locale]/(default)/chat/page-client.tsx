"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import CharacterSelector from "@/components/chat/CharacterSelector";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import { UpgradeDialog } from "@/components/chat/UpgradeDialog";
import { SessionListItem } from "@/components/chat/SessionListItem";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import { toImageUrl } from "@/lib/r2-utils";
import { ChatQuotaProvider } from "@/contexts/ChatQuotaContext";
import { useLocale } from "next-intl";

// Helper function to build chat URLs safely
// Note: Chat now uses /chat/[uuid] route instead of /chat/[uuid]
function buildChatUrl(charUuid?: string, sessId?: string): string {
  if (!charUuid) return "/chat";

  const params = new URLSearchParams();
  if (sessId) params.set("session_id", sessId);
  const queryString = params.toString();
  return `/chat/${charUuid}${queryString ? `?${queryString}` : ""}`;
}

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

  // Empty state texts
  empty_state?: {
    title?: string;
    description?: string;
    chat_with_oc?: string;
    explore_community?: string;
  };

  // Session management texts
  session?: {
    delete?: string;
    delete_confirm_title?: string;
    delete_confirm_message?: string;
    delete_confirm_button?: string;
    delete_cancel_button?: string;
    deleted?: string;
    msgs?: string;
  };
}

interface SessionWithCharacter {
  session_id: string;
  character_uuid: string;
  character_name: string;
  character_avatar: string | null;
  title: string | null;
  message_count: number;
  updated_at: string;
}

export default function ChatWithCharacterClient({
  pageData,
  characterUuid,
  sessionId: initialSessionId,
  isLoggedIn = true,
}: {
  pageData: ChatPageData;
  characterUuid?: string;
  sessionId?: string;
  isLoggedIn?: boolean;
}) {
  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const locale = useLocale();
  const [messages, setMessages] = useState<
    {
      role: "user" | "assistant";
      content: string;
      created_at?: string;
      is_streaming?: boolean;
    }[]
  >([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sessions, setSessions] = useState<SessionWithCharacter[]>([]);
  const [character, setCharacter] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number | undefined>(undefined);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showMobileSessions, setShowMobileSessions] = useState(false);

  // New states for refined features
  const [currentModel, setCurrentModel] = useState<"base" | "premium">("base");
  const [userLevel, setUserLevel] = useState<string>("free");
  const [chatConfig, setChatConfig] = useState<any>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(["base"]);
  const [conversationRounds, setConversationRounds] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeErrorCode, setUpgradeErrorCode] = useState<string | undefined>();
  const [messageSentTrigger, setMessageSentTrigger] = useState(0);

  // Use useCallback to memoize the trigger function to prevent unnecessary re-renders
  const handleMessageSent = useCallback(() => {
    setMessageSentTrigger(prev => prev + 1);
  }, []);

  async function loadSessions() {
    try {
      // Load all sessions (no character_uuid filter)
      const res = await fetch(`/api/chat/sessions`);
      const json = await res.json();
      if (json?.success) setSessions(json.data.sessions || []);
    } catch {}
  }

  async function loadCharacter() {
    if (!characterUuid) {
      console.log("[Chat] No character UUID provided");
      setCharacter(null);
      return;
    }

    console.log("[Chat] Loading character:", characterUuid);
    try {
      const res = await fetch(`/api/oc-maker/characters/${characterUuid}`);
      const json = await res.json();
      console.log("[Chat] Character API response:", json);

      // API returns { code: 0, message: "ok", data: character }
      if (json?.code === 0 && json?.data) {
        const characterData = json.data;
        console.log("[Chat] Character data loaded:", characterData);

        // Fetch avatar URL using dedicated avatar API
        try {
          const avatarRes = await fetch(
            `/api/characters/${characterUuid}/avatar?device=mobile`
          );
          if (avatarRes.ok) {
            const avatarJson = await avatarRes.json();
            console.log("[Chat] Avatar API response:", avatarJson);
            if (avatarJson?.success && avatarJson?.data?.url) {
              characterData.avatar_url = avatarJson.data.url;
              console.log("[Chat] Avatar URL set:", characterData.avatar_url);
            }
          } else {
            console.warn("[Chat] Avatar API returned non-OK status:", avatarRes.status);
          }
        } catch (avatarError) {
          console.warn("[Chat] Failed to load character avatar:", avatarError);
          // Continue without avatar - not a fatal error
        }

        setCharacter(characterData);
      } else {
        console.error("[Chat] Invalid API response format:", json);
        // Even if API fails, set a minimal character object
        setCharacter({
          uuid: characterUuid,
          name: "Unknown Character",
          avatar_url: null,
        });
      }
    } catch (error) {
      console.error("Failed to load character:", error);
      // Set minimal character object on error
      setCharacter({
        uuid: characterUuid,
        name: "Unknown Character",
        avatar_url: null,
      });
    }
  }

  async function loadUserCredits() {
    try {
      const res = await fetch("/api/get-user-balance");
      const json = await res.json();
      if (json?.code === 0 && typeof json.data?.balance === "number") {
        setUserCredits(json.data.balance);
      }
    } catch {}
  }

  async function loadChatConfig() {
    try {
      const res = await fetch("/api/chat/config");
      const json = await res.json();
      if (json?.success && json.data) {
        setChatConfig(json.data.config);
        setUserLevel(json.data.user_level);
        setAvailableModels(json.data.available_models || ["base"]);

        // Set default model based on permissions
        if (json.data.available_models?.includes("premium")) {
          setCurrentModel("premium");
        } else {
          setCurrentModel("base");
        }
      }
    } catch (error) {
      console.error("Failed to load chat config:", error);
    }
  }

  async function loadUserInfo() {
    try {
      const res = await fetch("/api/get-user-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json?.data) {
        setUserAvatar(json.data.avatar_url || null);
      }
    } catch {}
  }

  async function loadHistory(sessId: string) {
    if (!sessId) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/chat/history?session_id=${sessId}`);
      const json = await res.json();
      if (json?.success && json.data?.messages) {
        // Map the history messages to our message format
        const historyMessages = json.data.messages.map((msg: any) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          created_at: msg.created_at,
          is_streaming: false,
        }));
        setMessages(historyMessages);

        // Calculate conversation rounds and tokens from history
        const rounds = Math.floor(historyMessages.length / 2);
        const tokens = calculateTokensFromHistory(historyMessages);
        setConversationRounds(rounds);
        setTokensUsed(tokens);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  /**
   * Calculate total tokens from conversation history
   * Rough estimation: 1 token ≈ 4 characters (matching server-side logic)
   */
  function calculateTokensFromHistory(messages: any[]): number {
    let total = 0;
    for (const msg of messages) {
      if (msg.role !== "system" && msg.content) {
        total += Math.ceil(msg.content.length / 4);
      }
    }
    return total;
  }

  // Load sessions and user info on mount
  useEffect(() => {
    loadSessions();
    loadUserCredits();
    loadUserInfo();
    loadChatConfig();
  }, []);

  // Load character when character UUID changes
  useEffect(() => {
    if (characterUuid) {
      loadCharacter();
    } else {
      setCharacter(null);
    }
  }, [characterUuid]);

  // Load history when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadHistory(sessionId);
    } else {
      // Clear messages when starting a new session
      setMessages([]);
    }
  }, [sessionId]);

  async function sendMessage(messageContent: string) {
    if (!characterUuid || !messageContent.trim()) return;
    setIsStreaming(true);

    // Add user message
    setMessages((m) => [
      ...m,
      {
        role: "user",
        content: messageContent,
        created_at: new Date().toISOString(),
      },
    ]);

    // Add empty assistant message placeholder for "thinking" animation
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content: "",
        is_streaming: true,
      },
    ]);

    try {
      const res = await fetch("/api/chat/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_uuid: characterUuid,
          session_id: sessionId || undefined,
          message: messageContent,
          model: currentModel,
        }),
      });

      if (!res.ok) {
        // Handle non-200 responses
        const errorData = await res.json();
        const errorCode = errorData.error?.code;
        if (errorCode && ["MAX_ROUNDS_EXCEEDED", "MAX_TOKENS_EXCEEDED", "MODEL_NOT_ALLOWED", "QUOTA_EXCEEDED"].includes(errorCode)) {
          setUpgradeErrorCode(errorCode);
          setShowUpgradeDialog(true);
        }
        setMessages((m) => m.slice(0, -2));
        setIsStreaming(false);
        return;
      }

      // ✅ Handle streaming response with SSE
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";
      let finalSessionId: string | undefined;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const dataStr = line.slice(6).trim();

          // Skip non-JSON SSE markers like "[DONE]"
          if (dataStr === "[DONE]" || dataStr === "") {
            continue;
          }

          try {
            const data = JSON.parse(dataStr);

            if (data.type === "session") {
              // Session info received
              finalSessionId = data.session_id;
            } else if (data.type === "chunk") {
              // Partial content update
              accumulatedContent = data.content || "";
              setMessages((m) => {
                const copy = [...m];
                if (copy[copy.length - 1]?.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...copy[copy.length - 1],
                    content: accumulatedContent,
                    is_streaming: true,
                  };
                }
                return copy;
              });
            } else if (data.type === "complete") {
              // Final complete response
              const completeData = data.data;
              finalSessionId = completeData.session_id;

              setMessages((m) => {
                const copy = [...m];
                if (copy[copy.length - 1]?.role === "assistant") {
                  copy[copy.length - 1] = {
                    role: "assistant",
                    content: completeData.message,
                    is_streaming: false,
                    created_at: new Date().toISOString(),
                  };
                }

                // Calculate accurate rounds and tokens from final messages
                const rounds = Math.floor(copy.length / 2);
                const tokens = calculateTokensFromHistory(copy);
                setConversationRounds(rounds);
                setTokensUsed(tokens);

                return copy;
              });

              // Update session and reload data
              if (finalSessionId) {
                setSessionId(finalSessionId);
              }
              loadSessions();
              loadUserCredits();
              loadChatConfig();

              // Trigger quota refresh
              setMessageSentTrigger(prev => prev + 1);

              setIsStreaming(false);
            } else if (data.type === "error") {
              // Handle stream errors
              setMessages((m) => m.slice(0, -2));
              setIsStreaming(false);
              return;
            }
          } catch (parseError) {
            // Skip parse errors for unknown SSE formats like "[DONE]"
            if (dataStr !== "[DONE]") {
              console.error("Failed to parse SSE data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove the last two messages (user + assistant placeholder) on error
      setMessages((m) => m.slice(0, -2));
      setIsStreaming(false);
    }
  }

  const handleCharacterSelect = async (uuid: string) => {
    setShowCharacterSelector(false);

    try {
      // Create a new session immediately
      const res = await fetch("/api/chat/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character_uuid: uuid }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.session_id) {
          // Navigate with session_id
          window.location.href = buildChatUrl(uuid, json.data.session_id);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    }

    // Fallback: navigate without session_id
    window.location.href = buildChatUrl(uuid);
  };

  const handleClearChat = async () => {
    if (!sessionId) return;
    try {
      await fetch(`/api/chat/sessions/${sessionId}/clear`, {
        method: "POST",
      });
      setMessages([]);
      setConversationRounds(0);
      setTokensUsed(0);
      setShowUpgradeDialog(false);
      loadChatConfig();
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  };

  const handleUpgrade = () => {
    window.location.href = "/pricing";
  };

  return (
    <ChatQuotaProvider>
      <div className="flex h-[calc(100vh-72px)] overflow-hidden relative">
        {/* Character Selector Dialog */}
        <Dialog
          open={showCharacterSelector}
          onOpenChange={setShowCharacterSelector}
        >
          <DialogContent className="max-w-5xl max-h-[85vh] p-0 flex flex-col">
            <DialogTitle className="sr-only">
              {pageData.select_character_for_new_chat || "Select a character"}
            </DialogTitle>
            <div className="flex-1 overflow-hidden">
              <CharacterSelector
                onSelect={handleCharacterSelect}
                selectPrompt={
                  pageData.select_character_for_new_chat ||
                  pageData.select_character ||
                  "Select a character to start chatting"
                }
                emptyMessage="No characters available. Create your first character to start chatting!"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Desktop Chat History Sidebar - No longer fixed, now part of flex flow for better alignment */}
        <aside className="hidden lg:flex w-64 border-r border-border/50 flex-col bg-transparent shrink-0">
          <div className="h-16 px-3 border-b flex items-center justify-between bg-transparent backdrop-blur-md flex-shrink-0">
            <div className="font-semibold text-sm">
              {pageData.session_list || "Chat History"}
            </div>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full w-9 h-9"
              onClick={() => setShowCharacterSelector(true)}
              title={pageData.new_session || "New Chat"}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 sidebar-scrollbar">
            {sessions?.length ? (
              <ul className="p-2 space-y-1">
                {sessions.map((s) => (
                  <SessionListItem
                    key={s.session_id}
                    sessionId={s.session_id}
                    characterUuid={s.character_uuid}
                    characterName={s.character_name}
                    characterAvatar={s.character_avatar}
                    title={s.title}
                    messageCount={s.message_count}
                    updatedAt={s.updated_at}
                    isActive={sessionId === s.session_id}
                    onDelete={loadSessions}
                    texts={{
                      delete: pageData.session?.delete,
                      deleteConfirmTitle: pageData.session?.delete_confirm_title,
                      deleteConfirmMessage: pageData.session?.delete_confirm_message,
                      deleteConfirmButton: pageData.session?.delete_confirm_button,
                      deleteCancelButton: pageData.session?.delete_cancel_button,
                      deleted: pageData.session?.deleted,
                      msgs: pageData.session?.msgs,
                    }}
                  />
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center">
                <div className="text-sm text-muted-foreground mb-2">
                  {pageData.no_sessions || "No conversations yet"}
                </div>
                <div className="text-xs text-muted-foreground/70">
                  Click the + button to start a new conversation
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Sessions Sidebar Overlay */}
        {showMobileSessions && (
          <div
            className="lg:hidden fixed inset-0 z-40 overflow-hidden"
            onClick={() => setShowMobileSessions(false)}
          >
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />
            <aside
              className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-background border-r shadow-xl animate-in slide-in-from-left-5 duration-300 flex flex-col pt-safe"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2.5 border-b flex items-center justify-between bg-muted/30 flex-shrink-0">
                <div className="font-semibold text-sm">
                  {pageData.session_list || "Chat History"}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full w-9 h-9"
                  onClick={() => setShowCharacterSelector(true)}
                  title={pageData.new_session || "New Chat"}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 sidebar-scrollbar">
                {sessions?.length ? (
                  <ul className="p-2 space-y-1">
                    {sessions.map((s) => (
                      <SessionListItem
                        key={s.session_id}
                        sessionId={s.session_id}
                        characterUuid={s.character_uuid}
                        characterName={s.character_name}
                        characterAvatar={s.character_avatar}
                        title={s.title}
                        messageCount={s.message_count}
                        updatedAt={s.updated_at}
                        isActive={sessionId === s.session_id}
                        onDelete={loadSessions}
                        texts={{
                          delete: pageData.session?.delete,
                          deleteConfirmTitle: pageData.session?.delete_confirm_title,
                          deleteConfirmMessage: pageData.session?.delete_confirm_message,
                          deleteConfirmButton: pageData.session?.delete_confirm_button,
                          deleteCancelButton: pageData.session?.delete_cancel_button,
                          deleted: pageData.session?.deleted,
                          msgs: pageData.session?.msgs,
                        }}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-2">
                      {pageData.no_sessions || "No conversations yet"}
                    </div>
                    <div className="text-xs text-muted-foreground/70">
                      Click the + button to start a new conversation
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Mobile floating sessions button */}
        <Button
          variant="secondary"
          size="icon"
          className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-50 shadow-lg w-9 h-9 bg-background/95 backdrop-blur-sm border-2 border-r-0 rounded-l-none rounded-r-xl hover:rounded-r-xl transition-all duration-300 hover:shadow-xl group pt-safe"
          onClick={() => setShowMobileSessions(true)}
          title="Chat History"
        >
          <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
        </Button>

        {/* Main chat area - No longer needs hardcoded left margins as it's now a flex sibling of the sidebar */}
        <section className="flex-1 flex flex-col min-h-0 h-full relative">
          {characterUuid ? (
            <>
              <MessageList
                messages={messages}
                characterAvatar={character?.avatar_url}
                characterName={character?.name}
                userAvatar={userAvatar}
                isLoading={isLoadingHistory}
                isGenerating={isStreaming}
                emptyMessage={pageData.no_sessions}
                onMessageSent={handleMessageSent}
                modelSelector={{
                  availableModels,
                  currentModel,
                  onModelChange: setCurrentModel,
                  disabled: isStreaming,
                  userLevel,
                  texts: {
                    selectModel: pageData.select_model,
                    base: pageData.model_base,
                    premium: pageData.model_premium,
                    baseBadge: pageData.model_base_badge,
                    premiumBadge: pageData.model_premium_badge,
                    locked: pageData.model_locked,
                    upgradeRequired: pageData.model_upgrade_required
                  }
                }}
                quotaTexts={{
                  monthlyQuota: pageData.quota_monthly_quota,
                  remaining: pageData.quota_remaining,
                  resetsOn: pageData.quota_resets_on
                }}
              />

              <ChatInput
                onSend={sendMessage}
                isGenerating={isStreaming}
                placeholder={pageData.input_placeholder}
                sendButtonText={pageData.send_button}
                costHint={pageData.cost_hint}
                userCredits={userCredits}
                insufficientCreditsMessage={
                  pageData.insufficient_credits || "Insufficient credits"
                }
                rechargeUrl="/pricing"
                progressData={chatConfig ? {
                  rounds: conversationRounds,
                  maxRounds: chatConfig.context_window_size,
                  tokens: tokensUsed,
                  maxTokens: chatConfig.max_total_tokens
                } : undefined}
                progressTexts={{
                  conversationRounds: pageData.progress_conversation_rounds || "Conversation Rounds",
                  tokens: pageData.progress_tokens_used || "Tokens"
                }}
              />

              {/* Upgrade Dialog */}
              <UpgradeDialog
                open={showUpgradeDialog}
                onOpenChange={setShowUpgradeDialog}
                onUpgrade={handleUpgrade}
                onClearChat={handleClearChat}
                errorCode={upgradeErrorCode}
                currentLevel={userLevel}
                texts={{
                  maxRoundsTitle: pageData.upgrade_max_rounds_title,
                  maxRoundsDescription: pageData.upgrade_max_rounds_description,
                  maxTokensTitle: pageData.upgrade_max_tokens_title,
                  maxTokensDescription: pageData.upgrade_max_tokens_description,
                  modelNotAllowedTitle: pageData.upgrade_model_not_allowed_title,
                  modelNotAllowedDescription: pageData.upgrade_model_not_allowed_description,
                  upgradeRequiredTitle: pageData.upgrade_required_title,
                  upgradeRequiredDescription: pageData.upgrade_required_description,
                  benefitsTitle: pageData.upgrade_benefits_title,
                  clearChat: pageData.upgrade_clear_chat,
                  upgradeNow: pageData.upgrade_upgrade_now
                }}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
              <div className="text-center max-w-2xl space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold">
                  {pageData.empty_state?.title || "Chat with Original Characters"}
                </h2>
                <p className="text-muted-foreground text-base md:text-lg">
                  {pageData.empty_state?.description ||
                    "Start a conversation with your own OCs or explore community characters"}
                </p>
              </div>

              {/* CTA Buttons - Responsive layout */}
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Button
                  size="lg"
                  className="flex-1 h-14 sm:h-auto"
                  onClick={() => setShowCharacterSelector(true)}
                >
                  {pageData.empty_state?.chat_with_oc || "Chat with Your OC"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 h-14 sm:h-auto"
                  onClick={() => window.location.href = "/community?type=oc"}
                >
                  {pageData.empty_state?.explore_community || "Explore Community"}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </ChatQuotaProvider>
  );
}
