import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useTrackManagement } from '@/hooks/useTrackManagement';
import * as db from '@/services/db';
import * as gpxProcessor from '@/services/gpxProcessor';

// Mock DB module
jest.mock('@/services/db', () => ({
  addTrack: jest.fn(),
  deleteTrack: jest.fn(),
  clearTracks: jest.fn(),
  saveSourceFile: jest.fn(),
  deleteSourceFile: jest.fn(),
  getSourceFile: jest.fn(),
}));

// Mock GPX processor
jest.mock('@/services/gpxProcessor', () => ({
  processGpxFiles: jest.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

// Mock JSZip
const mockZipFile = jest.fn();
const mockGenerateAsync = jest.fn().mockResolvedValue(new Blob(['zip-content']));
jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    file: mockZipFile,
    generateAsync: mockGenerateAsync,
  }));
});

// Helper to create a FileList-like object
const createFileList = (files: File[]): FileList => {
  return {
    length: files.length,
    item: (index: number) => files[index],
    [Symbol.iterator]: function* () {
      yield* files;
    }
  } as unknown as FileList;
};

describe('useTrackManagement - File Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports files, saves source file, and assigns sourceFileId', async () => {
    const mockFile = new File(['gpx-content'], 'test.gpx');
    const mockTrack = {
      name: 'Test Track',
      points: [[0, 0], [1, 1]],
      length: 10,
      activityType: 'Running',
    };

    (gpxProcessor.processGpxFiles as jest.Mock).mockResolvedValue([
      {
        sourceFile: { id: 'source-1', name: 'test.gpx', data: mockFile, uploadedAt: 123 },
        tracks: [mockTrack],
      },
    ]);

    const { result } = renderHook(() => useTrackManagement('#000', '#fff', 0, null));

    await act(async () => {
      const fileList = createFileList([mockFile]);
      await result.current.handleFiles(fileList);
    });

    // Check if source file was saved
    expect(db.saveSourceFile).toHaveBeenCalledWith(expect.objectContaining({
      id: 'source-1',
      name: 'test.gpx',
    }));

    // Check if track was added with sourceFileId
    expect(db.addTrack).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Track',
      sourceFileId: 'source-1',
    }));

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0].sourceFileId).toBe('source-1');
  });

  it('deletes source file when last track using it is removed', async () => {
    // Setup initial state with one track linked to a source file
    const mockTrack = {
      name: 'Test Track',
      points: [[0, 0]],
      length: 10,
      isVisible: true,
      activityType: 'Running',
    };

    const mockFile = new File(['gpx'], 'test.gpx');
    (gpxProcessor.processGpxFiles as jest.Mock).mockResolvedValue([
      {
        sourceFile: { id: 'source-1', name: 'test.gpx', data: mockFile, uploadedAt: 123 },
        tracks: [mockTrack],
      },
    ]);

    const { result } = renderHook(() => useTrackManagement('#000', '#fff', 0, null));

    await act(async () => {
      const fileList = createFileList([mockFile]);
      await result.current.handleFiles(fileList);
    });

    expect(result.current.tracks).toHaveLength(1);
    const trackId = result.current.tracks[0].id;

    // Now remove the track
    await act(async () => {
      await result.current.removeTrack(trackId);
    });

    expect(db.deleteTrack).toHaveBeenCalledWith(trackId);

    // Check if deleteSourceFile was called
    expect(db.deleteSourceFile).toHaveBeenCalledWith('source-1');
  });

  it('does NOT delete source file if other tracks still use it', async () => {
    const mockFile = new File(['gpx'], 'multi.gpx');
    const track1 = { name: 'T1', points: [[0,0]], length: 1, activityType: 'Run' };
    const track2 = { name: 'T2', points: [[0,0]], length: 1, activityType: 'Run' };

    (gpxProcessor.processGpxFiles as jest.Mock).mockResolvedValue([
      {
        sourceFile: { id: 'source-shared', name: 'multi.gpx', data: mockFile, uploadedAt: 123 },
        tracks: [track1, track2],
      },
    ]);

    const { result } = renderHook(() => useTrackManagement('#000', '#fff', 0, null));

    await act(async () => {
      const fileList = createFileList([mockFile]);
      await result.current.handleFiles(fileList);
    });

    expect(result.current.tracks).toHaveLength(2);
    const id1 = result.current.tracks[0].id;

    // Remove first track
    await act(async () => {
      await result.current.removeTrack(id1);
    });

    expect(result.current.tracks).toHaveLength(1);
    expect(db.deleteTrack).toHaveBeenCalledWith(id1);

    // Should NOT delete source file yet
    expect(db.deleteSourceFile).not.toHaveBeenCalled();

    // Remove second track
    const id2 = result.current.tracks[0].id;
    await act(async () => {
      await result.current.removeTrack(id2);
    });

    // NOW it should delete source file
    expect(db.deleteSourceFile).toHaveBeenCalledWith('source-shared');
  });

  it('downloads original source file if available', async () => {
    const mockSourceFile = { id: 'source-1', name: 'original.fit', data: new Blob(['fit-data']), uploadedAt: 123 };
    (db.getSourceFile as jest.Mock).mockResolvedValue(mockSourceFile);

    // Setup hook with a track that has a sourceFileId
    const mockTrack = { name: 'Test Track', points: [[0,0]], length: 10, activityType: 'Run' };
    (gpxProcessor.processGpxFiles as jest.Mock).mockResolvedValue([
      {
        sourceFile: mockSourceFile,
        tracks: [mockTrack],
      },
    ]);

    const { result } = renderHook(() => useTrackManagement('#000', '#fff', 0, null));

    // Add track
    await act(async () => {
        const fileList = createFileList([new File([''], 'original.fit')]);
        await result.current.handleFiles(fileList);
    });

    // Trigger download
    await act(async () => {
      await result.current.handleDownloadAllTracks();
    });

    // Check JSZip usage
    // It should append the original file 'original.fit'
    expect(mockZipFile).toHaveBeenCalledWith('original.fit', mockSourceFile.data);
  });

  it('falls back to generated GPX if source file is missing', async () => {
    (db.getSourceFile as jest.Mock).mockResolvedValue(undefined); // Simulate missing file

    const mockSourceFile = { id: 'source-missing', name: 'lost.gpx', data: new Blob([]), uploadedAt: 123 };
    const mockTrack = { name: 'Legacy Track', points: [[0,0]], length: 10, activityType: 'Run' };

    (gpxProcessor.processGpxFiles as jest.Mock).mockResolvedValue([
      {
        sourceFile: mockSourceFile,
        tracks: [mockTrack],
      },
    ]);

    const { result } = renderHook(() => useTrackManagement('#000', '#fff', 0, null));

    await act(async () => {
        const fileList = createFileList([new File([''], 'lost.gpx')]);
        await result.current.handleFiles(fileList);
    });

    await act(async () => {
      await result.current.handleDownloadAllTracks();
    });

    // Should NOT have called zip with 'lost.gpx' (since source was undefined)
    // Should have called zip with generated gpx, likely named based on track name
    expect(mockZipFile).toHaveBeenCalledWith(
        expect.stringMatching(/Legacy Track.*\.gpx/),
        expect.stringContaining('<?xml')
    );
  });
});
