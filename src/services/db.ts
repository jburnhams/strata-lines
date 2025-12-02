
import type { Track, SourceFile, Place } from '@/types';

const DB_NAME = 'gpx-track-db';
const DB_VERSION = 4;
const STORE_NAME = 'tracks';
const SOURCE_FILES_STORE = 'source_files';
const PLACES_STORE = 'places';

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
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        const tracksStore = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
        tracksStore.createIndex('activityType', 'activityType', { unique: false });
        tracksStore.createIndex('startTime', 'startTime', { unique: false });
      } else {
        const tracksStore = transaction!.objectStore(STORE_NAME);
        if (!tracksStore.indexNames.contains('activityType')) {
          tracksStore.createIndex('activityType', 'activityType', { unique: false });
        }
        if (!tracksStore.indexNames.contains('startTime')) {
          tracksStore.createIndex('startTime', 'startTime', { unique: false });
        }
      }

      if (!dbInstance.objectStoreNames.contains(SOURCE_FILES_STORE)) {
        dbInstance.createObjectStore(SOURCE_FILES_STORE, { keyPath: 'id' });
      }

      if (!dbInstance.objectStoreNames.contains(PLACES_STORE)) {
        const placesStore = dbInstance.createObjectStore(PLACES_STORE, { keyPath: 'id' });
        placesStore.createIndex('trackId', 'trackId', { unique: false });
        placesStore.createIndex('source', 'source', { unique: false });
        placesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function getTracksByActivityType(activityType: string): Promise<Track[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('activityType');
    const request = index.getAll(activityType);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Error fetching tracks by activity type:', request.error);
      reject('Error fetching tracks by activity type');
    };
  });
}

export async function getTracksByDateRange(start: number, end: number): Promise<Track[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('startTime');
    const range = IDBKeyRange.bound(start, end);
    const request = index.getAll(range);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Error fetching tracks by date range:', request.error);
      reject('Error fetching tracks by date range');
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

// Place Operations

export async function savePlaceToDb(place: Place): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLACES_STORE, 'readwrite');
    const store = transaction.objectStore(PLACES_STORE);
    const request = store.put(place);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error saving place:', request.error);
      reject('Error saving place');
    };
  });
}

export async function getPlaceFromDb(id: string): Promise<Place | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLACES_STORE, 'readonly');
    const store = transaction.objectStore(PLACES_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Error fetching place:', request.error);
      reject('Error fetching place');
    };
  });
}

export async function getAllPlacesFromDb(): Promise<Place[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLACES_STORE, 'readonly');
    const store = transaction.objectStore(PLACES_STORE);
    const index = store.index('createdAt');
    // Using getAll on an index returns results sorted by that index.
    // However, default IDB direction is ascending. For newest first (descending),
    // we would need a cursor or reverse() the array.
    // Simple way: get all and reverse in memory (fine for expected scale)
    // or use openCursor with 'prev' direction.
    // Since getAll doesn't support direction, we'll sort manually or use cursor if strict sorting needed.
    // But getAll is faster. Let's stick to simple implementation first: getAll via index to at least have them ordered by time, then reverse.
    const request = index.getAll();

    request.onsuccess = () => {
      // Return reversed to have newest first
      resolve((request.result as Place[]).reverse());
    };

    request.onerror = () => {
      console.error('Error fetching all places:', request.error);
      reject('Error fetching all places');
    };
  });
}

export async function getPlacesByTrackId(trackId: string): Promise<Place[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLACES_STORE, 'readonly');
    const store = transaction.objectStore(PLACES_STORE);
    const index = store.index('trackId');
    const request = index.getAll(trackId);

    request.onsuccess = () => {
      const places = request.result as Place[];
      // Sort by source order: start, middle, end
      const sourceOrder: Record<string, number> = {
        'track-start': 0,
        'track-middle': 1,
        'track-end': 2,
        'manual': 3,
        'import': 4
      };

      places.sort((a, b) => {
        const orderA = sourceOrder[a.source] ?? 99;
        const orderB = sourceOrder[b.source] ?? 99;
        return orderA - orderB;
      });

      resolve(places);
    };

    request.onerror = () => {
      console.error('Error fetching places by trackId:', request.error);
      reject('Error fetching places by trackId');
    };
  });
}

export async function deletePlaceFromDb(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLACES_STORE, 'readwrite');
    const store = transaction.objectStore(PLACES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error deleting place:', request.error);
      reject('Error deleting place');
    };
  });
}

export async function updatePlaceInDb(id: string, updates: Partial<Omit<Place, 'id'>>): Promise<Place> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLACES_STORE, 'readwrite');
    const store = transaction.objectStore(PLACES_STORE);

    // First get the existing place
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existingPlace = getRequest.result;
      if (!existingPlace) {
        reject(`Place with id ${id} not found`);
        return;
      }

      // Ensure we don't accidentally overwrite the ID from updates, though the type now prevents it
      const { id: _, ...safeUpdates } = updates as any;
      const updatedPlace = { ...existingPlace, ...safeUpdates };

      const putRequest = store.put(updatedPlace);

      putRequest.onsuccess = () => {
        resolve(updatedPlace);
      };

      putRequest.onerror = () => {
        console.error('Error updating place:', putRequest.error);
        reject('Error updating place');
      };
    };

    getRequest.onerror = () => {
      console.error('Error fetching place for update:', getRequest.error);
      reject('Error fetching place for update');
    };
  });
}

export async function clearAllPlacesFromDb(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLACES_STORE, 'readwrite');
    const store = transaction.objectStore(PLACES_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('Error clearing places:', request.error);
      reject('Error clearing places');
    };
  });
}
