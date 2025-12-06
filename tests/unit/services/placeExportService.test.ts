import { exportPlacesToGeoJSON, exportPlacesToCSV, exportPlacesToGPX } from '@/services/placeExportService';
import { Place } from '@/types';

const mockPlaces: Place[] = [
  {
    id: '1',
    title: 'Test Place',
    latitude: 51.5074,
    longitude: -0.1278,
    createdAt: 1672531200000, // 2023-01-01T00:00:00.000Z
    source: 'manual',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
  },
  {
    id: '2',
    title: 'Place "With Quotes"',
    latitude: 40.7128,
    longitude: -74.0060,
    createdAt: 1672617600000, // 2023-01-02T00:00:00.000Z
    source: 'import',
    isVisible: true,
    showIcon: true,
    iconStyle: 'dot'
  }
];

describe('placeExportService', () => {
  describe('exportPlacesToGeoJSON', () => {
    it('should generate valid GeoJSON', () => {
      const json = exportPlacesToGeoJSON(mockPlaces);
      const parsed = JSON.parse(json);

      expect(parsed.type).toBe('FeatureCollection');
      expect(parsed.features).toHaveLength(2);
      expect(parsed.features[0].geometry.coordinates).toEqual([-0.1278, 51.5074]);
      expect(parsed.features[0].properties.title).toBe('Test Place');
      expect(parsed.features[0].properties.id).toBe('1');
    });
  });

  describe('exportPlacesToCSV', () => {
    it('should generate valid CSV with headers and escaped quotes', () => {
      const csv = exportPlacesToCSV(mockPlaces);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(3); // Header + 2 rows
      expect(lines[0]).toBe('ID,Title,Latitude,Longitude,Source,Created At');

      // Check row 1
      expect(lines[1]).toContain('1,"Test Place",51.507400,-0.127800,manual');

      // Check row 2 (escaped quotes)
      expect(lines[2]).toContain('2,"Place ""With Quotes""",40.712800,-74.006000,import');
    });
  });

  describe('exportPlacesToGPX', () => {
    it('should generate valid GPX XML', () => {
      const gpx = exportPlacesToGPX(mockPlaces);

      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpx).toContain('<gpx version="1.1" creator="StrataLines"');
      expect(gpx).toContain('<wpt lat="51.5074" lon="-0.1278">');
      expect(gpx).toContain('<name>Test Place</name>');
      expect(gpx).toContain('<desc>Source: manual</desc>');
    });
  });
});
