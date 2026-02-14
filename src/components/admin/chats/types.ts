export interface AdminChatTrendPoint {
  bucket: string;
  sessions: number;
  users: number;
}

export interface AdminTopOcItem {
  characterId: string;
  characterName: string;
  avatarUrl: string;
  userCount: number;
  sessionCount: number;
}

export interface AdminChatSessionItem {
  sessionId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  character: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  messageCount: number;
  createdAt: string;
}

export interface AdminChatSessionDetailMessage {
  id: string;
  messageIndex: number;
  role: string;
  content: string;
  createdAt: string;
}

export interface AdminChatSessionDetail {
  session: {
    sessionId: string;
    userId: string;
    userName: string;
    userAvatarUrl: string;
    characterId: string;
    characterName: string;
    characterAvatarUrl: string;
    messageCount: number;
    createdAt: string;
  };
  messages: AdminChatSessionDetailMessage[];
}

