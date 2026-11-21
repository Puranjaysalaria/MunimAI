/**
 * WakeWordProvider Interface Stub
 * Note: Wake word ("Munim") detection is postponed per architectural spec.
 * This file maintains the interface definition and stub implementation without active background audio processing.
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

  startListening(options: WakeWordOptions, onDetected: () => void): Promise<void>;
  stopListening(): void;
}

export class StubWakeWordProvider implements WakeWordProvider {
  readonly id = 'stub';
  readonly name = 'Postponed Wake Word Stub';
  readonly isSupported = false;
  readonly isListening = false;

  async startListening(_options: WakeWordOptions, _onDetected: () => void): Promise<void> {
    // Intentionally no-op; wake word postponed
  }

  stopListening(): void {
    // Intentionally no-op
  }
}

export const defaultWakeWordProvider = new StubWakeWordProvider();
export { webSpeechWakeWordProvider, WebSpeechWakeWordProvider } from './webSpeechWakeWordProvider';
