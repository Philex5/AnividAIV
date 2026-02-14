import { ReactNode } from "react";
import { User } from "./user";

export interface ContextValue {
  showSignModal: boolean;
  setShowSignModal: (show: boolean) => void;
  signModalMessage: string;
  setSignModalMessage: (message: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isLoadingUser: boolean;
  showFeedback: boolean;
  setShowFeedback: (show: boolean) => void;
  credits: number;
  setCredits: (credits: number) => void;
  isLoadingCredits: boolean;
  creditsError: string | null;
  refreshCredits: (forceRefresh?: boolean) => void;
}
