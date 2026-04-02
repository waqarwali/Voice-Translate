import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import OverlayManager from '../modules/OverlayManager';
import useSessionStore from '../store/sessionStore';
import { LANGUAGE_PAIRS, LanguagePair } from '../services/TranslationService';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [hasOverlayPerm, setHasOverlayPerm] = useState(false);
  const [hasMicPerm, setHasMicPerm] = useState(false);
  const [isCheckingPerms, setIsCheckingPerms] = useState(true);

  const { selectedPair, setLanguagePair } = useSessionStore();

  useEffect(() => {
    checkPermissions();
  }, []);

  // ─── Check all required permissions ────────────────────────────────
  const checkPermissions = async () => {
    setIsCheckingPerms(true);
    try {
      // Check overlay permission
      const overlayOk = await OverlayManager.hasPermission();
      setHasOverlayPerm(overlayOk);

      // Check mic permission
      const micResult = await check(PERMISSIONS.ANDROID.RECORD_AUDIO);
      setHasMicPerm(micResult === RESULTS.GRANTED);
    } finally {
      setIsCheckingPerms(false);
    }
  };

  // ─── Request mic permission ─────────────────────────────────────────
  const requestMicPermission = async () => {
    const result = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
    if (result === RESULTS.GRANTED) {
      setHasMicPerm(true);
    } else {
      Alert.alert(
        'Microphone Required',
        'VoiceTranslate needs microphone access to translate speech.',
        [{ text: 'OK' }]
      );
    }
  };

  // ─── Request overlay permission ─────────────────────────────────────
  const requestOverlayPermission = async () => {
    OverlayManager.requestPermission();
    // Check again after user returns from settings
    setTimeout(async () => {
      const ok = await OverlayManager.hasPermission();
      setHasOverlayPerm(ok);
    }, 2000);
  };

  // ─── Start session ──────────────────────────────────────────────────
  const handleStart = () => {
    if (!hasOverlayPerm) {
      Alert.alert(
        'Overlay Permission Needed',
        'Please grant "Draw over other apps" permission so the translator can appear over WhatsApp.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant', onPress: requestOverlayPermission },
        ]
      );
      return;
    }

    if (!hasMicPerm) {
      Alert.alert(
        'Microphone Permission Needed',
        'Please grant microphone permission to capture speech.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant', onPress: requestMicPermission },
        ]
      );
      return;
    }

    navigation.navigate('Session');
  };

  // ─── Render permission row ──────────────────────────────────────────
  const renderPermRow = (
    label: string,
    granted: boolean,
    onPress: () => void
  ) => (
    <View style={styles.permRow}>
      <View style={styles.permLeft}>
        <View style={[styles.permDot, { backgroundColor: granted ? '#00FF88' : '#FF4444' }]} />
        <Text style={styles.permLabel}>{label}</Text>
      </View>
      {!granted && (
        <TouchableOpacity style={styles.grantBtn} onPress={onPress}>
          <Text style={styles.grantBtnText}>Grant</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isCheckingPerms) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>VoiceTranslate</Text>
          <Text style={styles.tagline}>Real-time WhatsApp call translation</Text>
        </View>

        {/* Language Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Translation Direction</Text>
          {LANGUAGE_PAIRS.map((pair: LanguagePair) => (
            <TouchableOpacity
              key={`${pair.source}-${pair.target}`}
              style={[
                styles.langOption,
                selectedPair.source === pair.source &&
                selectedPair.target === pair.target &&
                styles.langOptionSelected,
              ]}
              onPress={() => setLanguagePair(pair)}>
              <Text style={[
                styles.langOptionText,
                selectedPair.source === pair.source &&
                selectedPair.target === pair.target &&
                styles.langOptionTextSelected,
              ]}>
                {pair.label}
              </Text>
              {selectedPair.source === pair.source &&
               selectedPair.target === pair.target && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Permissions</Text>
          {renderPermRow(
            'Microphone',
            hasMicPerm,
            requestMicPermission
          )}
          {renderPermRow(
            'Draw over other apps (overlay)',
            hasOverlayPerm,
            requestOverlayPermission
          )}
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <Text style={styles.howItWorksText}>
            1. Select your translation direction above{'\n'}
            2. Tap Start below{'\n'}
            3. Open WhatsApp and start a call{'\n'}
            4. A floating bubble will appear{'\n'}
            5. Speak — translation plays in your ear instantly
          </Text>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[
            styles.startBtn,
            (!hasOverlayPerm || !hasMicPerm) && styles.startBtnDisabled,
          ]}
          onPress={handleStart}
          activeOpacity={0.85}>
          <Text style={styles.startBtnText}>
            {hasOverlayPerm && hasMicPerm
              ? '▶  Start Translator'
              : '⚠  Grant Permissions First'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 36,
    marginTop: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#161616',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  langOptionSelected: {
    borderColor: '#00FF88',
    backgroundColor: '#0A1F14',
  },
  langOptionText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },
  langOptionTextSelected: {
    color: '#00FF88',
  },
  checkmark: {
    color: '#00FF88',
    fontSize: 16,
    fontWeight: '700',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  permLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  permLabel: {
    fontSize: 14,
    color: '#CCC',
  },
  grantBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  grantBtnText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  howItWorksText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 26,
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
  },
  startBtn: {
    backgroundColor: '#00FF88',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnDisabled: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A0A0A',
  },
});

export default HomeScreen;