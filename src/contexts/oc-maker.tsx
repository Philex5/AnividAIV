"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ocMakerSuggestions from "@/configs/suggestions/oc-maker.json";

type OCSuggestionConfigItem =
  (typeof ocMakerSuggestions)["items"][number];

interface OCMakerContextValue {
  description: string;
  setDescription: (value: string) => void;
  gender: string;
  setGender: (value: string) => void;
  artStyle: string;
  setArtStyle: (value: string) => void;
  species: string;
  setSpecies: (value: string) => void;
  autoGenerateProfile: boolean;
  setAutoGenerateProfile: (value: boolean) => void;
  suggestions: string[];
  refreshSuggestions: () => void;
  applySuggestion: (value: string) => void;
  applyPreset: (preset: {
    description?: string;
    gender?: string;
    artStyle?: string;
    species?: string;
  }) => void;
}

interface OCMakerProviderProps {
  children: ReactNode;
  locale?: string;
  suggestionPool?: string[];
}

const STORAGE_KEY = "ocMaker.quickForm";

const CONFIG_SUGGESTION_PROMPTS = ((ocMakerSuggestions?.items || []) as OCSuggestionConfigItem[])
  .map((item) => item?.prompt?.trim())
  .filter((prompt): prompt is string => Boolean(prompt));

const FALLBACK_SUGGESTIONS: string[] = CONFIG_SUGGESTION_PROMPTS.length
  ? CONFIG_SUGGESTION_PROMPTS
  : [
      "A cyberpunk hacker girl with neon pink hair",
      "An elf archer who loves adventure",
      "A gentle orc healer from a fantasy world",
      "A mysterious wizard with a dark past",
      "A brave knight defending the kingdom",
      "A cheerful robot exploring the universe",
    ];

const OCMakerContext = createContext<OCMakerContextValue | undefined>(
  undefined
);

export function OCMakerProvider({
  children,
  locale = "en",
  suggestionPool,
}: OCMakerProviderProps) {
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState<string>("female");
  const [artStyle, setArtStyle] = useState<string>("anime");
  const [species, setSpecies] = useState<string>("human");
  const [autoGenerateProfile, setAutoGenerateProfile] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  const suggestionSource = useMemo(() => {
    if (suggestionPool && suggestionPool.length > 0) {
      return suggestionPool.filter(Boolean);
    }
    return FALLBACK_SUGGESTIONS;
  }, [suggestionPool]);

  const pickSuggestions = useCallback((): string[] => {
    if (!suggestionSource.length) {
      return [];
    }
    const pool = [...suggestionSource];
    const picks: string[] = [];
    while (pool.length > 0 && picks.length < 3) {
      const index = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(index, 1)[0]);
    }
    return picks;
  }, [suggestionSource]);

  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setSuggestions(pickSuggestions());
  }, [pickSuggestions]);

  const storageKey = useMemo(
    () => `${STORAGE_KEY}:${locale}`,
    [locale]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = window.localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.artStyle) setArtStyle(parsed.artStyle);
        if (parsed.species) setSpecies(parsed.species);
        if (typeof parsed.autoGenerateProfile === "boolean") {
          setAutoGenerateProfile(parsed.autoGenerateProfile);
        }
      }
    } catch (error) {
      console.warn("Failed to restore OC maker state:", error);
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    try {
      const payload = {
        description,
        gender,
        artStyle,
        species,
        autoGenerateProfile,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist OC maker state:", error);
    }
  }, [
    artStyle,
    autoGenerateProfile,
    description,
    gender,
    isHydrated,
    species,
    storageKey,
  ]);

  const refreshSuggestions = useCallback(() => {
    setSuggestions(pickSuggestions());
  }, [pickSuggestions]);

  const applySuggestion = useCallback((value: string) => {
    setDescription(value);
  }, []);

  const applyPreset = useCallback(
    (preset: {
      description?: string;
      gender?: string;
      artStyle?: string;
      species?: string;
    }) => {
      if (typeof preset.description === "string") {
        setDescription(preset.description);
      }
      if (preset.gender) {
        setGender(preset.gender);
      }
      if (preset.artStyle) {
        setArtStyle(preset.artStyle);
      }
      if (preset.species) {
        setSpecies(preset.species);
      }
    },
    []
  );

  const value = useMemo<OCMakerContextValue>(
    () => ({
      description,
      setDescription,
      gender,
      setGender,
      artStyle,
      setArtStyle,
      species,
      setSpecies,
      autoGenerateProfile,
      setAutoGenerateProfile,
      suggestions,
      refreshSuggestions,
      applySuggestion,
      applyPreset,
    }),
    [
      artStyle,
      autoGenerateProfile,
      description,
      gender,
      refreshSuggestions,
      species,
      suggestions,
      applySuggestion,
      applyPreset,
    ]
  );

  return (
    <OCMakerContext.Provider value={value}>
      {children}
    </OCMakerContext.Provider>
  );
}

export function useOCMakerContext(): OCMakerContextValue {
  const context = useContext(OCMakerContext);
  if (!context) {
    throw new Error("useOCMakerContext must be used within OCMakerProvider");
  }
  return context;
}
