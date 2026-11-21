import { describe, it, expect } from 'vitest';
import {
  webSpeechWakeWordProvider,
  WebSpeechWakeWordProvider,
  defaultWakeWordProvider,
  StubWakeWordProvider,
} from '../src/voice/wakeWord/types';
import { parseBillPhotoWithGemini } from '../src/lib/billOcrService';

describe('Hands-free Wake Word & Edge OCR Services', () => {
  it('instantiates wake word providers with proper interfaces', () => {
    expect(defaultWakeWordProvider).toBeInstanceOf(StubWakeWordProvider);
    expect(webSpeechWakeWordProvider).toBeInstanceOf(WebSpeechWakeWordProvider);
    expect(webSpeechWakeWordProvider.id).toBe('webspeech-wakeword');
    expect(webSpeechWakeWordProvider.name).toBe('Web Speech Wake Word Provider');
    expect(typeof webSpeechWakeWordProvider.startListening).toBe('function');
    expect(typeof webSpeechWakeWordProvider.stopListening).toBe('function');
  });

  it('safely handles stopListening when not active', () => {
    expect(() => webSpeechWakeWordProvider.stopListening()).not.toThrow();
    expect(webSpeechWakeWordProvider.isListening).toBe(false);
  });

  it('gracefully falls back to mock items when parsing bill photo in offline test environment', async () => {
    const dummyBase64 = 'data:image/jpeg;base64,dGVzdA==';
    const result = await parseBillPhotoWithGemini(dummyBase64);
    expect(result.success).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.totalAmount).toBeGreaterThan(0);
    // Verifies that extracted bill items contain MRP
    result.items.forEach((it) => {
      expect(it.price).toBeGreaterThan(0);
      expect(it.mrp).toBeDefined();
    });
  });
});
