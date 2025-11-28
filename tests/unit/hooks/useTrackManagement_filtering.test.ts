import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrackManagement } from '@/hooks/useTrackManagement';
import * as db from '@/services/db';
import { assignTrackColors } from '@/utils/colorAssignment';
import JSZip from 'jszip';

// Mock dependencies
jest.mock('@/services/db');
jest.mock('@/services/gpxProcessor');
jest.mock('@/utils/colorAssignment');
jest.mock('@/services/gpxGenerator', () => ({
    trackToGpxString: jest.fn().mockReturnValue('<gpx>mock</gpx>'),
}));
jest.mock('jszip');

describe('useTrackManagement Filtering', () => {
    const mockTracks = [
        { id: '1', name: 'Run 1', points: [], length: 10, isVisible: true, activityType: 'Running' },
        { id: '2', name: 'Bike 1', points: [], length: 20, isVisible: true, activityType: 'Cycling' },
        { id: '3', name: 'Run 2', points: [], length: 5, isVisible: true, activityType: 'Running' },
        { id: '4', name: 'Unknown 1', points: [], length: 2, isVisible: true, activityType: 'Unknown' },
    ];

    const mockColoredTracks = mockTracks.map(t => ({ ...t, color: '#ff0000' }));

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock assignTrackColors to just return the input with a color prop
        (assignTrackColors as jest.Mock).mockReturnValue(mockColoredTracks);

        // Mock db.getTracks to return mockTracks (though initial load does this)
        // But we can also setTracks manually via internal logic if we expose it, or just rely on initial load
        (db.getTracks as jest.Mock).mockResolvedValue(mockTracks);

        global.URL.createObjectURL = jest.fn();
        global.URL.revokeObjectURL = jest.fn();
    });

    const initializeHook = (result: any) => {
        act(() => {
            result.current.setTracks(mockTracks);
            result.current.setIsLoading(false);
        });
    };

    it('should initialize with correct activity counts and no hidden types', async () => {
        const { result } = renderHook(() => useTrackManagement('#000000', '#ffffff', 0, null));
        initializeHook(result);

        expect(result.current.tracks).toHaveLength(4);
        expect(result.current.activityCounts).toEqual({
            'Running': 2,
            'Cycling': 1,
            'Unknown': 1
        });
        expect(result.current.hiddenActivityTypes.size).toBe(0);
        expect(result.current.filteredTracks).toHaveLength(4);
    });

    it('should filter tracks when an activity type is hidden', async () => {
        const { result } = renderHook(() => useTrackManagement('#000000', '#ffffff', 0, null));
        initializeHook(result);

        act(() => {
            result.current.toggleActivityFilter('Running');
        });

        expect(result.current.hiddenActivityTypes.has('Running')).toBe(true);
        // Should show Cycling and Unknown (2 tracks)
        expect(result.current.filteredTracks).toHaveLength(2);
        expect(result.current.filteredTracks.map(t => t.activityType)).toEqual(['Cycling', 'Unknown']);

        // Counts should remain same (based on total loaded tracks)
        expect(result.current.activityCounts['Running']).toBe(2);
    });

    it('should toggle filter off correctly', async () => {
        const { result } = renderHook(() => useTrackManagement('#000000', '#ffffff', 0, null));
        initializeHook(result);

        act(() => {
            result.current.toggleActivityFilter('Running');
        });
        expect(result.current.filteredTracks).toHaveLength(2);

        act(() => {
            result.current.toggleActivityFilter('Running');
        });
        expect(result.current.hiddenActivityTypes.has('Running')).toBe(false);
        expect(result.current.filteredTracks).toHaveLength(4);
    });

    it('should remove only filtered tracks when calling removeAllTracks with filter active', async () => {
        const { result } = renderHook(() => useTrackManagement('#000000', '#ffffff', 0, null));
        initializeHook(result);

        // Hide Running
        act(() => {
            result.current.toggleActivityFilter('Running');
        });

        // filteredTracks now contains Cycling and Unknown
        expect(result.current.filteredTracks.some(t => t.activityType === 'Running')).toBe(false);

        // Call removeAllTracks
        await act(async () => {
            await result.current.removeAllTracks();
        });

        // Expect db.deleteTrack to be called for visible tracks (Cycling, Unknown)
        // Tracks 2 and 4
        expect(db.deleteTrack).toHaveBeenCalledTimes(2);
        expect(db.deleteTrack).toHaveBeenCalledWith('2');
        expect(db.deleteTrack).toHaveBeenCalledWith('4');
        expect(db.deleteTrack).not.toHaveBeenCalledWith('1');
        expect(db.deleteTrack).not.toHaveBeenCalledWith('3');

        // Verify state update - Running tracks should remain
        expect(result.current.tracks).toHaveLength(2);
        expect(result.current.tracks.every(t => t.activityType === 'Running')).toBe(true);
    });

    it('should download only filtered tracks', async () => {
        const { result } = renderHook(() => useTrackManagement('#000000', '#ffffff', 0, null));
        initializeHook(result);

        // Mock JSZip
        const mockFile = jest.fn();
        const mockGenerateAsync = jest.fn().mockResolvedValue(new Blob([]));
        (JSZip as unknown as jest.Mock).mockImplementation(() => ({
            file: mockFile,
            generateAsync: mockGenerateAsync
        }));

        // Hide Cycling
        act(() => {
            result.current.toggleActivityFilter('Cycling');
        });

        // Call handleDownloadAllTracks
        await act(async () => {
            await result.current.handleDownloadAllTracks();
        });

        // Should have added 3 files (2 Running + 1 Unknown)
        expect(mockFile).toHaveBeenCalledTimes(3);
        // Verify names or content if possible, but times is good enough for filter check
    });
});
