"use client";

import { createContext, useContext, ReactNode } from "react";
import { useChatQuota } from "@/hooks/useChatQuota";

interface ChatQuotaContextType {
  data: any;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  hasFetched: boolean;
}

const ChatQuotaContext = createContext<ChatQuotaContextType | undefined>(
  undefined
);

export function ChatQuotaProvider({ children }: { children: ReactNode }) {
  const quotaData = useChatQuota({ lazy: true });

  return (
    <ChatQuotaContext.Provider value={quotaData}>
      {children}
    </ChatQuotaContext.Provider>
  );
}

export function useChatQuotaContext() {
  const context = useContext(ChatQuotaContext);
  if (context === undefined) {
    throw new Error(
      "useChatQuotaContext must be used within a ChatQuotaProvider"
    );
  }
  return context;
}
