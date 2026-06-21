// Tiny IndexedDB wrapper. Every operation is failure-tolerant: on any error it
// resolves to a no-op / undefined, so the offline layer can never break the app.
const DB_NAME = 'babylog-offline'
const VERSION = 1

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB_NAME, VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache')
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function done<T>(req: IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  if (!db) return undefined
  try {
    return (await done(db.transaction('cache', 'readonly').objectStore('cache').get(key))) as T | undefined
  } catch {
    return undefined
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    await done(db.transaction('cache', 'readwrite').objectStore('cache').put(value, key))
  } catch {
    /* ignore */
  }
}

export async function outboxAdd(op: unknown): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    await done(db.transaction('outbox', 'readwrite').objectStore('outbox').add(op))
  } catch {
    /* ignore */
  }
}

export async function outboxAll<T>(): Promise<T[]> {
  const db = await openDb()
  if (!db) return []
  try {
    return ((await done(db.transaction('outbox', 'readonly').objectStore('outbox').getAll())) as T[]) ?? []
  } catch {
    return []
  }
}

export async function outboxRemove(seq: number): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    await done(db.transaction('outbox', 'readwrite').objectStore('outbox').delete(seq))
  } catch {
    /* ignore */
  }
}
