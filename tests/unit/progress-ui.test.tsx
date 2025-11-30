import React from 'react';
import { render } from '@testing-library/react';
import { MapComponent } from '@/components/MapComponent';
import L from 'leaflet';
import type { Track, TileLayerDefinition } from '@/types';
import type { ProgressInfo } from '@/utils/progressTracker';

// Mock react-leaflet components
jest.mock('react-leaflet', () => {
  // Create mock Leaflet-like objects without importing L
  const mockLatLng = (lat: number, lng: number) => ({
    lat,
    lng,
    distanceTo: jest.fn(() => 0), // Mock distanceTo to return 0 (within tolerance)
  });
  const mockLatLngBounds = (sw: any, ne: any) => ({ _southWest: sw, _northEast: ne });
  const mockPoint = (x: number, y: number) => ({ x, y });

  return {
    MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    Polyline: () => <div data-testid="polyline" />,
    Rectangle: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="rectangle">{children}</div>
    ),
    Tooltip: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="tooltip">{children}</div>
    ),
    useMap: () => ({
      getCenter: () => mockLatLng(51.505, -0.09),
      getZoom: () => 10,
      getBounds: () => mockLatLngBounds(mockLatLng(51.5, -0.1), mockLatLng(51.51, -0.08)),
      getSize: () => mockPoint(800, 600),
      setView: jest.fn(),
      invalidateSize: jest.fn(),
      whenReady: (fn: () => void) => fn(),
      fitBounds: jest.fn(),
      getBoundsZoom: () => 10,
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      remove: jest.fn(),
    }),
    useMapEvents: () => null,
  };
});

describe('Progress UI Tests', () => {
  const mockTileLayer: TileLayerDefinition = {
    key: 'esriImagery',
    name: 'Satellite',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '',
      },
    ],
  };

  const defaultProps = {
    tracks: [] as Track[],
    onUserMove: jest.fn(),
    center: L.latLng(51.505, -0.09),
    zoom: 10,
    lineThickness: 3,
    exportBounds: null,
    onExportBoundsChange: jest.fn(),
    boundsToFit: null,
    onBoundsFitted: jest.fn(),
    tileLayer: mockTileLayer,
    labelDensity: 0,
    highlightedTrackId: null,
    exportSubdivisions: [],
    currentExportSubdivisionIndex: -1,
    completedSubdivisions: new Set<number>(),
    subdivisionProgress: new Map<number, ProgressInfo>(),
  };

  it('should render without subdivision progress', () => {
    const { container } = render(<MapComponent {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('should not render progress tooltip when no subdivision is rendering', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
      L.latLngBounds(L.latLng(51.51, -0.1), L.latLng(51.52, -0.09)),
    ];

    const { queryByTestId } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={-1}
      />
    );

    expect(queryByTestId('tooltip')).not.toBeInTheDocument();
  });

  it('should render progress tooltip for current subdivision', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
      L.latLngBounds(L.latLng(51.51, -0.1), L.latLng(51.52, -0.09)),
    ];

    const progress = new Map<number, ProgressInfo>();
    progress.set(0, {
      stage: 'base',
      current: 5,
      total: 10,
      percentage: 50,
      stageLabel: 'base 1/3',
    });

    const { getByTestId, getByText } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={0}
        subdivisionProgress={progress}
      />
    );

    expect(getByTestId('tooltip')).toBeInTheDocument();
    expect(getByText('base 1/3')).toBeInTheDocument();
    expect(getByText('50%')).toBeInTheDocument();
    expect(getByText('5/10')).toBeInTheDocument();
  });

  it('should display correct progress for different stages', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
    ];

    const progress = new Map<number, ProgressInfo>();
    progress.set(0, {
      stage: 'tiles',
      current: 8,
      total: 20,
      percentage: 40,
      stageLabel: 'labels 3/3',
    });

    const { getByText } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={0}
        subdivisionProgress={progress}
      />
    );

    expect(getByText('labels 3/3')).toBeInTheDocument();
    expect(getByText('40%')).toBeInTheDocument();
    expect(getByText('8/20')).toBeInTheDocument();
  });

  it('should display line rendering progress', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
    ];

    const progress = new Map<number, ProgressInfo>();
    progress.set(0, {
      stage: 'lines',
      current: 25,
      total: 50,
      percentage: 50,
      stageLabel: 'lines 2/3',
    });

    const { getByText } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={0}
        subdivisionProgress={progress}
      />
    );

    expect(getByText('lines 2/3')).toBeInTheDocument();
    expect(getByText('50%')).toBeInTheDocument();
    expect(getByText('25/50')).toBeInTheDocument();
  });

  it('should not display current/total when total is 0', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
    ];

    const progress = new Map<number, ProgressInfo>();
    progress.set(0, {
      stage: 'base',
      current: 0,
      total: 0,
      percentage: 0,
      stageLabel: 'base 1/3',
    });

    const { getByText, queryByText } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={0}
        subdivisionProgress={progress}
      />
    );

    expect(getByText('base 1/3')).toBeInTheDocument();
    expect(getByText('0%')).toBeInTheDocument();
    expect(queryByText('0/0')).not.toBeInTheDocument();
  });

  it('should update progress text when progress changes', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
    ];

    const initialProgress = new Map<number, ProgressInfo>();
    initialProgress.set(0, {
      stage: 'base',
      current: 5,
      total: 10,
      percentage: 50,
      stageLabel: 'base 1/3',
    });

    const { getByText, rerender } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={0}
        subdivisionProgress={initialProgress}
      />
    );

    expect(getByText('50%')).toBeInTheDocument();

    // Update progress
    const updatedProgress = new Map<number, ProgressInfo>();
    updatedProgress.set(0, {
      stage: 'base',
      current: 8,
      total: 10,
      percentage: 80,
      stageLabel: 'base 1/3',
    });

    rerender(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={0}
        subdivisionProgress={updatedProgress}
      />
    );

    expect(getByText('80%')).toBeInTheDocument();
    expect(getByText('8/10')).toBeInTheDocument();
  });

  it('should handle multiple subdivisions with different progress', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
      L.latLngBounds(L.latLng(51.51, -0.1), L.latLng(51.52, -0.09)),
      L.latLngBounds(L.latLng(51.52, -0.1), L.latLng(51.53, -0.09)),
    ];

    const progress = new Map<number, ProgressInfo>();
    progress.set(1, {
      stage: 'tiles',
      current: 10,
      total: 15,
      percentage: 67,
      stageLabel: 'labels 3/3',
    });

    const { getByText } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={1}
        subdivisionProgress={progress}
      />
    );

    // Should only show progress for the currently rendering subdivision (index 1)
    expect(getByText('labels 3/3')).toBeInTheDocument();
    expect(getByText('67%')).toBeInTheDocument();
  });

  it('should transition from one subdivision to another', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
      L.latLngBounds(L.latLng(51.51, -0.1), L.latLng(51.52, -0.09)),
    ];

    const progress1 = new Map<number, ProgressInfo>();
    progress1.set(0, {
      stage: 'base',
      current: 10,
      total: 10,
      percentage: 100,
      stageLabel: 'base 1/3',
    });

    const { getByText, rerender, queryByTestId } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={0}
        subdivisionProgress={progress1}
      />
    );

    expect(getByText('100%')).toBeInTheDocument();

    // Move to second subdivision
    const progress2 = new Map<number, ProgressInfo>();
    progress2.set(1, {
      stage: 'base',
      current: 2,
      total: 10,
      percentage: 20,
      stageLabel: 'base 1/3',
    });

    rerender(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={1}
        subdivisionProgress={progress2}
        completedSubdivisions={new Set([0])}
      />
    );

    expect(getByText('20%')).toBeInTheDocument();
    expect(getByText('2/10')).toBeInTheDocument();
  });

  it('should handle empty progress map gracefully', () => {
    const subdivisions = [
      L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.51, -0.09)),
    ];

    const { queryByTestId } = render(
      <MapComponent
        {...defaultProps}
        exportSubdivisions={subdivisions}
        currentExportSubdivisionIndex={0}
        subdivisionProgress={new Map()}
      />
    );

    // Should not crash, but no tooltip should be rendered
    expect(queryByTestId('tooltip')).not.toBeInTheDocument();
  });
});
