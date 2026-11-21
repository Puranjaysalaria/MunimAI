/**
 * WakeWordProvider Interface
 * Provides hands-free wake word ("Munim") detection across Indic languages and English.
 */

export interface WakeWordOptions {
  keyword?: string;
  language?: string;
  sensitivity?: number;
}

export interface WakeWordProvider {
  readonly id: string;
  readonly name: string;
  readonly isSupported: boolean;
  readonly isListening: boolean;

  startListening(options: WakeWordOptions, onDetected: (command?: string) => void): Promise<void>;
  stopListening(): void;
}

export class StubWakeWordProvider implements WakeWordProvider {
  readonly id = 'stub';
  readonly name = 'Postponed Wake Word Stub';
  readonly isSupported = false;
  readonly isListening = false;

  async startListening(_options: WakeWordOptions, _onDetected: (command?: string) => void): Promise<void> {
    // Intentionally no-op; stub implementation
  }

  stopListening(): void {
    // Intentionally no-op
  }
}

export const defaultWakeWordProvider = new StubWakeWordProvider();
export {
  webSpeechWakeWordProvider,
  WebSpeechWakeWordProvider,
  extractWakeWordAndCommand,
} from './webSpeechWakeWordProvider';
