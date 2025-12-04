
import type { LatLngBounds } from 'leaflet';

export type Point = [number, number]; // [latitude, longitude]

export interface TrackBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface Track {
  id: string;
  name: string;
  points: Point[];
  length: number; // in kilometers
  isVisible: boolean;
  color?: string;
  activityType: string;
  startTime?: number; // Unix timestamp in milliseconds
  bounds?: TrackBounds;
  sourceFileId?: string;
}

export type UnprocessedTrack = Omit<Track, 'id'>;

export interface SourceFile {
  id: string;
  name: string;
  data: Blob;
  uploadedAt: number;
}

export interface AspectRatio {
  width: number;
  height: number;
}

export type SingleLayer = {
  url: string;
  attribution: string;
};

export type TileLayerDefinition = {
  key: string;
  name: string;
  layers: SingleLayer[];
};

export type Notification = {
  type: 'error' | 'info';
  message: string;
};

export type PlaceSource = 'manual' | 'track-start' | 'track-middle' | 'track-end' | 'import';

export interface PlaceTextStyle {
  fontSize: number;           // Base font size (scaled by title size slider)
  fontFamily: string;         // Default: 'Noto Sans'
  fontWeight: string;         // Default: 'bold'
  color: string;              // Hex color or 'auto'
  strokeColor?: string;       // Drop shadow color
  strokeWidth?: number;       // Drop shadow width
  glowColor?: string;         // Glow effect color
  glowBlur?: number;          // Glow blur radius
}

export type PlaceIconStyle = 'pin' | 'dot' | 'circle' | 'marker' | 'flag' | 'star';

export interface PlaceIconConfig {
  style: PlaceIconStyle;      // 'pin' | 'dot' | 'circle' | 'marker' | 'flag' | 'star'
  size: number;               // Icon size in pixels
  color: string;              // Icon color (hex)
}

export interface Place {
  id: string;                    // UUID
  latitude: number;              // WGS84 coordinate
  longitude: number;             // WGS84 coordinate
  title: string;                 // Display name
  createdAt: number;             // Unix timestamp (milliseconds)
  source: PlaceSource;           // Origin of place
  trackId?: string;              // Optional track reference
  isVisible: boolean;            // Display toggle
  showIcon: boolean;             // Icon visibility toggle
  iconStyle: PlaceIconStyle;     // Pin, dot, etc.
  textStyle?: PlaceTextStyle;
  iconConfig?: PlaceIconConfig;
}

export interface ExportSettings {
  includePlaces: boolean;           // Toggle places layer
  placeTitleSize: number;           // 1-100 scale
  placeShowIconsGlobally: boolean;  // Global icon visibility
  placeTextStyle: PlaceTextStyle;   // Global text styling
  placePreferredTitleGap?: number;
  placeAllowOverlap?: boolean;
  placeOptimizePositions?: boolean;
}

export interface PlaceBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PlaceWithMetadata extends Place {
  distanceToNearestPlace?: number;  // Calculated during positioning
  titleLines?: string[];            // Wrapped title lines
  titlePosition?: 'left' | 'right'; // Calculated position
}

export type PlaceTitlePosition = 'left' | 'right';

export interface PlaceTitleBounds {
  placeId: string;
  position: PlaceTitlePosition;
  bounds: DOMRect;              // Screen coordinates
  geoBounds: LatLngBounds;      // Geographic coordinates
}

export interface PositioningConstraints {
  exportBounds?: LatLngBounds;  // Preferred boundary (can exceed)
  containerBounds?: DOMRect;    // Pixel boundary for exportBounds
  minDistance: number;          // Minimum pixels between titles
  preferredGap: number;         // Preferred pixels between titles
}
