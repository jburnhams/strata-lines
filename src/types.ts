
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

export type PlaceIconStyle = 'pin' | 'dot';

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
