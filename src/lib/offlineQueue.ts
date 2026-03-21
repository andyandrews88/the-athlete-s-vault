import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'vault-offline';
const STORE_NAME = 'pendingWrites';
const DB_VERSION = 1;

export interface PendingWrite {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  matchKey?: string; // column to match on for update/delete
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueWrite(
  write: Omit<PendingWrite, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const db = await getDB();
    await db.add(STORE_NAME, {
      ...write,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[offlineQueue] Failed to queue write:', err);
  }
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
  try {
    const db = await getDB();
    return await db.getAll(STORE_NAME);
  } catch {
    return [];
  }
}

export async function clearWrite(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  } catch (err) {
    console.error('[offlineQueue] Failed to clear write:', err);
  }
}

export async function syncPendingWrites(supabase: any): Promise<number> {
  const writes = await getPendingWrites();
  if (!writes.length) return 0;

  let synced = 0;
  for (const write of writes.sort((a, b) => a.timestamp - b.timestamp)) {
    try {
      const key = write.matchKey || 'id';
      if (write.operation === 'update') {
        const { error } = await supabase
          .from(write.table)
          .update(write.data)
          .eq(key, write.data[key]);
        if (error) throw error;
      } else if (write.operation === 'insert') {
        const { error } = await supabase
          .from(write.table)
          .insert(write.data);
        if (error) throw error;
      } else if (write.operation === 'delete') {
        const { error } = await supabase
          .from(write.table)
          .delete()
          .eq(key, write.data[key]);
        if (error) throw error;
      }
      await clearWrite(write.id);
      synced++;
    } catch (err) {
      console.error('[offlineQueue] Failed to sync write:', write.id, err);
    }
  }
  return synced;
}

export function hasPendingWrites(): Promise<boolean> {
  return getPendingWrites().then(w => w.length > 0);
}
