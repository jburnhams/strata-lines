import 'fake-indexeddb/auto';
import {
  savePlaceToDb,
  getPlaceFromDb,
  getAllPlacesFromDb,
  getPlacesByTrackId,
  deletePlaceFromDb,
  updatePlaceInDb,
  clearAllPlacesFromDb,
  // Helper to ensure DB is clean between tests
  clearTracks
} from '../../../src/services/db';
import { createPlace } from '../../../src/services/placeUtils';
import { Place } from '../../../src/types';

describe('db.places', () => {
  beforeEach(async () => {
    // Clear all stores before each test
    await clearTracks();
    await clearAllPlacesFromDb();
  });

  describe('CRUD Operations', () => {
    it('saves a new place successfully', async () => {
      const place = createPlace({ title: 'Test Place' });
      await savePlaceToDb(place);

      const retrieved = await getPlaceFromDb(place.id);
      expect(retrieved).toEqual(place);
    });

    it('updates existing place with same id on save', async () => {
      const place = createPlace({ title: 'Original Title' });
      await savePlaceToDb(place);

      const updatedPlace = { ...place, title: 'Updated Title' };
      await savePlaceToDb(updatedPlace);

      const retrieved = await getPlaceFromDb(place.id);
      expect(retrieved?.title).toBe('Updated Title');
    });

    it('returns undefined for non-existent place', async () => {
      const retrieved = await getPlaceFromDb('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('gets all places sorted by creation date (descending)', async () => {
      const place1 = createPlace({ title: 'Place 1', createdAt: 1000 });
      const place2 = createPlace({ title: 'Place 2', createdAt: 3000 });
      const place3 = createPlace({ title: 'Place 3', createdAt: 2000 });

      await savePlaceToDb(place1);
      await savePlaceToDb(place2);
      await savePlaceToDb(place3);

      const allPlaces = await getAllPlacesFromDb();
      expect(allPlaces).toHaveLength(3);
      expect(allPlaces[0].id).toBe(place2.id); // 3000
      expect(allPlaces[1].id).toBe(place3.id); // 2000
      expect(allPlaces[2].id).toBe(place1.id); // 1000
    });

    it('returns empty array when no places exist', async () => {
      const allPlaces = await getAllPlacesFromDb();
      expect(allPlaces).toEqual([]);
    });

    it('deletes place successfully', async () => {
      const place = createPlace();
      await savePlaceToDb(place);

      await deletePlaceFromDb(place.id);
      const retrieved = await getPlaceFromDb(place.id);
      expect(retrieved).toBeUndefined();
    });

    it('delete succeeds silently for non-existent place', async () => {
        // Should not throw
        await expect(deletePlaceFromDb('missing-id')).resolves.not.toThrow();
    });

    it('merges partial updates correctly', async () => {
      const place = createPlace({ title: 'Old Title', isVisible: true });
      await savePlaceToDb(place);

      const updated = await updatePlaceInDb(place.id, { title: 'New Title' });

      expect(updated.title).toBe('New Title');
      expect(updated.isVisible).toBe(true); // Persisted

      const retrieved = await getPlaceFromDb(place.id);
      expect(retrieved).toEqual(updated);
    });

    it('throws error when updating non-existent place', async () => {
       await expect(updatePlaceInDb('missing-id', { title: 'New' }))
        .rejects.toMatch(/not found/);
    });

    it('clears all places', async () => {
      await savePlaceToDb(createPlace());
      await savePlaceToDb(createPlace());

      await clearAllPlacesFromDb();
      const all = await getAllPlacesFromDb();
      expect(all).toHaveLength(0);
    });
  });

  describe('Track-based Queries', () => {
    it('gets places by trackId', async () => {
      const trackId = 'track-123';
      const place1 = createPlace({ trackId, title: 'P1' });
      const place2 = createPlace({ trackId: 'other-track', title: 'P2' });
      const place3 = createPlace({ trackId, title: 'P3' });

      await savePlaceToDb(place1);
      await savePlaceToDb(place2);
      await savePlaceToDb(place3);

      const trackPlaces = await getPlacesByTrackId(trackId);
      expect(trackPlaces).toHaveLength(2);
      const ids = trackPlaces.map(p => p.id);
      expect(ids).toContain(place1.id);
      expect(ids).toContain(place3.id);
      expect(ids).not.toContain(place2.id);
    });

    it('sorts places by source order', async () => {
      const trackId = 'track-sort';
      const p1 = createPlace({ trackId, source: 'manual', title: 'Manual' });
      const p2 = createPlace({ trackId, source: 'track-start', title: 'Start' });
      const p3 = createPlace({ trackId, source: 'track-end', title: 'End' });
      const p4 = createPlace({ trackId, source: 'track-middle', title: 'Middle' });

      await savePlaceToDb(p1);
      await savePlaceToDb(p2);
      await savePlaceToDb(p3);
      await savePlaceToDb(p4);

      const sorted = await getPlacesByTrackId(trackId);
      expect(sorted[0].source).toBe('track-start');
      expect(sorted[1].source).toBe('track-middle');
      expect(sorted[2].source).toBe('track-end');
      expect(sorted[3].source).toBe('manual');
    });

    it('returns empty array if no places match trackId', async () => {
      await savePlaceToDb(createPlace({ trackId: 'some-track' }));
      const result = await getPlacesByTrackId('other-track');
      expect(result).toEqual([]);
    });
  });
});
