import { LanguageCode } from '../i18n/types';
import type { Shop } from '../types/schema';

export type ListeningProviderId = 'gnani' | 'browser';
export type SpeakingProviderId = 'pack' | 'gnani' | 'device' | 'text';
export type HinglishMode = 'auto' | 'mixed' | 'off';

export interface LanguageVoiceProfile {
  language: LanguageCode;
  sttProvider: ListeningProviderId;
  sttModel: string;
  sttLanguageCode: string;
  hinglishMode: HinglishMode;
  supportsMixedLanguage: boolean;
  ttsProvider: 'gnani' | 'device';
  ttsModel: string;
  ttsVoice: string;
  ttsLanguageCode: string;
  numbersAsWords: boolean;
}

export const DEFAULT_DAILY_BUDGET_INR = 5;
export const DEFAULT_MONTHLY_BUDGET_INR = 50;
export const DEFAULT_GLOBAL_MONTHLY_BUDGET_INR = 200;
export const DEFAULT_GLOBAL_RPM = 50;
export const GNANI_STT_RATE_INR_PER_SEC = 0.015; // ₹0.015 / sec (~₹0.90 / min)
export const GNANI_TTS_RATE_INR_PER_CHAR = 0.0005; // ₹0.50 / 1000 chars

// Fail-closed cloud defaults: every language starts on 'browser' STT and 'device' TTS
// until explicitly enabled via config or localStorage device override.
export const VOICE_LANGUAGE_PROFILES: Record<LanguageCode, LanguageVoiceProfile> = {
  hi: {
    language: 'hi',
    sttProvider: 'browser',
    sttModel: 'prisma-v3.0',
    sttLanguageCode: 'hi-IN',
    hinglishMode: 'mixed',
    supportsMixedLanguage: true,
    ttsProvider: 'device',
    ttsModel: 'timbre-v2.5',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'hi-IN',
    numbersAsWords: true,
  },
  en: {
    language: 'en',
    sttProvider: 'browser',
    sttModel: 'prisma-v3.0',
    sttLanguageCode: 'en-IN',
    hinglishMode: 'auto',
    supportsMixedLanguage: true,
    ttsProvider: 'device',
    ttsModel: 'timbre-v2.5',
    ttsVoice: 'Kaveri',
    ttsLanguageCode: 'en-IN',
    numbersAsWords: false,
  },
  pa: {
    language: 'pa',
    sttProvider: 'browser',
    sttModel: 'prisma-v2.5',
    sttLanguageCode: 'pa-IN',
    hinglishMode: 'off',
    supportsMixedLanguage: false,
    ttsProvider: 'device',
    ttsModel: 'timbre-v3.0',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'pa-IN',
    numbersAsWords: true,
  },
  gu: {
    language: 'gu',
    sttProvider: 'browser',
    sttModel: 'prisma-v2.5',
    sttLanguageCode: 'gu-IN',
    hinglishMode: 'off',
    supportsMixedLanguage: false,
    ttsProvider: 'device',
    ttsModel: 'timbre-v3.0',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'gu-IN',
    numbersAsWords: true,
  },
  mr: {
    language: 'mr',
    sttProvider: 'browser',
    sttModel: 'prisma-v2.5',
    sttLanguageCode: 'mr-IN',
    hinglishMode: 'off',
    supportsMixedLanguage: false,
    ttsProvider: 'device',
    ttsModel: 'timbre-v3.0',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'mr-IN',
    numbersAsWords: true,
  },
  bn: {
    language: 'bn',
    sttProvider: 'browser',
    sttModel: 'prisma-v2.5',
    sttLanguageCode: 'bn-IN',
    hinglishMode: 'off',
    supportsMixedLanguage: false,
    ttsProvider: 'device',
    ttsModel: 'timbre-v3.0',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'bn-IN',
    numbersAsWords: true,
  },
  ta: {
    language: 'ta',
    sttProvider: 'browser',
    sttModel: 'prisma-v2.5',
    sttLanguageCode: 'ta-IN',
    hinglishMode: 'off',
    supportsMixedLanguage: false,
    ttsProvider: 'device',
    ttsModel: 'timbre-v3.0',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'ta-IN',
    numbersAsWords: true,
  },
  te: {
    language: 'te',
    sttProvider: 'browser',
    sttModel: 'prisma-v2.5',
    sttLanguageCode: 'te-IN',
    hinglishMode: 'off',
    supportsMixedLanguage: false,
    ttsProvider: 'device',
    ttsModel: 'timbre-v3.0',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'te-IN',
    numbersAsWords: true,
  },
  kn: {
    language: 'kn',
    sttProvider: 'browser',
    sttModel: 'prisma-v2.5',
    sttLanguageCode: 'kn-IN',
    hinglishMode: 'off',
    supportsMixedLanguage: false,
    ttsProvider: 'device',
    ttsModel: 'timbre-v3.0',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'kn-IN',
    numbersAsWords: true,
  },
  ml: {
    language: 'ml',
    sttProvider: 'browser',
    sttModel: 'prisma-v2.5',
    sttLanguageCode: 'ml-IN',
    hinglishMode: 'off',
    supportsMixedLanguage: false,
    ttsProvider: 'device',
    ttsModel: 'timbre-v3.0',
    ttsVoice: 'Nalini',
    ttsLanguageCode: 'ml-IN',
    numbersAsWords: true,
  },
};

export interface DeviceProviderOverride {
  stt?: 'default' | 'gnani' | 'browser';
  tts?: 'default' | 'gnani' | 'device';
}

const DEVICE_OVERRIDE_STORAGE_KEY = 'munim_voice_provider_overrides_v1';
const memoryDeviceOverrides: Partial<Record<string, DeviceProviderOverride>> = {};

export function getDeviceProviderOverride(lang: LanguageCode | string): DeviceProviderOverride {
  const key = (lang || 'hi').slice(0, 2);
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DEVICE_OVERRIDE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, DeviceProviderOverride>;
        if (parsed[key]) return parsed[key];
      }
    }
  } catch {
    // ignore storage errors
  }
  return memoryDeviceOverrides[key] || { stt: 'default', tts: 'default' };
}

export function setDeviceProviderOverride(
  lang: LanguageCode | string,
  override: DeviceProviderOverride
): void {
  const key = (lang || 'hi').slice(0, 2);
  memoryDeviceOverrides[key] = override;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DEVICE_OVERRIDE_STORAGE_KEY);
      const parsed: Record<string, DeviceProviderOverride> = raw ? JSON.parse(raw) : {};
      parsed[key] = override;
      localStorage.setItem(DEVICE_OVERRIDE_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
}

export function clearDeviceProviderOverridesForTest(): void {
  for (const k of Object.keys(memoryDeviceOverrides)) {
    delete memoryDeviceOverrides[k];
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DEVICE_OVERRIDE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function getLanguageVoiceProfile(lang: LanguageCode | string): LanguageVoiceProfile {
  const key = (lang || 'hi').slice(0, 2) as LanguageCode;
  const base = VOICE_LANGUAGE_PROFILES[key] || VOICE_LANGUAGE_PROFILES.hi;
  const ov = getDeviceProviderOverride(key);
  return {
    ...base,
    sttProvider: ov.stt && ov.stt !== 'default' ? ov.stt : base.sttProvider,
    ttsProvider: ov.tts && ov.tts !== 'default' ? ov.tts : base.ttsProvider,
  };
}

export function estimateSttCostInr(durationMs: number): number {
  const seconds = Math.max(0, durationMs) / 1000;
  return Number((seconds * GNANI_STT_RATE_INR_PER_SEC).toFixed(6));
}

export function estimateTtsCostInr(charCount: number): number {
  const chars = Math.max(0, charCount);
  return Number((chars * GNANI_TTS_RATE_INR_PER_CHAR).toFixed(6));
}

export interface VoiceTelemetryState {
  date: string;
  dailyBudgetInr: number;
  spendByProvider: {
    gnani_stt: number;
    gnani_tts: number;
    browser_stt: number;
    device_tts: number;
  };
  lastLatencyMs: {
    stt: number | null;
    tts: number | null;
  };
  lastActiveProvider: {
    stt: ListeningProviderId;
    tts: SpeakingProviderId;
  };
  killSwitch: boolean;
}

const TELEMETRY_STORAGE_KEY = 'munim_voice_telemetry_v1';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialTelemetry(): VoiceTelemetryState {
  return {
    date: todayKey(),
    dailyBudgetInr: DEFAULT_DAILY_BUDGET_INR,
    spendByProvider: {
      gnani_stt: 0,
      gnani_tts: 0,
      browser_stt: 0,
      device_tts: 0,
    },
    lastLatencyMs: { stt: null, tts: null },
    lastActiveProvider: { stt: 'browser', tts: 'device' },
    killSwitch: false,
  };
}

let memoryTelemetry: VoiceTelemetryState = createInitialTelemetry();

export function getVoiceTelemetry(): VoiceTelemetryState {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VoiceTelemetryState;
        if (parsed.date === todayKey()) {
          memoryTelemetry = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  if (memoryTelemetry.date !== todayKey()) {
    memoryTelemetry = createInitialTelemetry();
  }
  return memoryTelemetry;
}

function saveVoiceTelemetry(state: VoiceTelemetryState): void {
  memoryTelemetry = state;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore
  }
}

export function resetVoiceTelemetryForTest(overrides?: Partial<VoiceTelemetryState>): void {
  const base = createInitialTelemetry();
  saveVoiceTelemetry({ ...base, ...overrides });
}

export function setVoiceKillSwitch(enabled: boolean): void {
  const cur = getVoiceTelemetry();
  saveVoiceTelemetry({ ...cur, killSwitch: enabled });
}

export function setDailyVoiceBudgetInr(budgetInr: number): void {
  const cur = getVoiceTelemetry();
  saveVoiceTelemetry({ ...cur, dailyBudgetInr: Math.max(0, budgetInr) });
}

export function getTodayTotalSpendInr(): number {
  const { spendByProvider } = getVoiceTelemetry();
  return Number(
    (
      spendByProvider.gnani_stt +
      spendByProvider.gnani_tts +
      spendByProvider.browser_stt +
      spendByProvider.device_tts
    ).toFixed(4)
  );
}

export function getRemainingVoiceBudgetInr(): number {
  const t = getVoiceTelemetry();
  return Math.max(0, Number((t.dailyBudgetInr - getTodayTotalSpendInr()).toFixed(4)));
}

export function recordVoiceUsage(params: {
  channel: 'stt' | 'tts';
  provider: 'gnani_stt' | 'gnani_tts' | 'browser_stt' | 'device_tts';
  activeProviderLabel: ListeningProviderId | SpeakingProviderId;
  latencyMs: number;
  costInr: number;
}): void {
  const cur = getVoiceTelemetry();
  const next: VoiceTelemetryState = {
    ...cur,
    spendByProvider: {
      ...cur.spendByProvider,
      [params.provider]: Number((cur.spendByProvider[params.provider] + params.costInr).toFixed(6)),
    },
    lastLatencyMs: {
      ...cur.lastLatencyMs,
      [params.channel]: Math.round(params.latencyMs),
    },
    lastActiveProvider: {
      ...cur.lastActiveProvider,
      [params.channel]: params.activeProviderLabel,
    },
  };
  saveVoiceTelemetry(next);
}

export function isCloudSpeechKillSwitchActive(): boolean {
  const envKill =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_VOICE_CLOUD_KILL_SWITCH === 'true'
      : false;
  return envKill || getVoiceTelemetry().killSwitch;
}

export function isCloudSpeechAllowedForShop(shop?: Shop | null): boolean {
  if (isCloudSpeechKillSwitchActive()) return false;
  if (getRemainingVoiceBudgetInr() <= 0) return false;
  if (!shop) return true; // Default test / standalone mode
  const hasConsent = Boolean(shop.settings?.cloud_speech_consent_at);
  const switchEnabled = shop.settings?.cloud_speech_enabled !== false;
  return hasConsent && switchEnabled;
}
