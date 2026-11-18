import { STTProvider, STTProviderType } from './types';
import { BrowserSpeechProvider } from './browserSpeechProvider';
import { ServerSpeechProvider } from './serverSpeechProvider';

export * from './types';
export * from './browserSpeechProvider';
export * from './serverSpeechProvider';

export function createSTTProvider(type?: STTProviderType): STTProvider {
  const chosenType =
    type || (import.meta.env.VITE_STT_PROVIDER as STTProviderType) || 'browser';

  if (chosenType === 'server') {
    return new ServerSpeechProvider();
  }

  return new BrowserSpeechProvider();
}
