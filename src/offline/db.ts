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
      type: 'add_transaction' | 'upload_proof' | 'delete_proof';
      payload: any;
      timestamp: string;
    };
  };
}

const DB_NAME = 'munim_ai_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MunimDBSchema>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<MunimDBSchema>> {
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
  const db = await getOfflineDB();
  await db.put('proofClips', {
    ...clip,
    synced: clip.synced ?? false,
  });
}

// Retrieve audio proof clip by transactionId
export async function getProofClipByTransactionId(transactionId: string) {
  const db = await getOfflineDB();
  const tx = db.transaction('proofClips', 'readonly');
  const index = tx.store.index('by-transaction');
  return index.get(transactionId);
}

// Delete audio proof clip
export async function deleteOfflineProofClip(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('proofClips', id);
}

// List all proof clips
export async function getAllOfflineProofClips() {
  const db = await getOfflineDB();
  return db.getAll('proofClips');
}
