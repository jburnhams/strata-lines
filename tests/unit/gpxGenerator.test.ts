import { describe, it, expect } from '@jest/globals';
import { trackToGpxString } from '@/services/gpxGenerator';
import type { Track } from '@/types';

describe('GPX Generator', () => {
  describe('trackToGpxString', () => {
    it('creates a valid GPX string', () => {
      const track: Track = {
        id: 'test1',
        name: 'My Awesome Track',
        points: [[51.5, -0.1], [51.6, -0.2]],
        length: 12.34,
        isVisible: true
      };
      const gpxString = trackToGpxString(track);

      expect(gpxString).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpxString).toContain('<gpx version="1.1"');
      expect(gpxString).toContain('<name><![CDATA[My Awesome Track]]></name>');
      expect(gpxString).toContain('<trkpt lat="51.5" lon="-0.1"></trkpt>');
    });

    it('correctly handles special characters in track name', () => {
      const track: Track = {
        id: 'test2',
        name: 'Track with < & >',
        points: [[51.5, -0.1]],
        length: 1,
        isVisible: true
      };
      const gpxString = trackToGpxString(track);

      expect(gpxString).toContain('<![CDATA[Track with < & >]]>');
    });

    it('includes all track points', () => {
      const track: Track = {
        id: 'test3',
        name: 'Multi-point Track',
        points: [[51.1, -0.1], [51.2, -0.2], [51.3, -0.3], [51.4, -0.4]],
        length: 50,
        isVisible: true
      };
      const gpxString = trackToGpxString(track);

      expect(gpxString).toContain('lat="51.1"');
      expect(gpxString).toContain('lat="51.2"');
      expect(gpxString).toContain('lat="51.3"');
      expect(gpxString).toContain('lat="51.4"');
    });

    it('handles empty track name', () => {
      const track: Track = {
        id: 'test4',
        name: '',
        points: [[51.5, -0.1]],
        length: 1,
        isVisible: true
      };
      const gpxString = trackToGpxString(track);

      expect(gpxString).toContain('<name><![CDATA[]]></name>');
    });

    it('handles track with single point', () => {
      const track: Track = {
        id: 'test5',
        name: 'Single Point',
        points: [[51.5, -0.1]],
        length: 0,
        isVisible: true
      };
      const gpxString = trackToGpxString(track);

      expect(gpxString).toContain('<trkpt lat="51.5" lon="-0.1"></trkpt>');
    });

    it('includes GPX namespace and creator', () => {
      const track: Track = {
        id: 'test6',
        name: 'Test Track',
        points: [[51.5, -0.1]],
        length: 1,
        isVisible: true
      };
      const gpxString = trackToGpxString(track);

      expect(gpxString).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
      expect(gpxString).toContain('creator="StrataLines"');
    });
  });
});
