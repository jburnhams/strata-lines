import { useState, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { processGpxFiles } from '../services/gpxProcessor';
import * as db from '../services/db';
import type { Track, UnprocessedTrack } from '../types';
import { trackToGpxString } from '../services/gpxGenerator';
import { getTracksBounds } from '../services/utils';
import { assignTrackColors } from '../utils/colorAssignment';
import type { LatLngBounds } from 'leaflet';

type Notification = {
  type: 'error' | 'info';
  message: string;
};

/**
 * Custom hook for managing GPX tracks
 */
export const useTrackManagement = (
  lineColorStart: string,
  lineColorEnd: string,
  minLengthFilter: number,
  previewBounds: LatLngBounds | null
) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [boundsToFit, setBoundsToFit] = useState<LatLngBounds | null>(null);

  const coloredTracks = useMemo(() => {
    return assignTrackColors(tracks, lineColorStart, lineColorEnd);
  }, [tracks, lineColorStart, lineColorEnd]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsLoading(true);
      setNotification(null);
      try {
        const processedTracks: UnprocessedTrack[] = await processGpxFiles(Array.from(files));

        if (processedTracks.length === 0) {
          setNotification({ type: 'error', message: 'No tracks found in the uploaded files.' });
          setIsLoading(false);
          return;
        }

        const tracksWithIds: Track[] = processedTracks.map((track, index) => ({
          ...track,
          id: `${track.name}-${Date.now()}-${index}`,
          isVisible: true,
        }));

        let duplicates = 0;
        let tooShort = 0;
        const tracksToAdd: Track[] = [];

        tracksWithIds.forEach((newTrack) => {
          const isDuplicate = tracks.some(
            (existing) =>
              existing.name === newTrack.name && existing.points.length === newTrack.points.length
          );
          if (isDuplicate) {
            duplicates++;
            return;
          }
          const isLongEnough = newTrack.length >= minLengthFilter;
          if (!isLongEnough) {
            tooShort++;
            return;
          }
          tracksToAdd.push(newTrack);
        });

        if (tracksToAdd.length > 0) {
          for (const track of tracksToAdd) {
            await db.addTrack(track);
          }
          const allTracksAfterAdd = [...tracks, ...tracksToAdd];
          setTracks(allTracksAfterAdd);

          // Calculate bounds for ALL tracks
          const allTracksBounds = getTracksBounds(allTracksAfterAdd);

          // If the current view doesn't contain all tracks, trigger a fit
          if (
            previewBounds &&
            allTracksBounds &&
            allTracksBounds.isValid() &&
            !previewBounds.contains(allTracksBounds)
          ) {
            setBoundsToFit(allTracksBounds);
          }
        }

        // Set notification summary message
        const added = tracksToAdd.length;
        let messageParts = [];
        if (added > 0)
          messageParts.push(`Added ${added} new track${added > 1 ? 's' : ''}.`);
        if (duplicates > 0)
          messageParts.push(
            `${duplicates} ${duplicates > 1 ? 'were' : 'was a'} duplicate.`
          );
        if (tooShort > 0)
          messageParts.push(
            `${tooShort} ${tooShort > 1 ? 'were' : 'was'} shorter than ${minLengthFilter} km.`
          );

        if (messageParts.length > 0) {
          setNotification({ type: 'info', message: messageParts.join(' ') });
        }
      } catch (err: any) {
        setNotification({
          type: 'error',
          message:
            err.message ||
            'Failed to parse files. Please ensure they are valid GPX, TCX, or FIT files.',
        });
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [tracks, minLengthFilter, previewBounds]
  );

  const removeTrack = useCallback(async (trackId: string) => {
    try {
      await db.deleteTrack(trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (error) {
      console.error('Failed to delete track', error);
      setNotification({ type: 'error', message: 'Error removing track.' });
    }
  }, []);

  const removeAllTracks = useCallback(async () => {
    try {
      await db.clearTracks();
      setTracks([]);
    } catch (error) {
      console.error('Failed to clear tracks', error);
      setNotification({ type: 'error', message: 'Error removing all tracks.' });
    }
  }, []);

  const toggleTrackVisibility = useCallback(
    async (trackId: string) => {
      const trackToUpdate = tracks.find((t) => t.id === trackId);
      if (!trackToUpdate) return;

      const updatedTrack = { ...trackToUpdate, isVisible: !trackToUpdate.isVisible };

      // Optimistic UI update
      setTracks((prevTracks) =>
        prevTracks.map((t) => (t.id === trackId ? updatedTrack : t))
      );

      try {
        await db.addTrack(updatedTrack); // 'put' operation updates or adds
      } catch (error) {
        console.error('Failed to update track visibility in DB', error);
        // Revert state on DB error
        setTracks((prevTracks) =>
          prevTracks.map((t) => (t.id === trackId ? trackToUpdate : t))
        );
        setNotification({ type: 'error', message: 'Error updating track visibility.' });
      }
    },
    [tracks]
  );

  const handleDownloadAllTracks = useCallback(async () => {
    if (tracks.length === 0) {
      setNotification({ type: 'info', message: 'No tracks to download.' });
      return;
    }
    setIsDownloading(true);
    setNotification(null);
    try {
      const zip = new JSZip();
      const allDbTracks = await db.getTracks();

      if (allDbTracks.length === 0) {
        setNotification({ type: 'info', message: 'No tracks found in the database to download.' });
        return;
      }

      allDbTracks.forEach((track) => {
        const gpxContent = trackToGpxString(track);
        const safeFilename = track.name.replace(/[\/\\?%*:|"<>]/g, '_') || 'unnamed_track';
        zip.file(`${safeFilename}.gpx`, gpxContent);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `StrataLines_Tracks_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to create ZIP file.',
      });
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  }, [tracks]);

  return {
    tracks,
    setTracks,
    coloredTracks,
    isLoading,
    setIsLoading,
    isDownloading,
    notification,
    setNotification,
    boundsToFit,
    setBoundsToFit,
    handleFiles,
    removeTrack,
    removeAllTracks,
    toggleTrackVisibility,
    handleDownloadAllTracks,
  };
};
