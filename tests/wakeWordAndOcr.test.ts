import { describe, it, expect } from 'vitest';
import {
  webSpeechWakeWordProvider,
  WebSpeechWakeWordProvider,
  defaultWakeWordProvider,
  StubWakeWordProvider,
  extractWakeWordAndCommand,
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

  describe('extractWakeWordAndCommand', () => {
    it('detects wake word alone in English and Indic scripts', () => {
      expect(extractWakeWordAndCommand('Munim')).toEqual({ matched: true, command: '' });
      expect(extractWakeWordAndCommand('Hey Munim')).toEqual({ matched: true, command: '' });
      expect(extractWakeWordAndCommand('Munim ji')).toEqual({ matched: true, command: '' });
      expect(extractWakeWordAndCommand('Muneem')).toEqual({ matched: true, command: '' });
      expect(extractWakeWordAndCommand('मुनीम')).toEqual({ matched: true, command: '' });
      expect(extractWakeWordAndCommand('सुनो मुनीम जी')).toEqual({ matched: true, command: '' });
      expect(extractWakeWordAndCommand('ਮੁਨੀਮ')).toEqual({ matched: true, command: '' });
      expect(extractWakeWordAndCommand('મુનીમ')).toEqual({ matched: true, command: '' });
    });

    it('extracts command uttered in single breath after wake word', () => {
      expect(extractWakeWordAndCommand('Munim 200 udhaar Ramesh')).toEqual({
        matched: true,
        command: '200 udhaar Ramesh',
      });
      expect(extractWakeWordAndCommand('Hey Munim doodh ka rate 60 kardo')).toEqual({
        matched: true,
        command: 'doodh ka rate 60 kardo',
      });
      expect(extractWakeWordAndCommand('सुनो मुनीम जी रमेश को 500 उधार')).toEqual({
        matched: true,
        command: 'रमेश को 500 उधार',
      });
      expect(extractWakeWordAndCommand('ਮੁਨੀਮ ਜੀ 100 ਰੁਪਏ ਜਮ੍ਹਾਂ')).toEqual({
        matched: true,
        command: '100 ਰੁਪਏ ਜਮ੍ਹਾਂ',
      });
      expect(extractWakeWordAndCommand('મુનીમ દૂધ નો ભાવ 60 કરો')).toEqual({
        matched: true,
        command: 'દૂધ નો ભાવ 60 કરો',
      });
    });

    it('returns matched=false for unrelated voice transcripts', () => {
      expect(extractWakeWordAndCommand('Ramesh 500 udhaar')).toEqual({
        matched: false,
        command: '',
      });
      expect(extractWakeWordAndCommand('Chini 2 kilo')).toEqual({
        matched: false,
        command: '',
      });
      expect(extractWakeWordAndCommand('')).toEqual({
        matched: false,
        command: '',
      });
    });
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
