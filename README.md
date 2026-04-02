# 🎙️ VoiceTranslate

> Real-time voice translation app for Android — break language barriers on WhatsApp calls instantly.

![React Native](https://img.shields.io/badge/React_Native-0.73-blue?style=for-the-badge&logo=react)
![Android](https://img.shields.io/badge/Android-API_29+-green?style=for-the-badge&logo=android)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

---

## ✨ Features

- 🎤 **Real-time Speech Recognition** — Continuously listens and transcribes speech using on-device STT
- 🌐 **Instant Translation** — Translates between Urdu, Hindi, and English in under 1 second
- 🔊 **Text-to-Speech Playback** — Speaks the translated text back so you understand naturally
- 🫧 **Floating Overlay** — Draggable bubble shows live transcript and translation over any app including WhatsApp
- 🔁 **Infinite Loop Prevention** — Smart mic muting during TTS playback prevents echo and feedback loops
- 📜 **Session Transcript** — Full history of everything said and translated during a session
- ⏸️ **Pause / Resume** — Pause translation anytime mid-call
- 🌙 **Dark UI** — Clean, minimal dark interface designed for use during calls

---

## 🌍 Supported Languages

| From | To |
|------|----|
| Urdu 🇵🇰 | English 🇺🇸 |
| English 🇺🇸 | Urdu 🇵🇰 |
| Hindi 🇮🇳 | English 🇺🇸 |
| English 🇺🇸 | Hindi 🇮🇳 |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.73 |
| Language (JS) | TypeScript |
| Language (Native) | Kotlin |
| Speech-to-Text | @react-native-voice/voice |
| Translation API | MyMemory API + LibreTranslate fallback |
| Text-to-Speech | react-native-tts |
| State Management | Zustand |
| Navigation | React Navigation v6 |
| Overlay | Android SYSTEM_ALERT_WINDOW + Foreground Service |
| Audio Capture | Android MediaProjection API |
| Permissions | react-native-permissions |

---

## 🧠 Architecture
```
User speaks
     ↓
STT (react-native-voice) — continuous listening with silence detection
     ↓
Translation (MyMemory API) — Urdu/Hindi ↔ English
     ↓
TTS (react-native-tts) — speaks translation
     ↓
Mic pauses during TTS — prevents infinite loop
     ↓
Mic resumes — ready for next sentence
```

---

## 📁 Project Structure
```
VoiceTranslate/
├── android/
│   └── app/src/main/java/com/voicetranslate/
│       ├── AudioCaptureModule.kt     # MediaProjection audio capture
│       ├── OverlayService.kt         # Floating bubble over WhatsApp
│       ├── OverlayModule.kt          # JS bridge for overlay control
│       ├── CallReceiver.kt           # WhatsApp call detector
│       ├── VoiceTranslatePackage.kt  # Native module registration
│       └── MainApplication.kt
├── src/
│   ├── modules/
│   │   ├── AudioCapture.ts           # JS wrapper for native audio
│   │   └── OverlayManager.ts         # JS wrapper for overlay
│   ├── services/
│   │   ├── STTService.ts             # Speech-to-text with silence detection
│   │   ├── TranslationService.ts     # Translation with caching + fallback
│   │   └── TTSService.ts             # TTS queue with loop prevention
│   ├── screens/
│   │   ├── HomeScreen.tsx            # Language picker + permissions UI
│   │   └── SessionScreen.tsx         # Live transcript view
│   └── store/
│       └── sessionStore.ts           # Zustand global state
└── App.tsx
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Android Studio
- Android device with API 29+ (Android 10+)
- USB Debugging enabled on device

### Installation
```bash
# Clone the repo
git clone https://github.com/waqarwali/Voice-Translate.git
cd Voice-Translate

# Install dependencies
npm install

# Start Metro bundler
npx react-native start

# Run on Android (in a new terminal)
npx react-native run-android
```

### Permissions Required

The app will ask for these permissions on first launch:

- **Microphone** — for speech recognition
- **Draw over other apps** — for the floating overlay during calls

---

## 🗺️ Roadmap

### ✅ v1.0 (Current)
- Real-time STT + translation + TTS pipeline
- Floating overlay over WhatsApp
- Urdu, Hindi, English support
- Infinite loop prevention
- Session transcript history

### 🔜 v2.0 (Coming Soon)
- 🔇 Audio ducking — mute original voice, only translated voice plays
- 📞 Auto-launch on WhatsApp call detection
- 🎭 ElevenLabs voice cloning — translation in caller's actual voice
- 📱 iOS support via Broadcast Upload Extension
- 🤫 Whisper on-device STT for offline use

---

## 🤝 Contributing

Pull requests are welcome! For major changes please open an issue first to discuss what you would like to change.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Waqar Wali Khan**
- GitHub: [@waqarwali](https://github.com/waqarwali)

---

⭐ If you found this project useful, please consider giving it a star!