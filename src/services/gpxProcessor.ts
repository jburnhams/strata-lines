import L from 'leaflet';
import { parseGPX } from '@we-gold/gpxjs';
import pako from 'pako';
import { Stream, Decoder } from '@garmin/fitsdk';
import type { UnprocessedTrack, Point, TrackBounds, SourceFile } from '@/types';
import { normalizeActivityType } from '@/services/utils';

function calculateTrackLength(points: Point[]): number {
  if (points.length < 2) {
    return 0;
  }
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const point1 = L.latLng(points[i][0], points[i][1]);
    const point2 = L.latLng(points[i + 1][0], points[i + 1][1]);
    totalDistance += point1.distanceTo(point2); // distance in meters
  }
  return totalDistance / 1000; // convert to kilometers
}

export function calculateTrackBounds(points: Point[]): TrackBounds | undefined {
  if (points.length === 0) return undefined;

  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];

  for (let i = 1; i < points.length; i++) {
    const lat = points[i][0];
    const lng = points[i][1];

    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return { minLat, maxLat, minLng, maxLng };
}

const parseGpx = (fileContent: string): UnprocessedTrack[] => {
  const [parsedFile, error] = parseGPX(fileContent);

  if (error || !parsedFile || !parsedFile.tracks || parsedFile.tracks.length === 0) {
    return [];
  }

  return parsedFile.tracks.map(track => {
    const points: Point[] = track.points.map(p => [p.latitude, p.longitude]);
    const name = track.name || 'Unnamed Track';
    const length = calculateTrackLength(points);
    // @ts-ignore - gpxjs types might not cover 'type' field yet
    const activityType = normalizeActivityType(track.type);
    const bounds = calculateTrackBounds(points);

    // Try to get time from the first point
    let startTime: number | undefined;
    if (track.points.length > 0 && track.points[0].time) {
      startTime = track.points[0].time.getTime();
    }

    return { name, points, length, isVisible: true, activityType, bounds, startTime };
  });
};

const parseTcx = (fileContent: string): UnprocessedTrack[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(fileContent.trim(), "application/xml");
  
  // Check for parser errors
  const parserError = xmlDoc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    console.error('Error parsing TCX file:', parserError[0].textContent);
    return [];
  }

  const activities = xmlDoc.getElementsByTagName('Activity');
  if (!activities || activities.length === 0) {
    return [];
  }

  const tracks: UnprocessedTrack[] = [];

  for (const activity of Array.from(activities)) {
    const trackpoints = activity.getElementsByTagName('Trackpoint');
    if (trackpoints.length === 0) continue;

    const points: Point[] = [];
    for (const tp of Array.from(trackpoints)) {
      const pos = tp.getElementsByTagName('Position')[0];
      if (pos) {
        const latNode = pos.getElementsByTagName('LatitudeDegrees')[0];
        const lonNode = pos.getElementsByTagName('LongitudeDegrees')[0];
        if (latNode && lonNode && latNode.textContent && lonNode.textContent) {
          const lat = parseFloat(latNode.textContent);
          const lon = parseFloat(lonNode.textContent);
          if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
            points.push([lat, lon]);
          }
        }
      }
    }

    if (points.length > 0) {
      const sport = activity.getAttribute('Sport') || 'Activity';
      const idNode = activity.getElementsByTagName('Id')[0];
      const name = idNode && idNode.textContent ? `${sport} - ${idNode.textContent}` : `${sport}`;
      const length = calculateTrackLength(points);
      const activityType = normalizeActivityType(sport === 'Activity' ? null : sport);
      const bounds = calculateTrackBounds(points);

      // Try to get start time from Id if it is an ISO string, otherwise check first lap
      let startTime: number | undefined;
      if (idNode && idNode.textContent) {
        const time = new Date(idNode.textContent).getTime();
        if (!isNaN(time)) {
          startTime = time;
        }
      }

      tracks.push({ name, points, length, isVisible: true, activityType, bounds, startTime });
    }
  }

  return tracks;
};

const parseFit = (fileContent: Uint8Array): UnprocessedTrack[] => {
    try {
        const stream = Stream.fromByteArray(fileContent);
        const decoder = new Decoder(stream);
        const { messages, errors } = decoder.read();
        
        if (errors && errors.length > 0) {
            console.error('FIT parsing errors:', errors);
            // If there are errors and no track points, it's a failure.
            if (!messages.recordMesgs || messages.recordMesgs.length === 0) {
                 throw new Error(`FIT file is corrupt or contains errors. Error count: ${errors.length}`);
            }
        }

        const recordMessages = messages.recordMesgs;
        if (!recordMessages || recordMessages.length === 0) {
            return []; // No track data
        }

        const points: Point[] = [];
        recordMessages.forEach((record: any) => {
            // Semicircles to degrees conversion: semicircles * ( 180 / 2^31 )
            if (record.positionLat != null && record.positionLong != null) {
                const lat = record.positionLat * (180 / Math.pow(2, 31));
                const lon = record.positionLong * (180 / Math.pow(2, 31));
                points.push([lat, lon]);
            }
        });

        if (points.length < 2) {
            return []; // Not enough points for a track
        }

        const sessionMessages = messages.sessionMesgs;
        let name = 'FIT Activity';
        let activityType = 'Unknown';
        let startTime: number | undefined;

        if (sessionMessages && sessionMessages.length > 0) {
             if (sessionMessages[0].startTime) {
                const activityDate = sessionMessages[0].startTime; // This is a Date object in the new SDK
                name = `FIT Activity on ${activityDate.toLocaleString()}`;
                startTime = activityDate.getTime();
             }
             if (sessionMessages[0].sport) {
                 activityType = normalizeActivityType(sessionMessages[0].sport);
             }
        }

        const length = calculateTrackLength(points);
        const bounds = calculateTrackBounds(points);
        return [{ name, points, length, isVisible: true, activityType, bounds, startTime }];
        
    } catch (error) {
        console.error('Error parsing FIT file:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to parse FIT file: ${error.message}`);
        }
        throw new Error('Failed to parse FIT file. It might be corrupt or in an unsupported format.');
    }
};

interface ProcessedFile {
  tracks: UnprocessedTrack[];
  sourceFile: SourceFile;
}

export const processGpxFiles = async (files: File[]): Promise<ProcessedFile[]> => {
  const processedFiles: ProcessedFile[] = [];

  for (const file of files) {
    try {
      let fileName = file.name;
      const fileNameLower = fileName.toLowerCase();
      let parsedTracks: UnprocessedTrack[] = [];

      // We preserve the original file blob
      const sourceFileId = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sourceFile: SourceFile = {
        id: sourceFileId,
        name: file.name,
        data: file, // Store the original file
        uploadedAt: Date.now(),
      };

      if (fileNameLower.endsWith('.gz')) {
        const buffer = await file.arrayBuffer();
        const decompressed = pako.inflate(new Uint8Array(buffer));
        fileName = fileName.slice(0, -3);
        const originalExtension = fileName.split('.').pop()?.toLowerCase();

        if (originalExtension === 'fit') {
          // Pass the Uint8Array from pako directly to parseFit
          parsedTracks = parseFit(decompressed);
        } else if (originalExtension === 'gpx' || originalExtension === 'tcx') {
          const content = new TextDecoder('utf-8').decode(decompressed);
          if (originalExtension === 'gpx') {
            parsedTracks = parseGpx(content);
          } else {
            parsedTracks = parseTcx(content);
          }
        }
      } else if (fileNameLower.endsWith('.fit')) {
        const buffer = await file.arrayBuffer();
        // Convert ArrayBuffer to Uint8Array for the updated parseFit function
        parsedTracks = parseFit(new Uint8Array(buffer));
      } else if (fileNameLower.endsWith('.gpx') || fileNameLower.endsWith('.tcx')) {
        const content = await file.text();
        if (fileNameLower.endsWith('.gpx')) {
          parsedTracks = parseGpx(content);
        } else {
          parsedTracks = parseTcx(content);
        }
      } else {
        console.warn(`Unsupported file type: ${file.name}`);
        continue;
      }
      
      if (parsedTracks.length > 0) {
          processedFiles.push({
            tracks: parsedTracks,
            sourceFile
          });
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      if (error instanceof Error) {
          throw new Error(`Failed to process ${file.name}: ${error.message}`);
      }
      throw new Error(`Failed to process ${file.name}. It may be invalid or corrupt.`);
    }
  }

  return processedFiles;
};
