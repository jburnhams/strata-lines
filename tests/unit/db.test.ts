import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Track } from '@/types';

type StoreRequestConfig<T> =
  | { kind: 'success'; value: T }
  | { kind: 'error'; error: Error };

type IndexedDBMockConfig = {
  getAll?: StoreRequestConfig<Track[]>;
  put?: StoreRequestConfig<void>;
  delete?: StoreRequestConfig<void>;
  clear?: StoreRequestConfig<void>;
  failOpen?: Error;
  triggerUpgrade?: boolean;
};

const originalIndexedDB = globalThis.indexedDB;

function createRequest<T>(config: StoreRequestConfig<T>): IDBRequest<T> {
  const request: Partial<IDBRequest<T>> & { result?: T; error?: Error } = {
    result: config.kind === 'success' ? config.value : undefined,
    error: config.kind === 'error' ? config.error : undefined,
    onsuccess: null,
    onerror: null,
  };

  setTimeout(() => {
    if (config.kind === 'success') {
      request.onsuccess?.({ target: { result: config.value } } as unknown as Event);
    } else {
      request.onerror?.({ target: { error: config.error } } as unknown as Event);
    }
  }, 0);

  return request as IDBRequest<T>;
}

function setupIndexedDB(config: IndexedDBMockConfig = {}) {
  const store = {
    getAll: jest.fn(() => createRequest(config.getAll ?? { kind: 'success', value: [] })),
    put: jest.fn(() => createRequest(config.put ?? { kind: 'success', value: undefined })),
    delete: jest.fn(() => createRequest(config.delete ?? { kind: 'success', value: undefined })),
    clear: jest.fn(() => createRequest(config.clear ?? { kind: 'success', value: undefined })),
  };

  const objectStore = jest.fn(() => store);
  const transaction = jest.fn((_name: string, _mode: IDBTransactionMode) => ({ objectStore }));

  const createObjectStore = jest.fn();
  const contains = jest.fn(() => !config.triggerUpgrade);

  const dbInstance = {
    transaction: transaction as unknown as IDBDatabase['transaction'],
    objectStoreNames: { contains } as unknown as DOMStringList,
    createObjectStore: createObjectStore as unknown as IDBDatabase['createObjectStore'],
    close: jest.fn(),
    name: 'gpx-track-db',
    version: 1,
    onabort: null,
    onclose: null,
    onerror: null,
    onversionchange: null,
  } as unknown as IDBDatabase;

  const openRequest: Partial<IDBOpenDBRequest> & { result: IDBDatabase; error?: Error } = {
    result: dbInstance,
    error: config.failOpen,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  };

  (globalThis as any).indexedDB = {
    open: jest.fn(() => {
      setTimeout(() => {
        if (config.triggerUpgrade) {
          openRequest.onupgradeneeded?.({
            target: {
              result: dbInstance,
            },
          } as unknown as IDBVersionChangeEvent);
        }

        if (config.failOpen) {
          openRequest.onerror?.({ target: { error: config.failOpen } } as unknown as Event);
        } else {
          openRequest.onsuccess?.({ target: { result: dbInstance } } as unknown as Event);
        }
      }, 0);

      return openRequest as IDBOpenDBRequest;
    }),
  } as IDBFactory;

  return {
    store,
    transaction,
    objectStore,
    createObjectStore,
    contains,
  };
}

async function importDBModule() {
  return await import('@/services/db');
}

describe('Database Service', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalIndexedDB) {
      globalThis.indexedDB = originalIndexedDB;
    } else {
      delete (globalThis as any).indexedDB;
    }
  });

  it('creates the tracks store during upgrade if it does not exist', async () => {
    const { createObjectStore, contains } = setupIndexedDB({ triggerUpgrade: true });
    const { getTracks } = await importDBModule();

    const tracksPromise = getTracks();
    await expect(tracksPromise).resolves.toEqual([]);

    expect(contains).toHaveBeenCalledWith('tracks');
    expect(createObjectStore).toHaveBeenCalledWith('tracks', { keyPath: 'id' });
  });

  it('rejects when the database cannot be opened', async () => {
    setupIndexedDB({ failOpen: new Error('boom') });
    const { getTracks } = await importDBModule();

    await expect(getTracks()).rejects.toBe('Error opening database');
  });

  it('retrieves tracks from the object store', async () => {
    const tracks: Track[] = [
      {
        id: 'track-1',
        name: 'Morning Ride',
        points: [[51.5, -0.1]],
        length: 10,
        isVisible: true,
      },
    ];

    const { store } = setupIndexedDB({
      getAll: { kind: 'success', value: tracks },
    });

    const { getTracks } = await importDBModule();
    await expect(getTracks()).resolves.toEqual(tracks);
    expect(store.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates read failures from the object store', async () => {
    setupIndexedDB({ getAll: { kind: 'error', error: new Error('read failed') } });
    const { getTracks } = await importDBModule();

    await expect(getTracks()).rejects.toBe('Error fetching tracks');
  });

  it('stores tracks successfully', async () => {
    const track: Track = {
      id: 'track-1',
      name: 'Commute',
      points: [[51.5, -0.1]],
      length: 12.5,
      isVisible: true,
    };

    const { store } = setupIndexedDB();
    const { addTrack } = await importDBModule();

    await expect(addTrack(track)).resolves.toBeUndefined();
    expect(store.put).toHaveBeenCalledWith(track);
  });

  it('rejects when storing tracks fails', async () => {
    setupIndexedDB({ put: { kind: 'error', error: new Error('write failed') } });
    const { addTrack } = await importDBModule();

    await expect(addTrack({
      id: 'track-1',
      name: 'Commute',
      points: [[51.5, -0.1]],
      length: 12.5,
      isVisible: true,
    })).rejects.toBe('Error adding track');
  });

  it('deletes a track by id', async () => {
    const { store } = setupIndexedDB();
    const { deleteTrack } = await importDBModule();

    await expect(deleteTrack('track-1')).resolves.toBeUndefined();
    expect(store.delete).toHaveBeenCalledWith('track-1');
  });

  it('rejects when deleting a track fails', async () => {
    setupIndexedDB({ delete: { kind: 'error', error: new Error('delete failed') } });
    const { deleteTrack } = await importDBModule();

    await expect(deleteTrack('track-1')).rejects.toBe('Error deleting track');
  });

  it('clears all tracks', async () => {
    const { store } = setupIndexedDB();
    const { clearTracks } = await importDBModule();

    await expect(clearTracks()).resolves.toBeUndefined();
    expect(store.clear).toHaveBeenCalledTimes(1);
  });

  it('rejects when clearing tracks fails', async () => {
    setupIndexedDB({ clear: { kind: 'error', error: new Error('clear failed') } });
    const { clearTracks } = await importDBModule();

    await expect(clearTracks()).rejects.toBe('Error clearing tracks');
  });
});
