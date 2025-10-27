import { processGpxFiles } from './services/gpxProcessor';
import { trackToGpxString } from './services/gpxGenerator';
import * as utils from './services/utils';
import pako from 'pako';
import type { Track } from './types';

// --- A Simple Test Runner ---
const testSuite = {
  name: "StrataLines Test Suite",
  tests: [] as { name: string, fn: () => Promise<void> | void }[],
  stats: { passed: 0, failed: 0, total: 0 },

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
    this.stats.total++;
  },

  async run() {
    console.group(this.name);
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ PASS: ${test.name}`);
        this.stats.passed++;
      } catch (e) {
        console.error(`❌ FAIL: ${test.name}`);
        console.error(e);
        this.stats.failed++;
      }
    }
    console.log(`\n---\nResults: ${this.stats.passed} passed, ${this.stats.failed} failed, ${this.stats.total} total.`);
    console.groupEnd();
  }
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}\nExpected: ${expectedStr}\nActual:   ${actualStr}`);
    }
}

function assertThrows(fn: () => void, expectedErrorMessage: string, message: string) {
    try {
        fn();
        throw new Error("Expected function to throw, but it did not.");
    } catch (e: any) {
        assert(e.message.includes(expectedErrorMessage), `${message}\nExpected error message to include: "${expectedErrorMessage}"\nActual error message: "${e.message}"`);
    }
}

// --- Test Data ---

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

// A minimal, valid FIT file with 2 records.
// Header (14 bytes), Def Msg (13 bytes), 2x Record Msg (10 bytes each), CRC (2 bytes)
const sampleFitData = new Uint8Array([
    14, 16, 23, 8, 0, 46, 116, 46, 70, 73, 84, 0, 0, 0, // Header
    64, 0, 0, 20, 2, 0, 1, 4, 133, 1, 4, 133, 0, // Def msg
    0, 21, 5, 23, 14, 163, 150, 248, 111, 25, // Record 1 (lat, lon)
    0, 22, 5, 23, 14, 164, 150, 248, 112, 25, // Record 2
    188, 125 // CRC
]);

// Helper to create mock File objects
function createFile(content: string | Uint8Array, name: string): File {
    const blob = new Blob([content]);
    return new File([blob], name);
}

// --- Test Cases ---

testSuite.test("Color Utils: hexToRgb correctly converts hex to RGB", () => {
    assertEqual(utils.hexToRgb("#ff0000"), { r: 255, g: 0, b: 0 }, "Should convert red");
    assertEqual(utils.hexToRgb("#00ff00"), { r: 0, g: 255, b: 0 }, "Should convert green");
    assertEqual(utils.hexToRgb("#0000ff"), { r: 0, g: 0, b: 255 }, "Should convert blue");
    assertEqual(utils.hexToRgb("#ffffff"), { r: 255, g: 255, b: 255 }, "Should convert white");
    assertEqual(utils.hexToRgb("#000000"), { r: 0, g: 0, b: 0 }, "Should convert black");
    assertEqual(utils.hexToRgb("badhex"), null, "Should return null for invalid hex");
});

testSuite.test("Color Utils: rgbToHex correctly converts RGB to hex", () => {
    assertEqual(utils.rgbToHex(255, 0, 0), "#ff0000", "Should convert red");
    assertEqual(utils.rgbToHex(0, 255, 0), "#00ff00", "Should convert green");
    assertEqual(utils.rgbToHex(0, 0, 255), "#0000ff", "Should convert blue");
});

testSuite.test("Color Utils: color conversions are reversible", () => {
    const hex = "#e67e22";
    const rgb = utils.hexToRgb(hex);
    assert(rgb !== null, "RGB should not be null");
    const finalHex = utils.rgbToHex(rgb!.r, rgb!.g, rgb!.b);
    assertEqual(finalHex, hex, "Hex -> RGB -> Hex should return original value");
});

testSuite.test("GPX Generator: trackToGpxString creates a valid GPX string", () => {
    const track: Track = {
        id: 'test1',
        name: 'My Awesome Track with < & >',
        points: [[51.5, -0.1], [51.6, -0.2]],
        length: 12.34,
        isVisible: true
    };
    const gpxString = trackToGpxString(track);
    assert(gpxString.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "Should be a valid XML file");
    assert(gpxString.includes('<gpx version="1.1"'), "Should have correct GPX version");
    assert(gpxString.includes('<name><![CDATA[My Awesome Track with < & >]]></name>'), "Should correctly handle special characters in name");
    assert(gpxString.includes('<trkpt lat="51.5" lon="-0.1"></trkpt>'), "Should contain track points");
});

testSuite.test("GPX Processor: correctly parses a valid GPX file", async () => {
    const file = createFile(sampleGpx, 'test.gpx');
    const tracks = await processGpxFiles([file]);
    assertEqual(tracks.length, 1, "Should parse one track");
    assertEqual(tracks[0].name, 'Test Track', "Should have correct name");
    assertEqual(tracks[0].points.length, 2, "Should have correct number of points");
    assertEqual(tracks[0].points[0], [51.5074, -0.1278], "Should have correct point data");
    assert(tracks[0].length > 0, "Length should be calculated");
});

testSuite.test("GPX Processor: correctly parses a valid TCX file", async () => {
    const file = createFile(sampleTcx, 'test.tcx');
    const tracks = await processGpxFiles([file]);
    assertEqual(tracks.length, 1, "Should parse one track");
    assertEqual(tracks[0].name, 'Biking - 2024-01-01T12:00:00Z', "Should have correct name");
    assertEqual(tracks[0].points.length, 2, "Should have correct number of points");
    assertEqual(tracks[0].points[0], [40.7128, -74.0060], "Should have correct point data");
});

testSuite.test("GPX Processor: correctly parses a valid FIT file", async () => {
    const file = createFile(sampleFitData, 'test.fit');
    const tracks = await processGpxFiles([file]);
    assertEqual(tracks.length, 1, "Should parse one track");
    assertEqual(tracks[0].points.length, 2, "Should have correct number of points");
    assert(Math.abs(tracks[0].points[0][0] - 51.50735) < 0.0001, "Should have correct latitude");
    assert(Math.abs(tracks[0].points[0][1] - (-0.12776)) < 0.0001, "Should have correct longitude");
});

testSuite.test("GPX Processor: correctly parses a gzipped GPX file", async () => {
    const compressed = pako.gzip(new TextEncoder().encode(sampleGpx));
    const file = createFile(compressed, 'test.gpx.gz');
    const tracks = await processGpxFiles([file]);
    assertEqual(tracks.length, 1, "Should parse one track from gzipped file");
    assertEqual(tracks[0].name, 'Test Track', "Should have correct name from gzipped file");
});

testSuite.test("GPX Processor: handles empty files gracefully", async () => {
    const file = createFile('', 'empty.gpx');
    const tracks = await processGpxFiles([file]);
    assertEqual(tracks.length, 0, "Should return no tracks for an empty file");
});

testSuite.test("GPX Processor: handles files with no tracks gracefully", async () => {
    const noTrackGpx = `<?xml version="1.0" encoding="UTF-8"?><gpx></gpx>`;
    const file = createFile(noTrackGpx, 'notrack.gpx');
    const tracks = await processGpxFiles([file]);
    assertEqual(tracks.length, 0, "Should return no tracks for a GPX file with no tracks");
});

testSuite.test("GPX Processor: throws error for corrupt file", async () => {
    const corruptGpx = `<?xml version="1.0" ?><gpx><trk><name>bad`;
    const file = createFile(corruptGpx, 'corrupt.gpx');
    let caughtError = false;
    try {
        await processGpxFiles([file]);
    } catch (e) {
        caughtError = true;
    }
    assert(caughtError, "Should throw an error for a corrupt file");
});

testSuite.test("GPX Processor: ignores unsupported file types", async () => {
    const file = createFile('some text', 'document.txt');
    const tracks = await processGpxFiles([file]);
    assertEqual(tracks.length, 0, "Should return no tracks for unsupported file types");
});

// --- Exported runner function ---
export function runTests() {
  testSuite.run();
}
