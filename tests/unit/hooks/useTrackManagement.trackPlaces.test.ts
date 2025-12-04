import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrackManagement } from '@/hooks/useTrackManagement';
import * as db from '@/services/db';
import * as trackPlaceUtils from '@/utils/trackPlaceUtils';
import * as geocodingService from '@/services/geocodingService';
import type { Track, Place, Point } from '@/types';
import L from 'leaflet';

// Mock dependencies
jest.mock('@/services/db');
jest.mock('@/utils/trackPlaceUtils');
jest.mock('@/services/geocodingService');
jest.mock('@/services/gpxProcessor', () => ({
  processGpxFiles: jest.fn(),
}));
jest.mock('@/services/gpxGenerator', () => ({
  trackToGpxString: jest.fn(),
}));
jest.mock('@/services/utils', () => ({
  getTracksBounds: jest.fn(),
}));
jest.mock('@/utils/colorAssignment', () => ({
  assignTrackColors: jest.fn((tracks) => tracks),
}));

// Setup mock data
const mockTrack: Track = {
  id: 'track-1',
  name: 'Test Track',
  points: [[0, 0], [10, 0]], // Simple horizontal line
  length: 100,
  isVisible: true,
  activityType: 'run',
  sourceFileId: 'file-1'
};

const mockPlace: Place = {
  id: 'place-1',
  latitude: 0,
  longitude: 0,
  title: 'Place 1',
  createdAt: 1000,
  source: 'track-start',
  trackId: 'track-1',
  isVisible: true,
  showIcon: true,
  iconStyle: 'pin'
};

describe('useTrackManagement - Track Places', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default db mocks
    (db.getTracks as jest.Mock<any>).mockResolvedValue([]);
    (db.addTrack as jest.Mock<any>).mockResolvedValue(undefined);
    (db.savePlaceToDb as jest.Mock<any>).mockResolvedValue(undefined);
    (db.getPlacesByTrackId as jest.Mock<any>).mockResolvedValue([]);
    (db.deletePlaceFromDb as jest.Mock<any>).mockResolvedValue(undefined);
    (db.getAllPlacesFromDb as jest.Mock<any>).mockResolvedValue([]);

    // Default utils mocks
    (trackPlaceUtils.findTrackMiddlePoint as jest.Mock<any>).mockReturnValue([5, 0]);
    (trackPlaceUtils.findOptimalMiddlePoint as jest.Mock<any>).mockReturnValue([5, 0]);

    // Default geocoding mock
    (geocodingService.getGeocodingService as jest.Mock<any>).mockReturnValue({
      getLocalityName: jest.fn<any>().mockResolvedValue('Mock Locality'),
    });
  });

  const renderTrackManagement = () => {
    return renderHook(() =>
      useTrackManagement('#000000', '#ffffff', 0, null, false, false, jest.fn())
    );
  };

  it('createTrackPlace creates a start place correctly', async () => {
    const { result } = renderTrackManagement();

    // Setup initial state with one track
    act(() => {
        result.current.setTracks([mockTrack]);
    });

    // Invoke createTrackPlace
    let createdPlace: Place | undefined;
    await act(async () => {
      createdPlace = await result.current.createTrackPlace(mockTrack.id, 'start', false);
    });

    expect(createdPlace).toBeDefined();
    expect(createdPlace?.source).toBe('track-start');
    expect(createdPlace?.title).toBe(mockTrack.name);
    expect(createdPlace?.latitude).toBe(mockTrack.points[0][0]);
    expect(createdPlace?.longitude).toBe(mockTrack.points[0][1]);

    // Verify DB calls
    expect(db.savePlaceToDb).toHaveBeenCalledWith(expect.objectContaining({
      source: 'track-start',
      trackId: mockTrack.id
    }));
    expect(db.addTrack).toHaveBeenCalledWith(expect.objectContaining({
      id: mockTrack.id,
      startPlaceId: createdPlace?.id
    }));

    // Verify state update
    expect(result.current.tracks[0].startPlaceId).toBe(createdPlace?.id);
  });

  it('createTrackPlace creates a middle place using optimal point', async () => {
    const { result } = renderTrackManagement();

    act(() => {
        result.current.setTracks([mockTrack]);
    });

    (trackPlaceUtils.findOptimalMiddlePoint as jest.Mock<any>).mockReturnValue([5.5, 0]);

    let createdPlace: Place | undefined;
    await act(async () => {
      createdPlace = await result.current.createTrackPlace(mockTrack.id, 'middle', false);
    });

    expect(createdPlace?.source).toBe('track-middle');
    expect(createdPlace?.latitude).toBe(5.5);
    expect(trackPlaceUtils.findOptimalMiddlePoint).toHaveBeenCalled();

    expect(result.current.tracks[0].middlePlaceId).toBe(createdPlace?.id);
  });

  it('createTrackPlace uses locality name when requested', async () => {
    const { result } = renderTrackManagement();

    act(() => {
        result.current.setTracks([mockTrack]);
    });

    let createdPlace: Place | undefined;
    await act(async () => {
      createdPlace = await result.current.createTrackPlace(mockTrack.id, 'end', true);
    });

    expect(createdPlace?.title).toBe('Mock Locality');
    const geocoder = geocodingService.getGeocodingService();
    expect(geocoder.getLocalityName).toHaveBeenCalled();
  });

  it('removeTrackPlace removes place and updates track', async () => {
    const { result } = renderTrackManagement();

    const trackWithPlace: Track = {
      ...mockTrack,
      startPlaceId: 'place-123'
    };

    act(() => {
        result.current.setTracks([trackWithPlace]);
    });

    await act(async () => {
      await result.current.removeTrackPlace(trackWithPlace.id, 'start');
    });

    expect(db.deletePlaceFromDb).toHaveBeenCalledWith('place-123');
    expect(db.addTrack).toHaveBeenCalledWith(expect.objectContaining({
      id: trackWithPlace.id,
      startPlaceId: undefined
    }));

    expect(result.current.tracks[0].startPlaceId).toBeUndefined();
  });

  it('createAllTrackPlaces creates all 3 places', async () => {
    const { result } = renderTrackManagement();

    act(() => {
        result.current.setTracks([mockTrack]);
    });

    let places: { start?: Place, middle?: Place, end?: Place } | undefined;
    await act(async () => {
      places = await result.current.createAllTrackPlaces(mockTrack.id, false);
    });

    expect(places?.start).toBeDefined();
    expect(places?.middle).toBeDefined();
    expect(places?.end).toBeDefined();

    expect(result.current.tracks[0].startPlaceId).toBeDefined();
    expect(result.current.tracks[0].middlePlaceId).toBeDefined();
    expect(result.current.tracks[0].endPlaceId).toBeDefined();
  });

  it('removeAllTrackPlaces removes all places', async () => {
    const { result } = renderTrackManagement();

    const trackWithPlaces: Track = {
        ...mockTrack,
        startPlaceId: 'p1',
        middlePlaceId: 'p2',
        endPlaceId: 'p3'
    };

    act(() => {
        result.current.setTracks([trackWithPlaces]);
    });

    await act(async () => {
      await result.current.removeAllTrackPlaces(trackWithPlaces.id);
    });

    expect(db.deletePlaceFromDb).toHaveBeenCalledWith('p1');
    expect(db.deletePlaceFromDb).toHaveBeenCalledWith('p2');
    expect(db.deletePlaceFromDb).toHaveBeenCalledWith('p3');

    expect(result.current.tracks[0].startPlaceId).toBeUndefined();
    expect(result.current.tracks[0].middlePlaceId).toBeUndefined();
    expect(result.current.tracks[0].endPlaceId).toBeUndefined();
  });

  it('getOrphanedPlaces returns places with invalid track IDs', async () => {
    const { result } = renderTrackManagement();

    const validPlace = { ...mockPlace, id: 'valid', trackId: mockTrack.id };
    const orphanedPlace = { ...mockPlace, id: 'orphan', trackId: 'deleted-track' };

    (db.getAllPlacesFromDb as jest.Mock<any>).mockResolvedValue([validPlace, orphanedPlace]);

    act(() => {
        result.current.setTracks([mockTrack]);
    });

    let orphaned: Place[] | undefined;
    await act(async () => {
      orphaned = await result.current.getOrphanedPlaces();
    });

    expect(orphaned).toHaveLength(1);
    expect(orphaned?.[0].id).toBe('orphan');
  });
});
