import { NativeModules } from 'react-native';

const { OverlayModule } = NativeModules;

class OverlayManager {

  // ─── Check if overlay permission is granted ───────────────────────────────
  async hasPermission(): Promise<boolean> {
    try {
      return await OverlayModule.hasOverlayPermission();
    } catch (e) {
      return false;
    }
  }

  // ─── Open Android settings to grant overlay permission ───────────────────
  requestPermission() {
    OverlayModule.requestOverlayPermission();
  }

  // ─── Start the floating overlay ───────────────────────────────────────────
  async start(): Promise<string> {
    try {
      return await OverlayModule.startOverlay();
    } catch (e: any) {
      throw new Error(`Overlay start failed: ${e.message}`);
    }
  }

  // ─── Stop the floating overlay ────────────────────────────────────────────
  async stop(): Promise<string> {
    try {
      return await OverlayModule.stopOverlay();
    } catch (e: any) {
      throw new Error(`Overlay stop failed: ${e.message}`);
    }
  }

  // ─── Push latest transcript to overlay ───────────────────────────────────
  updateTranscript(original: string, translated: string) {
    OverlayModule.updateOverlayTranscript(original, translated);
  }
}

export default new OverlayManager();