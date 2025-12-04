import 'fake-indexeddb/auto';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrackManagement } from '@/hooks/useTrackManagement';
import * as db from '@/services/db';
import { getGeocodingService } from '@/services/geocodingService';
import type { Track, Place } from '@/types';

// Mock geocoding service
jest.mock('@/services/geocodingService', () => ({
  getGeocodingService: jest.fn(),
}));

const mockGeocodingService = {
  getLocalityName: jest.fn<any>().mockResolvedValue('Integrated Locality'),
};

(getGeocodingService as jest.Mock<any>).mockReturnValue(mockGeocodingService);

const mockTrack: Track = {
  id: 't-int-1',
  name: 'Integration Track',
  points: [[51.5, -0.1], [51.51, -0.11], [51.52, -0.12]],
  length: 5.0,
  isVisible: true,
  activityType: 'run',
  sourceFileId: 'file-1'
};

describe('Track Places Integration', () => {
  beforeEach(async () => {
      jest.clearAllMocks();
      (getGeocodingService as jest.Mock<any>).mockReturnValue(mockGeocodingService);
  });

  afterEach(async () => {
      await db.clearTracks();
      await db.clearAllPlacesFromDb();
  });

  const renderTrackHook = () => renderHook(() =>
    useTrackManagement('#000000', '#ffffff', 0, null, false, false, jest.fn())
  );

  it('full cycle: create all, verify DB, remove all', async () => {
    const { result } = renderTrackHook();

    // 1. Setup Data
    await db.addTrack(mockTrack);
    act(() => {
        result.current.setTracks([mockTrack]);
    });

    // 2. Create All Places
    await act(async () => {
        await result.current.createAllTrackPlaces(mockTrack.id, true);
    });

    // 3. Verify State
    const updatedTrack = result.current.tracks[0];
    expect(updatedTrack.startPlaceId).toBeDefined();
    expect(updatedTrack.middlePlaceId).toBeDefined();
    expect(updatedTrack.endPlaceId).toBeDefined();

    // 4. Verify DB
    const startPlace = await db.getPlaceFromDb(updatedTrack.startPlaceId!);
    expect(startPlace).toBeDefined();
    expect(startPlace?.title).toBe('Integrated Locality');
    expect(startPlace?.source).toBe('track-start');

    const middlePlace = await db.getPlaceFromDb(updatedTrack.middlePlaceId!);
    expect(middlePlace).toBeDefined();
    expect(middlePlace?.source).toBe('track-middle');

    // 5. Verify Track in DB
    const dbTrack = (await db.getTracks()).find(t => t.id === mockTrack.id);
    expect(dbTrack?.startPlaceId).toBe(updatedTrack.startPlaceId);

    // 6. Remove All Places
    await act(async () => {
        await result.current.removeAllTrackPlaces(mockTrack.id);
    });

    // 7. Verify Removal
    const clearedTrack = result.current.tracks[0];
    expect(clearedTrack.startPlaceId).toBeUndefined();
    expect(clearedTrack.middlePlaceId).toBeUndefined();
    expect(clearedTrack.endPlaceId).toBeUndefined();

    // 8. Verify DB Removal
    const startPlaceCheck = await db.getPlaceFromDb(updatedTrack.startPlaceId!);
    expect(startPlaceCheck).toBeUndefined();

    const dbTrackCleared = (await db.getTracks()).find(t => t.id === mockTrack.id);
    expect(dbTrackCleared?.startPlaceId).toBeUndefined();
  });

  it('handles incremental creation correctly', async () => {
      const { result } = renderTrackHook();

      await db.addTrack(mockTrack);
      act(() => {
          result.current.setTracks([mockTrack]);
      });

      // Create Start
      await act(async () => {
          await result.current.createTrackPlace(mockTrack.id, 'start', false);
      });

      const trackAfterStart = result.current.tracks[0];
      expect(trackAfterStart.startPlaceId).toBeDefined();

      // Create End
      await act(async () => {
          await result.current.createTrackPlace(mockTrack.id, 'end', false);
      });

      const trackAfterEnd = result.current.tracks[0];
      expect(trackAfterEnd.startPlaceId).toBeDefined(); // Should still exist
      expect(trackAfterEnd.endPlaceId).toBeDefined();
  });
});
