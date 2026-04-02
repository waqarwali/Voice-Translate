import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';

type TranscriptCallback = (text: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;

class STTService {
  private isListening = false;
  private onTranscript: TranscriptCallback | null = null;
  private onError: ErrorCallback | null = null;
  private accumulatedText = '';
  private silenceTimer: any = null;
  private readonly SILENCE_TIMEOUT = 1500; // wait 1.5s of silence before finalizing

  constructor() {
    this.setupVoiceListeners();
  }

  private setupVoiceListeners() {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] ?? '';
      if (!text) return;

      // Clear silence timer — person is still speaking
      this.clearSilenceTimer();

      // Update accumulated text with latest result
      this.accumulatedText = text;

      // Show partial result live
      if (this.onTranscript) {
        this.onTranscript(this.accumulatedText, false);
      }

      // Start silence timer — if no new result in 1.5s, finalize
      this.silenceTimer = setTimeout(() => {
        if (this.accumulatedText && this.onTranscript) {
          this.onTranscript(this.accumulatedText, true);
          this.accumulatedText = '';
        }
      }, this.SILENCE_TIMEOUT);
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] ?? '';
      if (!text) return;

      this.clearSilenceTimer();
      this.accumulatedText = text;

      if (this.onTranscript) {
        this.onTranscript(this.accumulatedText, false);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      const msg = e.error?.message ?? 'Unknown STT error';
      // Error code 7 = no match, just restart silently
      if (msg.includes('7')) {
        if (this.isListening) {
          setTimeout(() => this.restart(), 300);
        }
        return;
      }
      if (this.onError) this.onError(msg);
      if (this.isListening) {
        setTimeout(() => this.restart(), 300);
      }
    };

    Voice.onSpeechEnd = () => {
      if (this.isListening) {
        // Finalize current text before restarting
        if (this.accumulatedText && this.onTranscript) {
          this.clearSilenceTimer();
          this.onTranscript(this.accumulatedText, true);
          this.accumulatedText = '';
        }
        setTimeout(() => this.restart(), 200);
      }
    };
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  async start(locale: string = 'en-US') {
    if (this.isListening) return;
    try {
      this.isListening = true;
      this.accumulatedText = '';
      await Voice.start(locale);
    } catch (e: any) {
      this.isListening = false;
      this.onError?.(`STT start error: ${e.message}`);
    }
  }

  async stop() {
    this.isListening = false;
    this.clearSilenceTimer();
    this.accumulatedText = '';
    try {
      await Voice.stop();
      await Voice.destroy();
    } catch (e) {}
  }

  private async restart() {
    if (!this.isListening) return;
    try {
      await Voice.stop();
      await new Promise(resolve => setTimeout(resolve, 100));
      await Voice.start(this.currentLocale);
    } catch (e) {
      setTimeout(() => this.restart(), 500);
    }
  }

  private currentLocale = 'en-US';

  setLocale(locale: string) {
    this.currentLocale = locale;
  }

  onResult(callback: TranscriptCallback) {
    this.onTranscript = callback;
  }

  onSpeechError(callback: ErrorCallback) {
    this.onError = callback;
  }

  async destroy() {
    this.isListening = false;
    this.clearSilenceTimer();
    this.accumulatedText = '';
    this.onTranscript = null;
    this.onError = null;
    try {
      await Voice.destroy();
    } catch (e) {}
  }
}

export default new STTService();