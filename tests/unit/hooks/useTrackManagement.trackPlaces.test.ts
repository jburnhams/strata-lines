import { renderHook, act } from '@testing-library/react';
import { useTrackManagement } from '@/hooks/useTrackManagement';
import * as db from '@/services/db';
import { findOptimalMiddlePoint } from '@/utils/trackPlaceUtils';
import { getGeocodingService } from '@/services/geocodingService';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Track, Place } from '@/types';

// Mock dependencies
jest.mock('@/services/gpxProcessor');
jest.mock('@/services/gpxGenerator');
jest.mock('@/services/db');
jest.mock('@/utils/trackPlaceUtils');
jest.mock('@/services/geocodingService');
jest.mock('@/utils/colorAssignment', () => ({
  assignTrackColors: (tracks: any[]) => tracks,
}));
jest.mock('@/services/utils'); // Auto-mock

describe('useTrackManagement Track Places', () => {
  const mockTrack: Track = {
    id: 't1',
    name: 'Test Track',
    points: [[0, 0], [1, 1]],
    length: 10,
    isVisible: true,
    activityType: 'run',
    startPlaceId: undefined,
    middlePlaceId: undefined,
    endPlaceId: undefined
  };

  const mockPlace: Place = {
    id: 'p1',
    latitude: 0,
    longitude: 0,
    title: 'Place',
    createdAt: 123,
    source: 'track-start',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (db.getTracks as jest.Mock<any>).mockResolvedValue([mockTrack]);
    (db.addTrack as jest.Mock<any>).mockResolvedValue(undefined);
    (db.savePlaceToDb as jest.Mock<any>).mockResolvedValue(undefined);
    (db.deletePlaceFromDb as jest.Mock<any>).mockResolvedValue(undefined);
    (db.getPlacesByTrackId as jest.Mock<any>).mockResolvedValue([]);
    (findOptimalMiddlePoint as jest.Mock<any>).mockReturnValue([0.5, 0.5]);

    (getGeocodingService as jest.Mock<any>).mockReturnValue({
      getLocalityName: jest.fn<any>().mockResolvedValue('London')
    });
  });

  const renderUseTrackManagement = () => {
    return renderHook(() => useTrackManagement('#000', '#fff', 0, null));
  };

  it('creates start place correctly', async () => {
    const { result } = renderUseTrackManagement();

    act(() => {
        result.current.setTracks([mockTrack]);
    });

    await act(async () => {
      await result.current.createTrackPlace('t1', 'start', false);
    });

    expect(db.savePlaceToDb).toHaveBeenCalledWith(expect.objectContaining({
      source: 'track-start',
      title: 'Test Track',
      latitude: 0,
      longitude: 0
    }));

    expect(db.addTrack).toHaveBeenCalledWith(expect.objectContaining({
      id: 't1',
      startPlaceId: expect.any(String)
    }));
  });

  it('uses geocoded name when requested', async () => {
    const { result } = renderUseTrackManagement();
    act(() => {
        result.current.setTracks([mockTrack]);
    });

    await act(async () => {
      await result.current.createTrackPlace('t1', 'start', true);
    });

    expect(db.savePlaceToDb).toHaveBeenCalledWith(expect.objectContaining({
        title: 'London'
    }));
  });

  it('removes track place correctly', async () => {
    const trackWithPlace = { ...mockTrack, startPlaceId: 'p1' };
    const { result } = renderUseTrackManagement();

    act(() => {
        result.current.setTracks([trackWithPlace]);
    });

    await act(async () => {
      await result.current.removeTrackPlace('t1', 'start');
    });

    expect(db.deletePlaceFromDb).toHaveBeenCalledWith('p1');
    expect(db.addTrack).toHaveBeenCalledWith(expect.objectContaining({
        id: 't1',
        startPlaceId: undefined
    }));
  });

  it('creates middle place using optimization', async () => {
    const { result } = renderUseTrackManagement();
    act(() => {
        result.current.setTracks([mockTrack]);
    });

    await act(async () => {
      await result.current.createTrackPlace('t1', 'middle', false);
    });

    expect(findOptimalMiddlePoint).toHaveBeenCalled();
    expect(db.savePlaceToDb).toHaveBeenCalledWith(expect.objectContaining({
        source: 'track-middle',
        latitude: 0.5,
        longitude: 0.5
    }));
  });
});
