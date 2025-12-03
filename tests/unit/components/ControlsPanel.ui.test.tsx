import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlsPanel } from '@/components/ControlsPanel';
import * as useMediaQueryHooks from '@/hooks/useMediaQuery';
import '@testing-library/jest-dom';

// Mock the hooks
jest.mock('@/hooks/useMediaQuery', () => ({
  useIsMobile: jest.fn(),
  useIsLandscape: jest.fn(),
  useMediaQuery: jest.fn(),
}));

const mockUseIsMobile = useMediaQueryHooks.useIsMobile as jest.Mock;
const mockUseIsLandscape = useMediaQueryHooks.useIsLandscape as jest.Mock;

const defaultProps = {
  tracks: [],
  handleFiles: jest.fn(),
  removeTrack: jest.fn(),
  removeAllTracks: jest.fn(),
  toggleTrackVisibility: jest.fn(),
  handleExport: jest.fn(),
  handleExportBase: jest.fn(),
  handleExportLines: jest.fn(),
  handleExportLabels: jest.fn(),
  aspectRatio: { width: 16, height: 9, label: '16:9' },
  setAspectRatio: jest.fn(),
  exportBoundsAspectRatio: null,
  exportQuality: 0.92,
  setExportQuality: jest.fn(),
  outputFormat: 'png' as const,
  setOutputFormat: jest.fn(),
  jpegQuality: 0.8,
  setJpegQuality: jest.fn(),
  derivedExportZoom: 12,
  isLoading: false,
  isExporting: false,
  isExportingBase: false,
  isExportingLines: false,
  isExportingLabels: false,
  notification: null,
  setNotification: jest.fn(),
  lineColorStart: '#ff0000',
  setLineColorStart: jest.fn(),
  lineColorEnd: '#00ff00',
  setLineColorEnd: jest.fn(),
  lineThickness: 3,
  setLineThickness: jest.fn(),
  viewportMiles: { width: 5, height: 5 },
  exportDimensions: { width: 2000, height: 2000 },
  minLengthFilter: 0,
  setMinLengthFilter: jest.fn(),
  tileLayerKey: 'esriImagery',
  setTileLayerKey: jest.fn(),
  labelDensity: 1,
  setLabelDensity: jest.fn(),
  onTrackHover: jest.fn(),
  handleDownloadAllTracks: jest.fn(),
  isDownloading: false,
  maxDimension: 4000,
  setMaxDimension: jest.fn(),
  activityCounts: {},
  hiddenActivityTypes: new Set<string>(),
  toggleActivityFilter: jest.fn(),
  places: [],
  onAddPlaceClick: jest.fn(),
  updatePlace: jest.fn(),
  deletePlace: jest.fn(),
  togglePlaceVisibility: jest.fn(),
  toggleAllPlacesVisibility: jest.fn(),
  placeTitleSize: 50,
  setPlaceTitleSize: jest.fn(),
  showIconsGlobally: true,
  setShowIconsGlobally: jest.fn(),
  onZoomToPlace: jest.fn(),
};

describe('ControlsPanel UI Text', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false); // Default to Desktop
    mockUseIsLandscape.mockReturnValue(false);
  });

  it('verifies numbered headers are removed', () => {
    render(<ControlsPanel {...defaultProps} />);

    // Files Control
    expect(screen.queryByText(/1\. Manage GPX/)).not.toBeInTheDocument();
    expect(screen.getByText('Manage GPX / TCX / FIT Files')).toBeInTheDocument();

    // To see other controls, we need to activate Advanced Mode
    const advancedToggle = screen.getByText('Advanced Mode');
    fireEvent.click(advancedToggle);

    // Map Style Control
    expect(screen.queryByText(/2\. Map & Line Style/)).not.toBeInTheDocument();
    expect(screen.getByText('Map & Line Style')).toBeInTheDocument();

    // Export Config Control
    expect(screen.queryByText(/3\. Configure Export/)).not.toBeInTheDocument();
    expect(screen.getByText('Configure Export')).toBeInTheDocument();
  });

  it('verifies export button text', () => {
     render(<ControlsPanel {...defaultProps} />);

     // Normal mode
     expect(screen.queryByText(/4\. Export PNG \(Merged\)/)).not.toBeInTheDocument();
     // Should be just "Export"
     expect(screen.getByRole('button', { name: /^Export$/ })).toBeInTheDocument();

     // Switch to Advanced Mode
     const advancedToggle = screen.getByText('Advanced Mode');
     fireEvent.click(advancedToggle);

     // In Advanced Mode, it becomes "Export Selected"
     expect(screen.getByRole('button', { name: /^Export Selected$/ })).toBeInTheDocument();
  });
});
