import { create } from 'zustand';
import { SupportedLanguage, LanguagePair, LANGUAGE_PAIRS } from '../services/TranslationService';

export interface TranscriptEntry {
  id: string;
  original: string;
  translated: string;
  timestamp: number;
  isPartial: boolean;
}

interface SessionState {
  // ─── Session status ─────────────────────────────────────────────────
  isActive: boolean;
  isPaused: boolean;
  isOverlayVisible: boolean;

  // ─── Language config ────────────────────────────────────────────────
  sourceLang: SupportedLanguage;
  targetLang: SupportedLanguage;
  selectedPair: LanguagePair;

  // ─── Transcript history ─────────────────────────────────────────────
  transcripts: TranscriptEntry[];
  currentPartial: string;
  currentTranslation: string;

  // ─── Stats ──────────────────────────────────────────────────────────
  sessionStartTime: number | null;
  totalTranslated: number;

  // ─── Actions ────────────────────────────────────────────────────────
  startSession: () => void;
  stopSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;

  setLanguagePair: (pair: LanguagePair) => void;
  setSourceLang: (lang: SupportedLanguage) => void;
  setTargetLang: (lang: SupportedLanguage) => void;

  addTranscript: (original: string, translated: string) => void;
  updatePartial: (text: string, translation: string) => void;
  clearTranscripts: () => void;

  setOverlayVisible: (visible: boolean) => void;
}

const useSessionStore = create<SessionState>((set, get) => ({
  // ─── Initial state ───────────────────────────────────────────────────
  isActive: false,
  isPaused: false,
  isOverlayVisible: false,

  sourceLang: 'ur',
  targetLang: 'en',
  selectedPair: LANGUAGE_PAIRS[0],

  transcripts: [],
  currentPartial: '',
  currentTranslation: '',

  sessionStartTime: null,
  totalTranslated: 0,

  // ─── Session actions ─────────────────────────────────────────────────
  startSession: () => set({
    isActive: true,
    isPaused: false,
    sessionStartTime: Date.now(),
    transcripts: [],
    currentPartial: '',
    currentTranslation: '',
    totalTranslated: 0,
  }),

  stopSession: () => set({
    isActive: false,
    isPaused: false,
    isOverlayVisible: false,
    currentPartial: '',
    currentTranslation: '',
  }),

  pauseSession: () => set({ isPaused: true }),
  resumeSession: () => set({ isPaused: false }),

  // ─── Language actions ────────────────────────────────────────────────
  setLanguagePair: (pair: LanguagePair) => set({
    selectedPair: pair,
    sourceLang: pair.source,
    targetLang: pair.target,
  }),

  setSourceLang: (lang: SupportedLanguage) => set({ sourceLang: lang }),
  setTargetLang: (lang: SupportedLanguage) => set({ targetLang: lang }),

  // ─── Transcript actions ──────────────────────────────────────────────
  addTranscript: (original: string, translated: string) => set(state => ({
    transcripts: [
      ...state.transcripts,
      {
        id: `${Date.now()}-${Math.random()}`,
        original,
        translated,
        timestamp: Date.now(),
        isPartial: false,
      },
    ],
    currentPartial: '',
    currentTranslation: '',
    totalTranslated: state.totalTranslated + 1,
  })),

  updatePartial: (text: string, translation: string) => set({
    currentPartial: text,
    currentTranslation: translation,
  }),

  clearTranscripts: () => set({
    transcripts: [],
    currentPartial: '',
    currentTranslation: '',
    totalTranslated: 0,
  }),

  setOverlayVisible: (visible: boolean) => set({
    isOverlayVisible: visible,
  }),
}));

export default useSessionStore;