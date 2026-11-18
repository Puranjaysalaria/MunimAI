import { describe, it, expect, beforeEach } from 'vitest';

// In-memory IndexedDB simulation for unit testing proof storage
class MockProofStorage {
  private clips = new Map<string, any>();

  async save(clip: { id: string; transactionId: string; shopId: string; durationMs: number; recordedAt: string }) {
    this.clips.set(clip.id, { ...clip, synced: false });
    return clip.id;
  }

  async getByTransaction(transactionId: string) {
    for (const clip of this.clips.values()) {
      if (clip.transactionId === transactionId) return clip;
    }
    return null;
  }

  async delete(id: string) {
    this.clips.delete(id);
  }

  getAll() {
    return Array.from(this.clips.values());
  }
}

describe('Customer Voice Proof Storage & Privacy Compliance', () => {
  let storage: MockProofStorage;

  beforeEach(() => {
    storage = new MockProofStorage();
  });

  it('saves 5-second customer consent audio clip to local store', async () => {
    const clipId = 'proof-tx-101-179495';
    await storage.save({
      id: clipId,
      transactionId: 'tx-101',
      shopId: 'shop-sharma-1',
      durationMs: 5000,
      recordedAt: new Date().toISOString(),
    });

    const saved = await storage.getByTransaction('tx-101');
    expect(saved).not.toBeNull();
    expect(saved.id).toBe(clipId);
    expect(saved.durationMs).toBe(5000);
    expect(saved.synced).toBe(false);
  });

  it('allows shopkeeper to retrieve proof for playback in Ledger', async () => {
    await storage.save({
      id: 'proof-ramesh-500',
      transactionId: 'tx-recent-ramesh-sharma',
      shopId: 'shop-sharma-1',
      durationMs: 5000,
      recordedAt: new Date().toISOString(),
    });

    const retrieved = await storage.getByTransaction('tx-recent-ramesh-sharma');
    expect(retrieved).not.toBeNull();
    expect(retrieved.transactionId).toBe('tx-recent-ramesh-sharma');
  });

  it('complies with right-to-delete by removing customer clip completely', async () => {
    const clipId = 'proof-to-delete';
    await storage.save({
      id: clipId,
      transactionId: 'tx-delete-test',
      shopId: 'shop-sharma-1',
      durationMs: 5000,
      recordedAt: new Date().toISOString(),
    });

    expect(storage.getAll().length).toBe(1);

    // Delete clip
    await storage.delete(clipId);
    expect(storage.getAll().length).toBe(0);
    expect(await storage.getByTransaction('tx-delete-test')).toBeNull();
  });
});
