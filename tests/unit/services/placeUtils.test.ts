import { generatePlaceId, createPlace, calculatePlaceBounds } from '../../../src/services/placeUtils';
import { Place } from '../../../src/types';

describe('placeUtils', () => {
  describe('generatePlaceId', () => {
    it('returns a string', () => {
      const id = generatePlaceId();
      expect(typeof id).toBe('string');
    });

    it('returns unique values', () => {
      const id1 = generatePlaceId();
      const id2 = generatePlaceId();
      expect(id1).not.toBe(id2);
    });

    it('uses randomUUID if available', () => {
      const originalCrypto = global.crypto;
      const mockRandomUUID = jest.fn().mockReturnValue('mock-uuid');

      // We need to properly mock the crypto object.
      // In JSDOM environments, crypto might already be defined.
      // We'll try to override it safely.
      Object.defineProperty(global, 'crypto', {
        value: {
            ...global.crypto,
            randomUUID: mockRandomUUID
        },
        writable: true
      });

      const id = generatePlaceId();
      expect(id).toBe('mock-uuid');
      expect(mockRandomUUID).toHaveBeenCalled();

       // Restore
       Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        writable: true
      });
    });

    it('falls back if randomUUID is not available', () => {
        const originalCrypto = global.crypto;

        // Temporarily remove randomUUID
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.defineProperty(global, 'crypto', {
            value: undefined,
            writable: true
        });

        const id = generatePlaceId();
        expect(typeof id).toBe('string');
        expect(id).toContain('place-');

        // Restore
        Object.defineProperty(global, 'crypto', {
            value: originalCrypto,
            writable: true
        });
    });
  });

  describe('createPlace', () => {
    it('applies default values', () => {
      const place = createPlace();
      expect(place.id).toBeDefined();
      expect(place.latitude).toBe(0);
      expect(place.longitude).toBe(0);
      expect(place.title).toBe('New Place');
      expect(place.createdAt).toBeLessThanOrEqual(Date.now());
      expect(place.source).toBe('manual');
      expect(place.isVisible).toBe(true);
      expect(place.showIcon).toBe(true);
      expect(place.iconStyle).toBe('pin');
    });

    it('merges provided values', () => {
      const partial: Partial<Place> = {
        title: 'My Place',
        latitude: 10,
        longitude: 20,
        isVisible: false,
      };
      const place = createPlace(partial);
      expect(place.title).toBe('My Place');
      expect(place.latitude).toBe(10);
      expect(place.longitude).toBe(20);
      expect(place.isVisible).toBe(false);
      // Defaults still applied for others
      expect(place.showIcon).toBe(true);
    });
  });

  describe('calculatePlaceBounds', () => {
    it('returns correct bounds for multiple places', () => {
      const places: Place[] = [
        createPlace({ latitude: 10, longitude: 10 }),
        createPlace({ latitude: 20, longitude: 20 }),
        createPlace({ latitude: -10, longitude: -10 }),
      ];
      const bounds = calculatePlaceBounds(places);
      expect(bounds).toEqual({
        north: 20,
        south: -10,
        east: 20,
        west: -10,
      });
    });

    it('handles single place', () => {
        const places: Place[] = [
            createPlace({ latitude: 5, longitude: 5 }),
        ];
        const bounds = calculatePlaceBounds(places);
        expect(bounds).toEqual({
            north: 5,
            south: 5,
            east: 5,
            west: 5,
        });
    });

    it('returns null for empty array', () => {
      const bounds = calculatePlaceBounds([]);
      expect(bounds).toBeNull();
    });
  });
});
