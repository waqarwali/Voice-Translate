import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import STTService from '../services/STTService';
import TranslationService from '../services/TranslationService';
import TTSService from '../services/TTSService';
import OverlayManager from '../modules/OverlayManager';
import useSessionStore from '../store/sessionStore';
import { TranscriptEntry } from '../store/sessionStore';

interface Props {
  navigation: any;
}

const SessionScreen: React.FC<Props> = ({ navigation }) => {
  useKeepAwake();
  const scrollRef = useRef<ScrollView>(null);
  const lastSpokenRef = useRef<string>('');

  const {
    isActive,
    isPaused,
    selectedPair,
    transcripts,
    currentPartial,
    currentTranslation,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    addTranscript,
    updatePartial,
  } = useSessionStore();

  // ─── Boot up everything when screen mounts ───────────────────────────
  useEffect(() => {
    initSession();

    return () => {
      cleanupSession();
    };
  }, []);

  const initSession = async () => {
    try {
      // Init TTS
      await TTSService.init();

      // Start overlay
      await OverlayManager.start();

      // Start STT
      STTService.setLocale(selectedPair.sttLocale);
      STTService.onResult(handleTranscript);
      await STTService.start(selectedPair.sttLocale);

      startSession();
    } catch (e: any) {
      Alert.alert('Error', `Failed to start session: ${e.message}`);
      navigation.goBack();
    }
  };

  // ─── Handle incoming transcript from STT ────────────────────────────
  const isSpeakingRef = useRef(false);

  const handleTranscript = useCallback(
    async (text: string, isFinal: boolean) => {
      if (isSpeakingRef.current) return;

      if (!isFinal) {
        updatePartial(text, '');
        return;
      }

      if (isPaused || !text.trim()) return;

      const translated = await TranslationService.translate(
        text,
        selectedPair.source,
        selectedPair.target
      );

      addTranscript(text, translated);

      if (translated && translated !== lastSpokenRef.current) {
        lastSpokenRef.current = translated;

        isSpeakingRef.current = true;
        await STTService.stop();

        const ttsLang = `${selectedPair.target}-${
          selectedPair.target === 'en' ? 'US' :
          selectedPair.target === 'ur' ? 'PK' : 'IN'
        }` as any;

        TTSService.speak(translated, ttsLang);

        const estimatedDuration = translated.length * 70 + 500;
        setTimeout(async () => {
          isSpeakingRef.current = false;
          if (!isPaused) {
            await STTService.start(selectedPair.sttLocale);
          }
        }, estimatedDuration);
      }

      OverlayManager.updateTranscript(text, translated);

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [isPaused, selectedPair, addTranscript, updatePartial]
  );

  // ─── Cleanup on unmount ──────────────────────────────────────────────
  const cleanupSession = async () => {
    await STTService.destroy();
    TTSService.destroy();
    await OverlayManager.stop();
    stopSession();
  };

  // ─── Toggle pause/resume ─────────────────────────────────────────────
  const handleTogglePause = async () => {
    if (isPaused) {
      await STTService.start(selectedPair.sttLocale);
      resumeSession();
    } else {
      await STTService.stop();
      TTSService.stop();
      pauseSession();
    }
  };

  // ─── Stop session ────────────────────────────────────────────────────
  const handleStop = () => {
    Alert.alert(
      'Stop Translation',
      'Are you sure you want to stop the translator?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            cleanupSession();
            navigation.goBack();
          },
        },
      ]
    );
  };

  // ─── Format timestamp ─────────────────────────────────────────────────
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isPaused ? '#FFD700' : '#00FF88' }
          ]} />
          <Text style={styles.statusText}>
            {isPaused ? 'Paused' : 'Translating live'}
          </Text>
        </View>
        <Text style={styles.pairLabel}>{selectedPair.label}</Text>
      </View>

      {/* Transcript list */}
      <ScrollView
        ref={scrollRef}
        style={styles.transcriptList}
        contentContainerStyle={styles.transcriptContent}>

        {transcripts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎙</Text>
            <Text style={styles.emptyText}>
              Start speaking — translation will{'\n'}appear here in real time
            </Text>
          </View>
        )}

        {transcripts.map((entry: TranscriptEntry) => (
          <View key={entry.id} style={styles.transcriptCard}>
            <Text style={styles.timestamp}>{formatTime(entry.timestamp)}</Text>
            <Text style={styles.originalText}>{entry.original}</Text>
            <View style={styles.divider} />
            <Text style={styles.translatedText}>{entry.translated}</Text>
          </View>
        ))}

        {/* Live partial result */}
        {currentPartial !== '' && (
          <View style={[styles.transcriptCard, styles.partialCard]}>
            <Text style={styles.partialLabel}>Listening...</Text>
            <Text style={styles.originalText}>{currentPartial}</Text>
            {currentTranslation !== '' && (
              <>
                <View style={styles.divider} />
                <Text style={styles.translatedText}>{currentTranslation}</Text>
              </>
            )}
          </View>
        )}

      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, styles.pauseBtn]}
          onPress={handleTogglePause}>
          <Text style={styles.controlBtnText}>
            {isPaused ? '▶  Resume' : '⏸  Pause'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.stopBtn]}
          onPress={handleStop}>
          <Text style={[styles.controlBtnText, { color: '#FF4444' }]}>
            ■  Stop
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#CCC',
    fontSize: 13,
    fontWeight: '500',
  },
  pairLabel: {
    color: '#555',
    fontSize: 12,
  },
  transcriptList: {
    flex: 1,
  },
  transcriptContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  transcriptCard: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#222',
    gap: 8,
  },
  partialCard: {
    borderColor: '#2A2A00',
    backgroundColor: '#111100',
  },
  partialLabel: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timestamp: {
    fontSize: 10,
    color: '#444',
  },
  originalText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
  },
  translatedText: {
    fontSize: 15,
    color: '#FFD700',
    lineHeight: 22,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  controlBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222',
  },
  pauseBtn: {
    borderColor: '#333',
  },
  stopBtn: {
    borderColor: '#2A0000',
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCC',
  },
});

export default SessionScreen;