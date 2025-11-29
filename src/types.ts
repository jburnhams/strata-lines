
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
