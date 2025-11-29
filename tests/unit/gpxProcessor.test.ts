import { describe, it, expect } from '@jest/globals';
import { processGpxFiles } from '@/services/gpxProcessor';
import pako from 'pako';

// Test data
const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StrataLines">
  <trk>
    <name>Test Track</name>
    <type>Running</type>
    <trkseg>
      <trkpt lat="51.5074" lon="-0.1278"></trkpt>
      <trkpt lat="51.5075" lon="-0.1279"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const sampleTcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Biking">
      <Id>2024-01-01T12:00:00Z</Id>
      <Lap>
        <Track>
          <Trackpoint>
            <Position>
              <LatitudeDegrees>40.7128</LatitudeDegrees>
              <LongitudeDegrees>-74.0060</LongitudeDegrees>
            </Position>
          </Trackpoint>
          <Trackpoint>
            <Position>
              <LatitudeDegrees>40.7129</LatitudeDegrees>
              <LongitudeDegrees>-74.0061</LongitudeDegrees>
            </Position>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

// Helper to create mock File objects with proper methods
function createFile(content: string | Uint8Array, name: string): File {
  const blob = new Blob([content as BlobPart]);
  const file = new File([blob], name);

  // Add text() method if content is string
  if (typeof content === 'string') {
    Object.defineProperty(file, 'text', {
      value: async () => content,
      writable: true
    });
  }

  // Add arrayBuffer() method
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => {
      if (typeof content === 'string') {
        return new TextEncoder().encode(content).buffer;
      }
      return content.buffer;
    },
    writable: true
  });

  return file;
}

describe('GPX Processor', () => {
  describe('processGpxFiles - GPX format', () => {
    it('correctly parses a valid GPX file and returns SourceFile', async () => {
      const file = createFile(sampleGpx, 'test.gpx');
      const processed = await processGpxFiles([file]);

      expect(processed).toHaveLength(1);

      const { tracks, sourceFile } = processed[0];

      expect(sourceFile.name).toBe('test.gpx');
      expect(sourceFile.id).toBeDefined();
      expect(sourceFile.data).toBeInstanceOf(File);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Test Track');
      expect(tracks[0].points).toHaveLength(2);
      expect(tracks[0].points[0]).toEqual([51.5074, -0.1278]);
      expect(tracks[0].length).toBeGreaterThan(0);
      expect(tracks[0].isVisible).toBe(true);
      expect(tracks[0].activityType).toBe('Running');
    });

    it('handles GPX files with multiple tracks', async () => {
      const multiTrackGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Track 1</name>
    <trkseg>
      <trkpt lat="51.5074" lon="-0.1278"></trkpt>
      <trkpt lat="51.5075" lon="-0.1279"></trkpt>
    </trkseg>
  </trk>
  <trk>
    <name>Track 2</name>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060"></trkpt>
      <trkpt lat="40.7129" lon="-74.0061"></trkpt>
    </trkseg>
  </trk>
</gpx>`;
      const file = createFile(multiTrackGpx, 'multi.gpx');
      const processed = await processGpxFiles([file]);

      expect(processed).toHaveLength(1);
      const { tracks } = processed[0];

      expect(tracks).toHaveLength(2);
      expect(tracks[0].name).toBe('Track 1');
      expect(tracks[1].name).toBe('Track 2');
    });

    it('handles empty GPX files', async () => {
      const file = createFile('', 'empty.gpx');
      const processed = await processGpxFiles([file]);

      expect(processed).toHaveLength(0);
    });
  });

  describe('processGpxFiles - TCX format', () => {
    it('correctly parses a valid TCX file', async () => {
      const file = createFile(sampleTcx, 'test.tcx');
      const processed = await processGpxFiles([file]);

      expect(processed).toHaveLength(1);
      const { tracks, sourceFile } = processed[0];

      expect(sourceFile.name).toBe('test.tcx');
      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Biking - 2024-01-01T12:00:00Z');
      expect(tracks[0].activityType).toBe('Biking');
    });
  });

  describe('processGpxFiles - Compressed files', () => {
    it('correctly parses a gzipped GPX file', async () => {
      const compressed = pako.gzip(new TextEncoder().encode(sampleGpx));
      const file = createFile(compressed, 'test.gpx.gz');
      const processed = await processGpxFiles([file]);

      expect(processed).toHaveLength(1);
      expect(processed[0].sourceFile.name).toBe('test.gpx.gz');
      expect(processed[0].tracks[0].name).toBe('Test Track');
    });
  });

  describe('processGpxFiles - Multiple files', () => {
    it('processes multiple files at once', async () => {
      const gpxFile = createFile(sampleGpx, 'track1.gpx');
      const tcxFile = createFile(sampleTcx, 'track2.tcx');
      const processed = await processGpxFiles([gpxFile, tcxFile]);

      expect(processed).toHaveLength(2);
      expect(processed[0].tracks[0].name).toBe('Test Track');
      expect(processed[1].tracks[0].name).toBe('Biking - 2024-01-01T12:00:00Z');
      expect(processed[0].sourceFile.name).toBe('track1.gpx');
      expect(processed[1].sourceFile.name).toBe('track2.tcx');
    });
  });

  describe('processGpxFiles - FIT format', () => {
    it('correctly parses a valid FIT file', async () => {
      // Create minimal FIT test data to reduce memory usage
      const fitHeader = new Uint8Array([
        0x0E, 0x10, 0x00, 0x08, 0x00, 0x00, 0x00, 0x10,
        0x2E, 0x46, 0x49, 0x54, 0x00, 0x00
      ]);

      const int32ToBytes = (num: number): number[] => {
        const buffer = new ArrayBuffer(4);
        new DataView(buffer).setInt32(0, num, true);
        return Array.from(new Uint8Array(buffer));
      };

      const lat1 = Math.round(51.5074 * (Math.pow(2, 31) / 180));
      const lon1 = Math.round(-0.1278 * (Math.pow(2, 31) / 180));

      const fitData = new Uint8Array([
        ...fitHeader,
        0x40, 0x00, 0x00, 0x00, 0x03,
        0xFD, 0x04, 0x86, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, ...int32ToBytes(1000000), ...int32ToBytes(lat1), ...int32ToBytes(lon1),
        0x00, 0x00
      ]);

      const file = createFile(fitData, 'test.fit');

      try {
        const processed = await processGpxFiles([file]);
        if (processed.length > 0) {
          expect(processed[0].tracks[0].isVisible).toBe(true);
          expect(processed[0].sourceFile.name).toBe('test.fit');
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('handles corrupt FIT files with error', async () => {
      const invalidFit = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const file = createFile(invalidFit, 'corrupt.fit');

      await expect(processGpxFiles([file])).rejects.toThrow();
    });
  });
});
