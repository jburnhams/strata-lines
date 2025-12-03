
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '@/App';
import * as useMediaQueryHooks from '@/hooks/useMediaQuery';
import '@testing-library/jest-dom';

// Mock child components to avoid complex rendering
jest.mock('@/components/MapComponent', () => ({
  MapComponent: () => <div data-testid="mock-map-component">Map</div>
}));
jest.mock('@/components/ControlsPanel', () => ({
  ControlsPanel: () => <div data-testid="mock-controls-panel">Controls</div>
}));

// Mock hooks
jest.mock('@/hooks/useMediaQuery', () => ({
  useIsMobile: jest.fn(),
  useIsLandscape: jest.fn(),
  useMediaQuery: jest.fn(),
}));

jest.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn((key, initial) => [initial, jest.fn()]),
}));

jest.mock('@/hooks/useExportState', () => ({
  useExportState: jest.fn(() => ({
    exportBounds: null,
    setExportBounds: jest.fn(),
    exportBoundsLocked: false,
    setExportBoundsLocked: jest.fn(),
    exportDimensions: { width: 100, height: 100 },
    derivedExportZoom: 10,
    aspectRatio: { width: 16, height: 9 },
    setAspectRatio: jest.fn(),
    exportBoundsAspectRatio: null,
    exportQuality: 0.9,
    setExportQuality: jest.fn(),
    outputFormat: 'png',
    setOutputFormat: jest.fn(),
    jpegQuality: 0.8,
    setJpegQuality: jest.fn(),
    viewportMiles: { width: 1, height: 1 },
    maxDimension: 4000,
    setMaxDimension: jest.fn(),
    exportSubdivisions: [],
    setExportSubdivisions: jest.fn(),
    currentExportSubdivisionIndex: -1,
    setCurrentExportSubdivisionIndex: jest.fn(),
    completedSubdivisions: new Set(),
    setCompletedSubdivisions: jest.fn(),
    subdivisionProgress: new Map(),
    setSubdivisionProgress: jest.fn(),
  })),
}));

jest.mock('@/hooks/useTrackManagement', () => ({
  useTrackManagement: jest.fn(() => ({
    tracks: [],
    coloredTracks: [],
    setTracks: jest.fn(),
    setIsLoading: jest.fn(),
    isLoading: false,
    setNotification: jest.fn(),
    notification: null,
    handleFiles: jest.fn(),
    removeTrack: jest.fn(),
    removeAllTracks: jest.fn(),
    toggleTrackVisibility: jest.fn(),
    boundsToFit: null,
    setBoundsToFit: jest.fn(),
    onTrackHover: jest.fn(),
    handleDownloadAllTracks: jest.fn(),
    isDownloading: false,
  })),
}));

jest.mock('@/hooks/usePlaceManagement', () => ({
  usePlaceManagement: jest.fn(() => ({
    places: [],
    isLoading: false,
    addPlace: jest.fn(),
    updatePlace: jest.fn(),
    deletePlace: jest.fn(),
    togglePlaceVisibility: jest.fn(),
    toggleAllPlacesVisibility: jest.fn(),
    getPlaceById: jest.fn(),
    getVisiblePlaces: jest.fn(),
    notification: null,
    setNotification: jest.fn(),
  })),
}));

// Mock services
jest.mock('@/services/db', () => ({
  getTracks: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/services/exportService', () => ({
  performPngExport: jest.fn(),
}));

const mockUseIsMobile = useMediaQueryHooks.useIsMobile as jest.Mock;
const mockUseIsLandscape = useMediaQueryHooks.useIsLandscape as jest.Mock;

describe('App Layout Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders standard layout on desktop (not mobile)', async () => {
    mockUseIsMobile.mockReturnValue(false);
    mockUseIsLandscape.mockReturnValue(false);

    render(<App />);

    // Find the map container wrapper.
    // In App.tsx: <div ref={mapContainerRef} className="w-full h-screen md:flex-1 relative flex justify-center items-center bg-gray-900">
    // Since we don't have a specific testid on the container, we can find it by finding the parent of MapComponent.
    const mapComponent = screen.getByTestId('mock-map-component');
    // MapComponent is inside <div ref={mapWrapperRef}> which is inside <div ref={mapContainerRef}>
    const mapWrapper = mapComponent.parentElement;
    const mapContainer = mapWrapper?.parentElement;

    expect(mapContainer).toBeInTheDocument();

    // Should NOT have padding classes
    expect(mapContainer).not.toHaveClass('pt-16');
    expect(mapContainer).not.toHaveClass('pb-16');
    expect(mapContainer).not.toHaveClass('pl-16');
    expect(mapContainer).not.toHaveClass('pr-16');
  });

  it('renders portrait mobile layout with top/bottom padding', async () => {
    mockUseIsMobile.mockReturnValue(true);
    mockUseIsLandscape.mockReturnValue(false); // Portrait

    render(<App />);

    const mapComponent = screen.getByTestId('mock-map-component');
    const mapWrapper = mapComponent.parentElement;
    const mapContainer = mapWrapper?.parentElement;

    // Should have top and bottom padding for the bars
    expect(mapContainer).toHaveClass('pt-16');
    expect(mapContainer).toHaveClass('pb-16');
    // Should NOT have side padding
    expect(mapContainer).not.toHaveClass('pl-16');
    expect(mapContainer).not.toHaveClass('pr-16');
  });

  it('renders landscape mobile layout with left/right padding', async () => {
    mockUseIsMobile.mockReturnValue(true);
    mockUseIsLandscape.mockReturnValue(true); // Landscape

    render(<App />);

    const mapComponent = screen.getByTestId('mock-map-component');
    const mapWrapper = mapComponent.parentElement;
    const mapContainer = mapWrapper?.parentElement;

    // Should have left and right padding
    expect(mapContainer).toHaveClass('pl-16');
    expect(mapContainer).toHaveClass('pr-16');
    // Should NOT have vertical padding
    expect(mapContainer).not.toHaveClass('pt-16');
    expect(mapContainer).not.toHaveClass('pb-16');
  });
});
