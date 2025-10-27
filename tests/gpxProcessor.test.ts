import { describe, it, expect } from 'vitest';
import { processGpxFiles } from '../services/gpxProcessor';
import pako from 'pako';

// Test data
const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StrataLines">
  <trk>
    <name>Test Track</name>
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
  const blob = new Blob([content]);
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
    it('correctly parses a valid GPX file', async () => {
      const file = createFile(sampleGpx, 'test.gpx');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Test Track');
      expect(tracks[0].points).toHaveLength(2);
      expect(tracks[0].points[0]).toEqual([51.5074, -0.1278]);
      expect(tracks[0].length).toBeGreaterThan(0);
      expect(tracks[0].isVisible).toBe(true);
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
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(2);
      expect(tracks[0].name).toBe('Track 1');
      expect(tracks[1].name).toBe('Track 2');
    });

    it('handles GPX files with unnamed tracks', async () => {
      const unnamedGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="51.5074" lon="-0.1278"></trkpt>
      <trkpt lat="51.5075" lon="-0.1279"></trkpt>
    </trkseg>
  </trk>
</gpx>`;
      const file = createFile(unnamedGpx, 'unnamed.gpx');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Unnamed Track');
    });

    it('handles empty GPX files', async () => {
      const file = createFile('', 'empty.gpx');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(0);
    });

    it('handles GPX files with no tracks', async () => {
      const noTrackGpx = `<?xml version="1.0" encoding="UTF-8"?><gpx></gpx>`;
      const file = createFile(noTrackGpx, 'notrack.gpx');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(0);
    });
  });

  describe('processGpxFiles - TCX format', () => {
    it('correctly parses a valid TCX file', async () => {
      const file = createFile(sampleTcx, 'test.tcx');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Biking - 2024-01-01T12:00:00Z');
      expect(tracks[0].points).toHaveLength(2);
      expect(tracks[0].points[0]).toEqual([40.7128, -74.006]);
      expect(tracks[0].length).toBeGreaterThan(0);
    });

    it('handles TCX files with multiple activities', async () => {
      const multiActivityTcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Id>2024-01-01T10:00:00Z</Id>
      <Lap>
        <Track>
          <Trackpoint>
            <Position>
              <LatitudeDegrees>51.5074</LatitudeDegrees>
              <LongitudeDegrees>-0.1278</LongitudeDegrees>
            </Position>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
    <Activity Sport="Cycling">
      <Id>2024-01-02T10:00:00Z</Id>
      <Lap>
        <Track>
          <Trackpoint>
            <Position>
              <LatitudeDegrees>40.7128</LatitudeDegrees>
              <LongitudeDegrees>-74.0060</LongitudeDegrees>
            </Position>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
      const file = createFile(multiActivityTcx, 'multi.tcx');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(2);
      expect(tracks[0].name).toContain('Running');
      expect(tracks[1].name).toContain('Cycling');
    });

    it('filters out invalid coordinates (0,0)', async () => {
      const invalidCoordsTcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Lap>
        <Track>
          <Trackpoint>
            <Position>
              <LatitudeDegrees>0</LatitudeDegrees>
              <LongitudeDegrees>0</LongitudeDegrees>
            </Position>
          </Trackpoint>
          <Trackpoint>
            <Position>
              <LatitudeDegrees>51.5074</LatitudeDegrees>
              <LongitudeDegrees>-0.1278</LongitudeDegrees>
            </Position>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
      const file = createFile(invalidCoordsTcx, 'invalid.tcx');
      const tracks = await processGpxFiles([file]);

      expect(tracks[0].points).toHaveLength(1);
      expect(tracks[0].points[0]).toEqual([51.5074, -0.1278]);
    });
  });

  describe('processGpxFiles - Compressed files', () => {
    it('correctly parses a gzipped GPX file', async () => {
      const compressed = pako.gzip(new TextEncoder().encode(sampleGpx));
      const file = createFile(compressed, 'test.gpx.gz');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Test Track');
    });

    it('correctly parses a gzipped TCX file', async () => {
      const compressed = pako.gzip(new TextEncoder().encode(sampleTcx));
      const file = createFile(compressed, 'test.tcx.gz');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Biking - 2024-01-01T12:00:00Z');
    });
  });

  describe('processGpxFiles - Multiple files', () => {
    it('processes multiple files at once', async () => {
      const gpxFile = createFile(sampleGpx, 'track1.gpx');
      const tcxFile = createFile(sampleTcx, 'track2.tcx');
      const tracks = await processGpxFiles([gpxFile, tcxFile]);

      expect(tracks).toHaveLength(2);
      expect(tracks[0].name).toBe('Test Track');
      expect(tracks[1].name).toBe('Biking - 2024-01-01T12:00:00Z');
    });
  });

  describe('processGpxFiles - Error handling', () => {
    it('ignores unsupported file types', async () => {
      const file = createFile('some text', 'document.txt');
      const tracks = await processGpxFiles([file]);

      expect(tracks).toHaveLength(0);
    });
  });
});
