export const DB_NAME = 'snippets';
export const DB_VERSION = 1;

const memoryStores = {
  snippets: new Map(),
  tags: new Map(),
  preferences: new Map(),
  syncQueue: new Map()
};

function hasIndexedDb() {
  return typeof globalThis.indexedDB !== 'undefined';
}

function memoryKey(storeName, value) {
  if (storeName === 'snippets') return value.id;
  if (storeName === 'tags') return value.name;
  if (storeName === 'preferences') return value.key;
  if (storeName === 'syncQueue') return value.id;
  throw new Error(`Unknown store: ${storeName}`);
}

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

function transactionPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error || new Error('IndexedDB transaction aborted')), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error || new Error('IndexedDB transaction failed')), { once: true });
  });
}

export function openSnippetsDb() {
  if (!hasIndexedDb()) throw new Error('IndexedDB is unavailable in this environment');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('snippets')) db.createObjectStore('snippets', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('tags')) db.createObjectStore('tags', { keyPath: 'name' });
      if (!db.objectStoreNames.contains('preferences')) db.createObjectStore('preferences', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'id' });
    });
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

export async function dbGet(storeName, key) {
  if (!hasIndexedDb()) return clone(memoryStores[storeName].get(key));
  const db = await openSnippetsDb();
  try {
    const tx = db.transaction(storeName, 'readonly');
    return await requestPromise(tx.objectStore(storeName).get(key));
  } finally { db.close(); }
}

export async function dbGetAll(storeName) {
  if (!hasIndexedDb()) return [...memoryStores[storeName].values()].map(clone);
  const db = await openSnippetsDb();
  try {
    const tx = db.transaction(storeName, 'readonly');
    return await requestPromise(tx.objectStore(storeName).getAll());
  } finally { db.close(); }
}

export async function dbPut(storeName, value) {
  if (!hasIndexedDb()) {
    memoryStores[storeName].set(memoryKey(storeName, value), clone(value));
    return clone(value);
  }
  const db = await openSnippetsDb();
  try {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    await transactionPromise(tx);
    return value;
  } finally { db.close(); }
}

export async function dbDelete(storeName, key) {
  if (!hasIndexedDb()) { memoryStores[storeName].delete(key); return; }
  const db = await openSnippetsDb();
  try {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    await transactionPromise(tx);
  } finally { db.close(); }
}


export async function dbClear(storeName) {
  if (!hasIndexedDb()) { memoryStores[storeName].clear(); return; }
  const db = await openSnippetsDb();
  try {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    await transactionPromise(tx);
  } finally { db.close(); }
}

export async function withReadWriteStore(storeName, callback) {
  if (!hasIndexedDb()) {
    const map = memoryStores[storeName];
    const store = {
      getAll: () => [...map.values()].map(clone),
      get: key => clone(map.get(key)),
      put: value => { map.set(memoryKey(storeName, value), clone(value)); return value; },
      delete: key => map.delete(key)
    };
    return callback(store, value => Promise.resolve(value));
  }
  const db = await openSnippetsDb();
  try {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const result = await callback(store, requestPromise);
    await transactionPromise(tx);
    return result;
  } finally { db.close(); }
}

export function deleteSnippetsDb() {
  if (!hasIndexedDb()) {
    for (const store of Object.values(memoryStores)) store.clear();
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.addEventListener('success', () => resolve(), { once: true });
    request.addEventListener('blocked', () => reject(new Error('IndexedDB deletion blocked')), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}
