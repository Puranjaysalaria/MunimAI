export type STTProviderType = 'browser' | 'server';

export interface STTOptions {
  language: 'hi' | 'pa' | 'en' | 'mr' | 'bn' | 'gu' | 'ta' | 'hi-IN' | 'pa-IN' | 'en-IN' | string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export type STTState = 'idle' | 'listening' | 'processing' | 'error';

export interface STTError {
  code: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'aborted' | 'language-not-supported' | 'unknown';
  message: string;
}

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface STTProvider {
  readonly id: string;
  readonly name: string;
  readonly isSupported: boolean;
  state: STTState;

  startListening(
    options: STTOptions,
    callbacks: {
      onResult: (result: STTResult) => void;
      onError: (error: STTError) => void;
      onStateChange: (state: STTState) => void;
    }
  ): Promise<void>;

  stopListening(): void;
  abortListening(): void;
}
