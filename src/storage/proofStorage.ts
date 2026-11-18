import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  saveOfflineProofClip,
  getProofClipByTransactionId,
  deleteOfflineProofClip,
} from '../offline/db';

export interface ProofUploadResult {
  clipId: string;
  storagePath: string;
  playbackUrl: string;
  synced: boolean;
  timestamp: string;
}

/**
 * Saves and uploads customer audio proof clip
 * Saves locally in IndexedDB first, then syncs to Supabase Storage if online.
 */
export async function storeCustomerProofClip(params: {
  transactionId: string;
  shopId: string;
  audioBlob: Blob;
  mimeType?: string;
  durationMs?: number;
}): Promise<ProofUploadResult> {
  const clipId = `proof-${params.transactionId}-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const mimeType = params.mimeType || 'audio/webm';
  const durationMs = params.durationMs || 5000;

  // 1. Always cache in IndexedDB first (offline resilience)
  await saveOfflineProofClip({
    id: clipId,
    transactionId: params.transactionId,
    shopId: params.shopId,
    audioBlob: params.audioBlob,
    mimeType,
    durationMs,
    recordedAt: timestamp,
    synced: false,
  });

  // Default playback URL from local blob object
  let playbackUrl = URL.createObjectURL(params.audioBlob);
  let storagePath = `${params.shopId}/${params.transactionId}.webm`;
  let isSynced = false;

  // 2. If online and Supabase Storage configured, upload to private bucket
  if (isSupabaseConfigured() && navigator.onLine) {
    try {
      const fileName = `${params.shopId}/${params.transactionId}_${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('proof-clips')
        .upload(fileName, params.audioBlob, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data) {
        storagePath = data.path;
        isSynced = true;

        // Create signed URL for playback (private bucket)
        const { data: signedData } = await supabase.storage
          .from('proof-clips')
          .createSignedUrl(data.path, 3600); // 1 hour validity

        if (signedData?.signedUrl) {
          playbackUrl = signedData.signedUrl;
        }

        // Update local IndexedDB with remote path & sync status
        await saveOfflineProofClip({
          id: clipId,
          transactionId: params.transactionId,
          shopId: params.shopId,
          audioBlob: params.audioBlob,
          mimeType,
          durationMs,
          recordedAt: timestamp,
          synced: true,
        });
      }
    } catch {
      // Keep offline blob URL on upload failure
    }
  }

  return {
    clipId,
    storagePath,
    playbackUrl,
    synced: isSynced,
    timestamp,
  };
}

/**
 * Gets a playable audio URL for a given transaction's proof clip
 */
export async function getPlayableProofUrl(
  transactionId: string,
  storagePath?: string | null
): Promise<string | null> {
  // 1. Check local IndexedDB first
  try {
    const localClip = await getProofClipByTransactionId(transactionId);
    if (localClip && localClip.audioBlob) {
      return URL.createObjectURL(localClip.audioBlob);
    }
  } catch {}

  // 2. If storagePath exists and Supabase is configured, fetch signed URL
  if (storagePath && isSupabaseConfigured() && navigator.onLine) {
    try {
      const { data } = await supabase.storage
        .from('proof-clips')
        .createSignedUrl(storagePath, 3600);
      if (data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {}
  }

  return null;
}

/**
 * Deletes customer proof clip per privacy requirements
 */
export async function removeProofClip(
  clipId: string,
  storagePath?: string | null
): Promise<void> {
  // 1. Delete from IndexedDB
  await deleteOfflineProofClip(clipId);

  // 2. Delete from Supabase Storage if configured
  if (storagePath && isSupabaseConfigured()) {
    try {
      await supabase.storage.from('proof-clips').remove([storagePath]);
    } catch {}
  }
}
