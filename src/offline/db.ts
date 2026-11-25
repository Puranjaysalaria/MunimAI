import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MunimDBSchema extends DBSchema {
  proofClips: {
    key: string; // transactionId or clipId
    value: {
      id: string;
      transactionId: string;
      shopId: string;
      audioBlob: Blob;
      mimeType: string;
      durationMs: number;
      recordedAt: string;
      synced: boolean;
      remotePath?: string;
    };
    indexes: { 'by-transaction': string };
  };
  pendingMutations: {
    key: string;
    value: {
      id: string;
      shopId: string;
      type: 'add_transaction' | 'apply_correction' | 'upload_proof' | 'delete_proof';
      payload: any;
      timestamp: string;
    };
  };
}

const DB_NAME = 'munim_ai_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MunimDBSchema>> | null = null;

// In-memory fallbacks for Node.js test environment or private browser modes
const memoryProofClips = new Map<string, any>();
const memoryMutations = new Map<string, OfflineMutation>();

export function getOfflineDB(): Promise<IDBPDatabase<MunimDBSchema>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (!dbPromise) {
    dbPromise = openDB<MunimDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('proofClips')) {
          const proofStore = db.createObjectStore('proofClips', { keyPath: 'id' });
          proofStore.createIndex('by-transaction', 'transactionId');
        }
        if (!db.objectStoreNames.contains('pendingMutations')) {
          db.createObjectStore('pendingMutations', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// Save audio proof clip locally in IndexedDB
export async function saveOfflineProofClip(clip: {
  id: string;
  transactionId: string;
  shopId: string;
  audioBlob: Blob;
  mimeType: string;
  durationMs: number;
  recordedAt: string;
  synced?: boolean;
}): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    memoryProofClips.set(clip.id, { ...clip, synced: clip.synced ?? false });
    return;
  }
  const db = await getOfflineDB();
  await db.put('proofClips', {
    ...clip,
    synced: clip.synced ?? false,
  });
}

// Retrieve audio proof clip by transactionId
export async function getProofClipByTransactionId(transactionId: string) {
  if (typeof indexedDB === 'undefined') {
    for (const clip of memoryProofClips.values()) {
      if (clip.transactionId === transactionId) return clip;
    }
    return undefined;
  }
  const db = await getOfflineDB();
  const tx = db.transaction('proofClips', 'readonly');
  const index = tx.store.index('by-transaction');
  return index.get(transactionId);
}

// Delete audio proof clip
export async function deleteOfflineProofClip(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    memoryProofClips.delete(id);
    return;
  }
  const db = await getOfflineDB();
  await db.delete('proofClips', id);
}

// List all proof clips
export async function getAllOfflineProofClips() {
  if (typeof indexedDB === 'undefined') {
    return Array.from(memoryProofClips.values());
  }
  const db = await getOfflineDB();
  return db.getAll('proofClips');
}

export interface OfflineMutation {
  id: string;
  shopId: string;
  type: 'add_transaction' | 'apply_correction' | 'upload_proof' | 'delete_proof';
  payload: any;
  timestamp: string;
}

// Enqueue offline mutation into IndexedDB
export async function enqueueOfflineMutation(mutation: OfflineMutation): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    memoryMutations.set(mutation.id, mutation);
    return;
  }
  const db = await getOfflineDB();
  await db.put('pendingMutations', mutation);
}

// Get all pending mutations sorted chronologically
export async function getPendingMutations(): Promise<OfflineMutation[]> {
  if (typeof indexedDB === 'undefined') {
    const list = Array.from(memoryMutations.values());
    return list.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
  const db = await getOfflineDB();
  const mutations = await db.getAll('pendingMutations');
  return mutations.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// Remove single mutation from queue
export async function deleteOfflineMutation(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    memoryMutations.delete(id);
    return;
  }
  const db = await getOfflineDB();
  await db.delete('pendingMutations', id);
}

// Count pending mutations waiting to sync
export async function countPendingMutations(): Promise<number> {
  if (typeof indexedDB === 'undefined') {
    return memoryMutations.size;
  }
  const db = await getOfflineDB();
  return db.count('pendingMutations');
}

// Clear all mutations (e.g. on full reset)
export async function clearAllPendingMutations(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    memoryMutations.clear();
    return;
  }
  const db = await getOfflineDB();
  await db.clear('pendingMutations');
}
