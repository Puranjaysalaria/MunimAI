import { STTProvider, STTProviderType } from './types';
import { BrowserSpeechProvider } from './browserSpeechProvider';
import { ServerSpeechProvider } from './serverSpeechProvider';
import { GnaniSttProvider } from './gnaniSttProvider';
import { getLanguageVoiceProfile, isCloudSpeechKillSwitchActive } from '../voice/speechConfig';

export * from './types';
export * from './browserSpeechProvider';
export * from './serverSpeechProvider';
export * from './gnaniSttProvider';
export * from './audioClipProcessor';

export function createSTTProvider(
  type?: STTProviderType | 'gnani',
  options?: { language?: string; cloudSpeechEnabled?: boolean }
): STTProvider {
  if (type !== undefined && type !== 'browser' && type !== 'server' && type !== 'gnani') {
    throw new Error(`Unknown STT provider: ${String(type)}`);
  }

  if (options?.cloudSpeechEnabled === false || isCloudSpeechKillSwitchActive()) {
    return new BrowserSpeechProvider();
  }

  const envType =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_STT_PROVIDER as STTProviderType | 'gnani' | undefined)
      : undefined;

  const profile = options?.language ? getLanguageVoiceProfile(options.language) : null;
  const chosenType =
    type ||
    (profile ? profile.sttProvider : undefined) ||
    envType ||
    'browser';

  if (chosenType === 'gnani') {
    return new GnaniSttProvider();
  }

  if (chosenType === 'server') {
    if (!profile || profile.sttProvider === 'gnani') {
      return new GnaniSttProvider();
    }
    return new ServerSpeechProvider();
  }

  return new BrowserSpeechProvider();
}
