import { NativeModules, NativeEventEmitter } from 'react-native';

const { AudioCaptureModule } = NativeModules;
const emitter = new NativeEventEmitter(AudioCaptureModule);

export type AudioChunkCallback = (base64Chunk: string) => void;

class AudioCapture {
  private listener: any = null;

  // ─── Request MediaProjection permission ──────────────────────────────────
  async requestPermission(): Promise<string> {
    try {
      const result = await AudioCaptureModule.requestPermission();
      return result;
    } catch (e: any) {
      throw new Error(`Permission denied: ${e.message}`);
    }
  }

  // ─── Start capturing WhatsApp speaker audio ───────────────────────────────
  async startSystemCapture(): Promise<string> {
    try {
      const result = await AudioCaptureModule.startCapture();
      return result;
    } catch (e: any) {
      throw new Error(`Capture failed: ${e.message}`);
    }
  }

  // ─── Start capturing your own mic audio ──────────────────────────────────
  async startMicCapture(): Promise<string> {
    try {
      const result = await AudioCaptureModule.startMicCapture();
      return result;
    } catch (e: any) {
      throw new Error(`Mic capture failed: ${e.message}`);
    }
  }

  // ─── Stop all capture ─────────────────────────────────────────────────────
  async stopCapture(): Promise<string> {
    try {
      this.removeListener();
      const result = await AudioCaptureModule.stopCapture();
      return result;
    } catch (e: any) {
      throw new Error(`Stop failed: ${e.message}`);
    }
  }

  // ─── Listen to audio chunks coming from native ────────────────────────────
  onAudioChunk(callback: AudioChunkCallback) {
    this.removeListener();
    this.listener = emitter.addListener('onAudioChunk', (base64Chunk: string) => {
      callback(base64Chunk);
    });
  }

  // ─── Remove listener ──────────────────────────────────────────────────────
  removeListener() {
    if (this.listener) {
      this.listener.remove();
      this.listener = null;
    }
  }
}

export default new AudioCapture();