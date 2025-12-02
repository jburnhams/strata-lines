import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  addTrack,
  getTracksByActivityType,
  getTracksByDateRange,
  clearTracks
} from '@/services/db';
import type { Track } from '@/types';

// Mock Track Data
const mockTracks: Track[] = [
  {
    id: '1',
    name: 'Run 1',
    points: [],
    length: 10,
    isVisible: true,
    activityType: 'Running',
    startTime: new Date('2023-01-01T10:00:00Z').getTime()
  },
  {
    id: '2',
    name: 'Ride 1',
    points: [],
    length: 20,
    isVisible: true,
    activityType: 'Cycling',
    startTime: new Date('2023-01-02T10:00:00Z').getTime()
  },
  {
    id: '3',
    name: 'Run 2',
    points: [],
    length: 12,
    isVisible: true,
    activityType: 'Running',
    startTime: new Date('2023-02-01T10:00:00Z').getTime()
  }
];

describe('Database Services (Refactored)', () => {
  beforeEach(async () => {
    await clearTracks();
  });

  it('can store and retrieve tracks by activity type', async () => {
    for (const track of mockTracks) {
      await addTrack(track);
    }

    const runningTracks = await getTracksByActivityType('Running');
    expect(runningTracks).toHaveLength(2);
    expect(runningTracks.map(t => t.id).sort()).toEqual(['1', '3']);

    const cyclingTracks = await getTracksByActivityType('Cycling');
    expect(cyclingTracks).toHaveLength(1);
    expect(cyclingTracks[0].id).toBe('2');

    const swimmingTracks = await getTracksByActivityType('Swimming');
    expect(swimmingTracks).toHaveLength(0);
  });

  it('can retrieve tracks by date range', async () => {
    for (const track of mockTracks) {
      await addTrack(track);
    }

    // January 2023
    const startJan = new Date('2023-01-01T00:00:00Z').getTime();
    const endJan = new Date('2023-01-31T23:59:59Z').getTime();

    const janTracks = await getTracksByDateRange(startJan, endJan);
    expect(janTracks).toHaveLength(2); // Run 1 and Ride 1
    expect(janTracks.map(t => t.id).sort()).toEqual(['1', '2']);

    // February 2023
    const startFeb = new Date('2023-02-01T00:00:00Z').getTime();
    const endFeb = new Date('2023-02-28T23:59:59Z').getTime();

    const febTracks = await getTracksByDateRange(startFeb, endFeb);
    expect(febTracks).toHaveLength(1); // Run 2
    expect(febTracks[0].id).toBe('3');
  });
});
