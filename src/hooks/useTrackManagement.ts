import { useState, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { processGpxFiles } from '@/services/gpxProcessor';
import * as db from '@/services/db';
import type { Track, Place, TrackPlaceType } from '@/types';
import { trackToGpxString } from '@/services/gpxGenerator';
import { getTracksBounds } from '@/services/utils';
import { findTrackMiddlePoint, findOptimalMiddlePoint } from '@/utils/trackPlaceUtils';
import { getGeocodingService } from '@/services/geocodingService';
import { assignTrackColors } from '@/utils/colorAssignment';
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
  previewBounds: LatLngBounds | null,
  autoCreatePlaces: boolean = false,
  defaultUseLocalityName: boolean = false,
  onPlacesChanged?: () => void
) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [boundsToFit, setBoundsToFit] = useState<LatLngBounds | null>(null);

  // Set of activity types that are HIDDEN
  const [hiddenActivityTypes, setHiddenActivityTypes] = useState<Set<string>>(new Set());

  const coloredTracks = useMemo(() => {
    return assignTrackColors(tracks, lineColorStart, lineColorEnd);
  }, [tracks, lineColorStart, lineColorEnd]);

  const filteredTracks = useMemo(() => {
    return coloredTracks.filter(t => !hiddenActivityTypes.has(t.activityType || 'Unknown'));
  }, [coloredTracks, hiddenActivityTypes]);

  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    coloredTracks.forEach(track => {
      const type = track.activityType || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [coloredTracks]);

  const toggleActivityFilter = useCallback((type: string) => {
    setHiddenActivityTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsLoading(true);
      setNotification(null);
      try {
        const processedFiles = await processGpxFiles(Array.from(files));

        if (processedFiles.length === 0) {
          setNotification({ type: 'error', message: 'No tracks found in the uploaded files.' });
          setIsLoading(false);
          return;
        }

        const tracksToAdd: Track[] = [];
        let duplicates = 0;
        let tooShort = 0;

        for (const processedFile of processedFiles) {
          // Save the source file to DB
          try {
            await db.saveSourceFile(processedFile.sourceFile);
          } catch (e) {
            console.error('Failed to save source file', e);
            // Continue even if saving source file fails?
            // Maybe we should warn, but we can still proceed with tracks.
          }

          for (let index = 0; index < processedFile.tracks.length; index++) {
             const track = processedFile.tracks[index];
             // Create unique ID for track
             const trackId = `${track.name}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;

             const newTrack: Track = {
               ...track,
               id: trackId,
               isVisible: true,
               sourceFileId: processedFile.sourceFile.id
             };

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

             if (autoCreatePlaces) {
               try {
                 // Start Place
                 if (newTrack.points.length > 0) {
                   const startPoint = newTrack.points[0];
                   const startPlaceId = Math.random().toString(36).substring(2, 15);
                   const startPlace: Place = {
                     id: startPlaceId,
                     latitude: startPoint[0],
                     longitude: startPoint[1],
                     title: newTrack.name, // Use track name for performance during upload
                     createdAt: Date.now(),
                     source: 'track-start',
                     trackId: newTrack.id,
                     isVisible: true,
                     showIcon: true,
                     iconStyle: 'pin',
                     iconConfig: { style: 'pin', size: 30, color: '#ef4444' }
                   };
                   await db.savePlaceToDb(startPlace);
                   newTrack.startPlaceId = startPlaceId;
                 }

                 // End Place
                 if (newTrack.points.length > 1) {
                   const endPoint = newTrack.points[newTrack.points.length - 1];
                   const endPlaceId = Math.random().toString(36).substring(2, 15);
                   const endPlace: Place = {
                     id: endPlaceId,
                     latitude: endPoint[0],
                     longitude: endPoint[1],
                     title: newTrack.name,
                     createdAt: Date.now(),
                     source: 'track-end',
                     trackId: newTrack.id,
                     isVisible: true,
                     showIcon: true,
                     iconStyle: 'pin',
                     iconConfig: { style: 'pin', size: 30, color: '#ef4444' }
                   };
                   await db.savePlaceToDb(endPlace);
                   newTrack.endPlaceId = endPlaceId;
                 }

                 // Middle Place
                 if (newTrack.points.length > 1) {
                    const middlePoint = findTrackMiddlePoint(newTrack);
                    const middlePlaceId = Math.random().toString(36).substring(2, 15);
                    const middlePlace: Place = {
                     id: middlePlaceId,
                     latitude: middlePoint[0],
                     longitude: middlePoint[1],
                     title: newTrack.name,
                     createdAt: Date.now(),
                     source: 'track-middle',
                     trackId: newTrack.id,
                     isVisible: true,
                     showIcon: true,
                     iconStyle: 'pin',
                     iconConfig: { style: 'pin', size: 30, color: '#ef4444' }
                   };
                   await db.savePlaceToDb(middlePlace);
                   newTrack.middlePlaceId = middlePlaceId;
                 }
               } catch (e) {
                 console.error('Failed to auto-create places', e);
               }
             }

             tracksToAdd.push(newTrack);
          }
        }

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

          if (autoCreatePlaces && onPlacesChanged) {
            onPlacesChanged();
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
    [tracks, minLengthFilter, previewBounds, autoCreatePlaces]
  );

  const removeTrack = useCallback(async (trackId: string) => {
    try {
      const trackToRemove = tracks.find(t => t.id === trackId);
      if (!trackToRemove) return;

      await db.deleteTrack(trackId);

      const updatedTracks = tracks.filter((t) => t.id !== trackId);
      setTracks(updatedTracks);

      // Check if we need to remove the source file
      if (trackToRemove.sourceFileId) {
        const isFileUsed = updatedTracks.some(t => t.sourceFileId === trackToRemove.sourceFileId);
        if (!isFileUsed) {
          try {
             await db.deleteSourceFile(trackToRemove.sourceFileId);
          } catch (e) {
             console.error('Failed to cleanup source file', e);
          }
        }
      }

    } catch (error) {
      console.error('Failed to delete track', error);
      setNotification({ type: 'error', message: 'Error removing track.' });
    }
  }, [tracks]);

  const removeAllTracks = useCallback(async () => {
    try {
      const tracksToRemove = filteredTracks;

      // If we are removing ALL tracks (no filter hidden), we can use clearTracks for efficiency
      if (tracksToRemove.length === tracks.length) {
          await db.clearTracks(); // This clears both tracks and source_files
          setTracks([]);
      } else {
          // Otherwise remove individually
          const idsToRemove = new Set(tracksToRemove.map(t => t.id));
          await Promise.all(tracksToRemove.map(t => db.deleteTrack(t.id)));

          const remainingTracks = tracks.filter(t => !idsToRemove.has(t.id));
          setTracks(remainingTracks);

          // Cleanup orphaned source files
          // Find sourceFileIds that were in removed tracks but are NOT in remaining tracks
          const removedSourceIds = new Set(tracksToRemove.map(t => t.sourceFileId).filter((id): id is string => !!id));
          const remainingSourceIds = new Set(remainingTracks.map(t => t.sourceFileId).filter((id): id is string => !!id));

          for (const sourceId of removedSourceIds) {
             if (!remainingSourceIds.has(sourceId)) {
                await db.deleteSourceFile(sourceId);
             }
          }
      }
    } catch (error) {
      console.error('Failed to clear tracks', error);
      setNotification({ type: 'error', message: 'Error removing tracks.' });
    }
  }, [filteredTracks, tracks]);

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
    if (filteredTracks.length === 0) {
      setNotification({ type: 'info', message: 'No tracks to download.' });
      return;
    }
    setIsDownloading(true);
    setNotification(null);
    try {
      const zip = new JSZip();

      // Track files we've already added to zip to handle naming collisions
      const addedFilenames = new Map<string, number>();

      // Group tracks by sourceFileId to identify full files we can export
      // However, the requirement is "filtered list".
      // If a file has 10 tracks and only 1 is visible, do we export the full original file?
      // User said: "If you have filtered the list ... do you still want the full original file ... to be downloaded? Yes"

      // So we need to collect unique sourceFileIds from the filteredTracks
      const sourceFileIdsToExport = new Set<string>();
      const tracksWithoutSource: Track[] = [];

      filteredTracks.forEach(t => {
        if (t.sourceFileId) {
            sourceFileIdsToExport.add(t.sourceFileId);
        } else {
            tracksWithoutSource.push(t);
        }
      });

      // Export Original Files
      for (const sourceId of sourceFileIdsToExport) {
         try {
             const sourceFile = await db.getSourceFile(sourceId);
             if (sourceFile) {
                 let filename = sourceFile.name;
                 // Handle duplicates in zip
                 if (addedFilenames.has(filename)) {
                     const count = addedFilenames.get(filename)!;
                     addedFilenames.set(filename, count + 1);
                     const nameParts = filename.split('.');
                     const ext = nameParts.pop();
                     const name = nameParts.join('.');
                     filename = `${name}(${count}).${ext}`;
                 } else {
                     addedFilenames.set(filename, 1);
                 }

                 zip.file(filename, sourceFile.data);
             } else {
                 // Fallback if source file missing (shouldn't happen often)
                 // Find all filtered tracks that belong to this missing source file
                 const associatedTracks = filteredTracks.filter(t => t.sourceFileId === sourceId);
                 associatedTracks.forEach(t => tracksWithoutSource.push(t));
             }
         } catch (e) {
             console.error(`Error fetching source file ${sourceId}`, e);
             // Fallback
             const associatedTracks = filteredTracks.filter(t => t.sourceFileId === sourceId);
             associatedTracks.forEach(t => tracksWithoutSource.push(t));
         }
      }

      // Export Legacy/Fallback Tracks (Generated GPX)
      tracksWithoutSource.forEach((track) => {
        const gpxContent = trackToGpxString(track);
        let filename = `${track.name.replace(/[\/\\?%*:|"<>]/g, '_') || 'unnamed_track'}.gpx`;

        if (addedFilenames.has(filename)) {
             const count = addedFilenames.get(filename)!;
             addedFilenames.set(filename, count + 1);
             const nameParts = filename.split('.');
             const ext = nameParts.pop();
             const name = nameParts.join('.');
             filename = `${name}(${count}).${ext}`;
        } else {
            addedFilenames.set(filename, 1);
        }

        zip.file(filename, gpxContent);
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
  }, [filteredTracks]);

  const createTrackPlace = useCallback(async (trackId: string, type: TrackPlaceType, useLocalityName: boolean = false): Promise<Place | undefined> => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || track.points.length === 0) return;

    // Check if place already exists
    if (type === 'start' && track.startPlaceId) return;
    if (type === 'middle' && track.middlePlaceId) return;
    if (type === 'end' && track.endPlaceId) return;

    let point: [number, number];
    if (type === 'start') {
      point = track.points[0];
    } else if (type === 'end') {
      point = track.points[track.points.length - 1];
    } else {
      const existingPlaces = await db.getPlacesByTrackId(trackId);
      point = findOptimalMiddlePoint(track, existingPlaces);
    }

    let title = track.name;
    if (useLocalityName) {
      try {
        const service = getGeocodingService();
        const locality = await service.getLocalityName(point[0], point[1]);
        if (locality) title = locality;
      } catch (e) {
        console.warn('Geocoding failed, using track name', e);
      }
    }

    // Generate ID
    const placeId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const place: Place = {
      id: placeId,
      latitude: point[0],
      longitude: point[1],
      title,
      createdAt: Date.now(),
      source: `track-${type}` as any,
      trackId,
      isVisible: true,
      showIcon: true,
      iconStyle: 'pin',
      iconConfig: {
          style: 'pin',
          size: 30,
          color: '#ef4444'
      }
    };

    await db.savePlaceToDb(place);

    // Update track with place ID
    const update: Partial<Track> = {};
    if (type === 'start') update.startPlaceId = place.id;
    if (type === 'middle') update.middlePlaceId = place.id;
    if (type === 'end') update.endPlaceId = place.id;

    const updatedTrack = { ...track, ...update };
    await db.addTrack(updatedTrack);

    // Update local state
    setTracks(prev => prev.map(t => t.id === trackId ? updatedTrack : t));

    if (onPlacesChanged) {
      onPlacesChanged();
    }

    return place;
  }, [tracks, onPlacesChanged]);

  const removeTrackPlace = useCallback(async (trackId: string, type: TrackPlaceType) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    let placeId: string | undefined;
    if (type === 'start') placeId = track.startPlaceId;
    if (type === 'middle') placeId = track.middlePlaceId;
    if (type === 'end') placeId = track.endPlaceId;

    if (!placeId) return;

    await db.deletePlaceFromDb(placeId);

    const update: Partial<Track> = {};
    if (type === 'start') update.startPlaceId = undefined;
    if (type === 'middle') update.middlePlaceId = undefined;
    if (type === 'end') update.endPlaceId = undefined;

    const updatedTrack = { ...track, ...update };
    await db.addTrack(updatedTrack);

    setTracks(prev => prev.map(t => t.id === trackId ? updatedTrack : t));

    if (onPlacesChanged) {
      onPlacesChanged();
    }
  }, [tracks, onPlacesChanged]);

  const createAllTrackPlaces = useCallback(async (trackId: string, useLocalityName: boolean = false) => {
      const start = await createTrackPlace(trackId, 'start', useLocalityName);
      const end = await createTrackPlace(trackId, 'end', useLocalityName);
      const middle = await createTrackPlace(trackId, 'middle', useLocalityName);
      return { start, middle, end };
  }, [createTrackPlace]);

  const removeAllTrackPlaces = useCallback(async (trackId: string) => {
      await removeTrackPlace(trackId, 'start');
      await removeTrackPlace(trackId, 'middle');
      await removeTrackPlace(trackId, 'end');
  }, [removeTrackPlace]);

  const getOrphanedPlaces = useCallback(async (): Promise<Place[]> => {
    try {
        const allPlaces = await db.getAllPlacesFromDb();
        const trackIds = new Set(tracks.map(t => t.id));
        return allPlaces.filter(p => p.trackId && !trackIds.has(p.trackId));
    } catch (e) {
        console.error("Failed to get orphaned places", e);
        return [];
    }
  }, [tracks]);

  return {
    tracks,
    setTracks,
    coloredTracks,
    filteredTracks,
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
    activityCounts,
    hiddenActivityTypes,
    toggleActivityFilter,
    createTrackPlace,
    removeTrackPlace,
    createAllTrackPlaces,
    removeAllTrackPlaces,
    getOrphanedPlaces,
  };
};
