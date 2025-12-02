import 'fake-indexeddb/auto';
import {
  savePlaceToDb,
  getPlaceFromDb,
  getAllPlacesFromDb,
  deletePlaceFromDb,
  clearAllPlacesFromDb
} from '../../../src/services/db';
import { createPlace } from '../../../src/services/placeUtils';

describe('db.places integration', () => {
  beforeEach(async () => {
    await clearAllPlacesFromDb();
  });

  it('performs full place lifecycle', async () => {
    // Create
    const place = createPlace({ title: 'Lifecycle Place' });
    await savePlaceToDb(place);

    // Read
    const fetched = await getPlaceFromDb(place.id);
    expect(fetched).toEqual(place);

    // Update
    const updated = { ...place, title: 'Updated Lifecycle' };
    await savePlaceToDb(updated);
    const fetchedUpdated = await getPlaceFromDb(place.id);
    expect(fetchedUpdated?.title).toBe('Updated Lifecycle');

    // Delete
    await deletePlaceFromDb(place.id);
    const fetchedDeleted = await getPlaceFromDb(place.id);
    expect(fetchedDeleted).toBeUndefined();
  });

  it('persists multiple places correctly', async () => {
    const places = Array.from({ length: 50 }).map((_, i) =>
      createPlace({ title: `Place ${i}`, createdAt: Date.now() + i })
    );

    await Promise.all(places.map(p => savePlaceToDb(p)));

    const allPlaces = await getAllPlacesFromDb();
    expect(allPlaces).toHaveLength(50);

    // Check sorting (descending by default implementation in db.ts)
    // The last created (highest index) should be first
    expect(allPlaces[0].title).toBe('Place 49');
    expect(allPlaces[49].title).toBe('Place 0');
  });

  it('handles concurrent operations without corruption', async () => {
    const placeId = 'concurrent-id';

    // Start 100 updates concurrently
    const updates = Array.from({ length: 100 }).map(async (_, i) => {
      // Create fresh object for each update
      const p = createPlace({ id: placeId, title: `Update ${i}` });
      return savePlaceToDb(p);
    });

    await Promise.all(updates);

    // We expect one of them to win, and the DB to be in a consistent state
    const result = await getPlaceFromDb(placeId);
    expect(result).toBeDefined();
    expect(result?.id).toBe(placeId);
    expect(result?.title).toMatch(/Update \d+/);
  });

  it('performs reasonably fast for bulk operations', async () => {
    const count = 100;
    const places = Array.from({ length: count }).map((_, i) => createPlace({ title: `Perf ${i}` }));

    const start = performance.now();
    await Promise.all(places.map(p => savePlaceToDb(p)));
    const endSave = performance.now();

    const startQuery = performance.now();
    const result = await getAllPlacesFromDb();
    const endQuery = performance.now();

    expect(result).toHaveLength(count);

    console.log(`Saved ${count} places in ${endSave - start}ms`);
    console.log(`Queried ${count} places in ${endQuery - startQuery}ms`);

    // Basic assertion to ensure it's not extremely slow (e.g., > 1s for 100 items in memory DB)
    expect(endSave - start).toBeLessThan(1000);
    expect(endQuery - startQuery).toBeLessThan(200);
  });
});
