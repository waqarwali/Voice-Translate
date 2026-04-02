import Tts from 'react-native-tts';

export type TTSLanguage = 'en-US' | 'ur-PK' | 'hi-IN';

class TTSService {
  private isInitialized = false;
  private currentLanguage: TTSLanguage = 'en-US';
  private isSpeaking = false;
  private queue: Array<{ text: string; lang: TTSLanguage }> = [];

  // ─── Initialize TTS engine ────────────────────────────────────────────
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Tts.getInitStatus();
      // Route audio to earpiece only (so other person can't hear translation)
      Tts.setDefaultRate(0.5);
      Tts.setDefaultPitch(1.0);

      Tts.addEventListener('tts-finish', () => {
        this.isSpeaking = false;
        this.processQueue();
      });

      Tts.addEventListener('tts-cancel', () => {
        this.isSpeaking = false;
      });

      this.isInitialized = true;
    } catch (e: any) {
      throw new Error(`TTS init failed: ${e.message}`);
    }
  }

  // ─── Speak translated text ────────────────────────────────────────────
  async speak(text: string, language: TTSLanguage = this.currentLanguage) {
    if (!text.trim()) return;

    // Queue it up
    this.queue.push({ text, lang: language });
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  // ─── Process speech queue ─────────────────────────────────────────────
  private async processQueue() {
    if (this.queue.length === 0 || this.isSpeaking) return;

    const next = this.queue.shift();
    if (!next) return;

    try {
      this.isSpeaking = true;
      await Tts.setDefaultLanguage(next.lang);
      Tts.speak(next.text);
    } catch (e) {
      this.isSpeaking = false;
      // Try next in queue
      this.processQueue();
    }
  }

  // ─── Stop speaking immediately ────────────────────────────────────────
  stop() {
    this.queue = [];
    this.isSpeaking = false;
    Tts.stop();
  }

  // ─── Set language ─────────────────────────────────────────────────────
  setLanguage(lang: TTSLanguage) {
    this.currentLanguage = lang;
  }

  // ─── Set speech rate (0.0 - 1.0) ─────────────────────────────────────
  setRate(rate: number) {
    Tts.setDefaultRate(Math.min(1.0, Math.max(0.0, rate)));
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────
  destroy() {
    this.stop();
    Tts.removeAllListeners('tts-finish');
    Tts.removeAllListeners('tts-cancel');
    this.isInitialized = false;
  }
}

export default new TTSService();