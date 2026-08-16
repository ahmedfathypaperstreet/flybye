/**
 * Tiny IndexedDB wrapper for offline cache.
 *
 * Stores:
 *  - kv         : generic key/value (profile, flights, etc.)
 *  - travelers  : last fetched discover deck (key = id)
 *  - pois       : POI payloads keyed by IATA
 *  - messages   : key = message.id, indexed by conversation_id
 *  - mutations  : queued writes to flush when online (auto-incremented)
 */
import { openDB, type IDBPDatabase } from "idb";

export interface QueuedMutation {
  id?: number;
  kind:
    | "message"
    | "flight-upsert"
    | "flight-delete"
    | "location-share"
    | "edge-function";
  payload: unknown;
  createdAt: number;
  attempts: number;
}

const DB_NAME = "flybye-offline";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        // travelers store is keyed by profile id (was user_id pre-v2)
        if (db.objectStoreNames.contains("travelers")) db.deleteObjectStore("travelers");
        db.createObjectStore("travelers", { keyPath: "id" });
        if (!db.objectStoreNames.contains("pois")) db.createObjectStore("pois");
        // matches store is gone in the unified schema
        if (db.objectStoreNames.contains("matches")) db.deleteObjectStore("matches");
        // messages are now indexed by conversation_id (was match_id pre-v2)
        if (db.objectStoreNames.contains("messages")) db.deleteObjectStore("messages");
        const s = db.createObjectStore("messages", { keyPath: "id" });
        s.createIndex("by-conversation", "conversation_id");
        if (!db.objectStoreNames.contains("mutations")) {
          db.createObjectStore("mutations", { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// Generic key/value
export async function kvSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    await db.put("kv", value, key);
  } catch {
    /* offline cache is best-effort */
  }
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await getDb();
    return (await db.get("kv", key)) as T | undefined;
  } catch {
    return undefined;
  }
}

// Travelers (Discover deck)
export async function cacheTravelers(travelers: Array<{ id: string }>) {
  try {
    const db = await getDb();
    const tx = db.transaction("travelers", "readwrite");
    await tx.store.clear();
    for (const t of travelers) await tx.store.put(t);
    await tx.done;
  } catch {
    /* noop */
  }
}

export async function getCachedTravelers<T = unknown>(): Promise<T[]> {
  try {
    const db = await getDb();
    return (await db.getAll("travelers")) as T[];
  } catch {
    return [];
  }
}

// POIs cache (per IATA)
export async function cachePois(iata: string, payload: unknown) {
  try {
    const db = await getDb();
    await db.put("pois", { payload, savedAt: Date.now() }, iata);
  } catch {
    /* noop */
  }
}

export async function getCachedPois<T = unknown>(iata: string): Promise<T | null> {
  try {
    const db = await getDb();
    const row = await db.get("pois", iata);
    return (row?.payload ?? null) as T | null;
  } catch {
    return null;
  }
}

// Messages
export async function cacheMessages(
  conversationId: string,
  messages: Array<{ id: string }>,
) {
  try {
    const db = await getDb();
    const tx = db.transaction("messages", "readwrite");
    // Delete existing for this conversation
    const idx = tx.store.index("by-conversation");
    let cursor = await idx.openCursor(IDBKeyRange.only(conversationId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    for (const m of messages) await tx.store.put(m);
    await tx.done;
  } catch {
    /* noop */
  }
}

export async function getCachedMessages<T = unknown>(
  conversationId: string,
): Promise<T[]> {
  try {
    const db = await getDb();
    const idx = db.transaction("messages").store.index("by-conversation");
    return (await idx.getAll(conversationId)) as T[];
  } catch {
    return [];
  }
}

// Mutation queue
export async function enqueueMutation(m: Omit<QueuedMutation, "id" | "createdAt" | "attempts">) {
  try {
    const db = await getDb();
    await db.add("mutations", { ...m, createdAt: Date.now(), attempts: 0 });
  } catch {
    /* noop */
  }
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await getDb();
    return (await db.getAll("mutations")) as QueuedMutation[];
  } catch {
    return [];
  }
}

export async function deleteMutation(id: number) {
  try {
    const db = await getDb();
    await db.delete("mutations", id);
  } catch {
    /* noop */
  }
}

export async function bumpMutationAttempts(id: number) {
  try {
    const db = await getDb();
    const row = (await db.get("mutations", id)) as QueuedMutation | undefined;
    if (!row) return;
    row.attempts += 1;
    await db.put("mutations", row);
  } catch {
    /* noop */
  }
}
