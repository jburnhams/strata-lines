import { describe, it, expect } from '@jest/globals';
import { colorDistance, generateColorPalette, assignTrackColors } from '../../utils/colorAssignment';
import type { Track } from '../../types';

describe('Color Assignment', () => {
  describe('colorDistance', () => {
    it('returns 0 for identical colors', () => {
      const distance = colorDistance('#ff0000', '#ff0000');
      expect(distance).toBe(0);
    });

    it('returns a larger distance for very different colors', () => {
      const redGreenDistance = colorDistance('#ff0000', '#00ff00');
      const redOrangeDistance = colorDistance('#ff0000', '#ff8800');

      // Red and green should be further apart than red and orange
      expect(redGreenDistance).toBeGreaterThan(redOrangeDistance);
    });

    it('handles hue wrap-around correctly', () => {
      // Red (#ff0000, hue 0) and Magenta (#ff00ff, hue 300)
      // Should calculate the shortest distance (60 degrees, not 300)
      const distance = colorDistance('#ff0000', '#ff00ff');
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2); // Should be relatively close due to wrap-around
    });

    it('weights hue differences more than saturation or value', () => {
      // Two colors with same hue but different saturation
      const satDiff = colorDistance('#ff0000', '#ff8080');
      // Two colors with different hue
      const hueDiff = colorDistance('#ff0000', '#00ff00');

      // Hue difference should be weighted more heavily
      expect(hueDiff).toBeGreaterThan(satDiff);
    });

    it('handles invalid colors gracefully', () => {
      const distance = colorDistance('invalid', '#ff0000');
      expect(distance).toBe(0);
    });
  });

  describe('generateColorPalette', () => {
    it('generates the requested number of colors', () => {
      const colors = generateColorPalette('#ffff00', '#ff0000', 10);
      expect(colors).toHaveLength(10);
    });

    it('generates valid hex colors', () => {
      const colors = generateColorPalette('#ffff00', '#ff0000', 5);
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('includes colors close to start and end colors', () => {
      const colors = generateColorPalette('#ffff00', '#ff0000', 20);

      // First color should be close to start color
      const firstDistance = colorDistance(colors[0], '#ffff00');
      expect(firstDistance).toBeLessThan(0.5);

      // Last color should be close to end color
      const lastDistance = colorDistance(colors[colors.length - 1], '#ff0000');
      expect(lastDistance).toBeLessThan(0.5);
    });

    it('distributes colors evenly across the hue range', () => {
      const colors = generateColorPalette('#ff0000', '#00ff00', 5);

      // Calculate distances between consecutive colors
      const distances = [];
      for (let i = 1; i < colors.length; i++) {
        distances.push(colorDistance(colors[i - 1], colors[i]));
      }

      // Distances should be relatively similar (within 50% of each other)
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      distances.forEach(dist => {
        expect(Math.abs(dist - avgDistance) / avgDistance).toBeLessThan(0.5);
      });
    });

    it('returns empty array for invalid parameters', () => {
      expect(generateColorPalette('invalid', '#ff0000', 5)).toEqual([]);
      expect(generateColorPalette('#ff0000', 'invalid', 5)).toEqual([]);
      expect(generateColorPalette('#ff0000', '#00ff00', 0)).toEqual([]);
      expect(generateColorPalette('#ff0000', '#00ff00', -1)).toEqual([]);
    });

    it('handles count = 1 correctly', () => {
      const colors = generateColorPalette('#ff0000', '#00ff00', 1);
      expect(colors).toHaveLength(1);
      // Should be approximately midway between start and end
      expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('generates diverse colors with variation in saturation and value', () => {
      const colors = generateColorPalette('#ffff00', '#ff0000', 20);

      // Check that not all colors are exactly on the straight line between start and end
      // by verifying there's some variation in the middle colors
      expect(colors).toHaveLength(20);

      // We can't check exact values due to variation, but we can verify
      // all colors are valid and different
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(15); // Most should be unique
    });
  });

  describe('assignTrackColors', () => {
    const createMockTracks = (count: number): Track[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `track-${i}`,
        name: `Track ${i}`,
        points: [[51.5 + i * 0.1, -0.1], [51.6 + i * 0.1, -0.2]],
        length: 10,
        isVisible: true
      }));
    };

    it('assigns colors to all tracks', () => {
      const tracks = createMockTracks(10);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000');

      expect(colored).toHaveLength(10);
      colored.forEach(track => {
        expect(track.color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('assigns different colors to adjacent tracks', () => {
      const tracks = createMockTracks(10);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000');

      // Check that adjacent tracks have different colors
      for (let i = 1; i < colored.length; i++) {
        expect(colored[i].color).not.toBe(colored[i - 1].color);
      }
    });

    it('maximizes color distance between adjacent tracks', () => {
      const tracks = createMockTracks(10);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000');

      // Calculate average distance between adjacent tracks
      let totalDistance = 0;
      for (let i = 1; i < colored.length; i++) {
        totalDistance += colorDistance(colored[i].color, colored[i - 1].color);
      }
      const avgDistance = totalDistance / (colored.length - 1);

      // Average distance should be reasonably large
      // (This is a heuristic - with 10 tracks and 20 colors in palette,
      // we should be able to maintain good separation)
      expect(avgDistance).toBeGreaterThan(0.3);
    });

    it('considers multiple neighbors when selecting colors', () => {
      const tracks = createMockTracks(10);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000', 3);

      // For each track (except the first few), check that its color is
      // reasonably different from the 3 tracks before it
      for (let i = 3; i < colored.length; i++) {
        for (let j = i - 3; j < i; j++) {
          const distance = colorDistance(colored[i].color, colored[j].color);
          // Should have some separation from all 3 previous tracks
          expect(distance).toBeGreaterThan(0.1);
        }
      }
    });

    it('preserves track properties', () => {
      const tracks = createMockTracks(5);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000');

      colored.forEach((coloredTrack, i) => {
        expect(coloredTrack.id).toBe(tracks[i].id);
        expect(coloredTrack.name).toBe(tracks[i].name);
        expect(coloredTrack.points).toEqual(tracks[i].points);
        expect(coloredTrack.length).toBe(tracks[i].length);
        expect(coloredTrack.isVisible).toBe(tracks[i].isVisible);
      });
    });

    it('handles empty array', () => {
      const colored = assignTrackColors([], '#ffff00', '#ff0000');
      expect(colored).toEqual([]);
    });

    it('handles single track', () => {
      const tracks = createMockTracks(1);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000');

      expect(colored).toHaveLength(1);
      expect(colored[0].color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('handles more tracks than generated colors by reusing palette', () => {
      // Create many tracks to test color reuse
      const tracks = createMockTracks(50);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000');

      expect(colored).toHaveLength(50);
      colored.forEach(track => {
        expect(track.color).toMatch(/^#[0-9a-f]{6}$/);
      });

      // Even with reused colors, adjacent tracks should still be different
      for (let i = 1; i < Math.min(20, colored.length); i++) {
        expect(colored[i].color).not.toBe(colored[i - 1].color);
      }
    });

    it('uses custom neighbor radius', () => {
      const tracks = createMockTracks(10);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000', 1);

      // With radius 1, only immediate neighbors are considered
      expect(colored).toHaveLength(10);
      colored.forEach(track => {
        expect(track.color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('avoids same color for adjacent tracks better than random', () => {
      const tracks = createMockTracks(20);
      const colored = assignTrackColors(tracks, '#ffff00', '#ff0000', 3);

      // Count how many adjacent pairs have very similar colors
      let similarAdjacentCount = 0;
      for (let i = 1; i < colored.length; i++) {
        const dist = colorDistance(colored[i].color, colored[i - 1].color);
        if (dist < 0.2) {
          similarAdjacentCount++;
        }
      }

      // Should have very few (ideally zero) adjacent tracks with similar colors
      expect(similarAdjacentCount).toBeLessThanOrEqual(2);
    });
  });
});
