import axios from 'axios';

// ─── Supported language pairs ─────────────────────────────────────────────
export type SupportedLanguage = 'en' | 'ur' | 'hi';

export interface LanguagePair {
  source: SupportedLanguage;
  target: SupportedLanguage;
  label: string;
  sttLocale: string;
}

export const LANGUAGE_PAIRS: LanguagePair[] = [
  {
    source: 'ur',
    target: 'en',
    label: 'Urdu → English',
    sttLocale: 'ur-PK',
  },
  {
    source: 'en',
    target: 'ur',
    label: 'English → Urdu',
    sttLocale: 'en-US',
  },
  {
    source: 'hi',
    target: 'en',
    label: 'Hindi → English',
    sttLocale: 'hi-IN',
  },
  {
    source: 'en',
    target: 'hi',
    label: 'English → Hindi',
    sttLocale: 'en-US',
  },
];

// ─── Translation cache to avoid duplicate API calls ───────────────────────
const cache = new Map<string, string>();

class TranslationService {
  // LibreTranslate self-hosted or public instance
  private libreUrl = 'https://libretranslate.de/translate';
  // DeepL free API fallback
  private deeplUrl = 'https://api-free.deepl.com/v2/translate';
  private deeplKey = 'YOUR_DEEPL_API_KEY'; // replace this

  // ─── Main translate function ───────────────────────────────────────────
  async translate(
  text: string,
  source: SupportedLanguage,
  target: SupportedLanguage
): Promise<string> {
  if (!text.trim()) return '';

  const cacheKey = `${source}:${target}:${text}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    // Using MyMemory — completely free, no key needed
    const langPair = `${source}|${target}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    const response = await axios.get(url, { timeout: 5000 });
    const result = response.data.responseData.translatedText;
    cache.set(cacheKey, result);
    return result;
  } catch (e) {
    console.error('Translation failed:', e);
    return text;
  }
}

  // ─── LibreTranslate (primary) ──────────────────────────────────────────
  private async translateLibre(
    text: string,
    source: string,
    target: string
  ): Promise<string> {
    const response = await axios.post(
      this.libreUrl,
      {
        q: text,
        source,
        target,
        format: 'text',
      },
      { timeout: 3000 }
    );
    return response.data.translatedText;
  }

  // ─── DeepL fallback ────────────────────────────────────────────────────
  private async translateDeepl(
    text: string,
    source: string,
    target: string
  ): Promise<string> {
    // DeepL uses different lang codes
    const targetCode = target === 'en' ? 'EN-US' : target.toUpperCase();

    const response = await axios.post(
      this.deeplUrl,
      new URLSearchParams({
        auth_key: this.deeplKey,
        text,
        source_lang: source.toUpperCase(),
        target_lang: targetCode,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000,
      }
    );
    return response.data.translations[0].text;
  }

  // ─── Set custom LibreTranslate URL (for self-hosted) ──────────────────
  setLibreUrl(url: string) {
    this.libreUrl = url;
  }

  // ─── Set DeepL API key ─────────────────────────────────────────────────
  setDeeplKey(key: string) {
    this.deeplKey = key;
  }

  // ─── Clear translation cache ───────────────────────────────────────────
  clearCache() {
    cache.clear();
  }
}

export default new TranslationService();