
import type { Track, SourceFile } from '@/types';

const DB_NAME = 'gpx-track-db';
const DB_VERSION = 2;
const STORE_NAME = 'tracks';
const SOURCE_FILES_STORE = 'source_files';

let db: IDBDatabase;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(SOURCE_FILES_STORE)) {
        dbInstance.createObjectStore(SOURCE_FILES_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function getTracks(): Promise<Track[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Error fetching tracks:', request.error);
      reject('Error fetching tracks');
    };
  });
}

export async function addTrack(track: Track): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(track);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error adding track:', request.error);
      reject('Error adding track');
    };
  });
}

export async function deleteTrack(trackId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(trackId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error deleting track:', request.error);
      reject('Error deleting track');
    };
  });
}

export async function clearTracks(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, SOURCE_FILES_STORE], 'readwrite');
    const trackStore = transaction.objectStore(STORE_NAME);
    const fileStore = transaction.objectStore(SOURCE_FILES_STORE);

    trackStore.clear();
    fileStore.clear();

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      console.error('Error clearing tracks and files:', transaction.error);
      reject('Error clearing tracks and files');
    };
  });
}

// Source File Operations

export async function saveSourceFile(file: SourceFile): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SOURCE_FILES_STORE, 'readwrite');
    const store = transaction.objectStore(SOURCE_FILES_STORE);
    const request = store.put(file);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error saving source file:', request.error);
      reject('Error saving source file');
    };
  });
}

export async function getSourceFile(id: string): Promise<SourceFile | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SOURCE_FILES_STORE, 'readonly');
    const store = transaction.objectStore(SOURCE_FILES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Error fetching source file:', request.error);
      reject('Error fetching source file');
    };
  });
}

export async function deleteSourceFile(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SOURCE_FILES_STORE, 'readwrite');
    const store = transaction.objectStore(SOURCE_FILES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error deleting source file:', request.error);
      reject('Error deleting source file');
    };
  });
}
