import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
};

describe('ControlsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false); // Default to Desktop
    mockUseIsLandscape.mockReturnValue(false);
  });

  it('renders desktop layout by default', () => {
    render(<ControlsPanel {...defaultProps} />);
    // Check for Sidebar title which is present in Desktop view
    expect(screen.getByText('StrataLines')).toBeInTheDocument();
    expect(screen.getByText(/Weave your routes/i)).toBeInTheDocument();
  });

  describe('Mobile Layout', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('renders mobile layout buttons when collapsed', () => {
      render(<ControlsPanel {...defaultProps} />);

      // Should show "Add Files" and "Export" buttons directly
      expect(screen.getByText('Add Files')).toBeVisible();
      expect(screen.getByText('Export')).toBeVisible();
    });

    it('toggles Files drawer', () => {
      render(<ControlsPanel {...defaultProps} />);

      // Find toggle for files (top/left)
      const filesToggle = screen.getByLabelText('Open Files Drawer');
      fireEvent.click(filesToggle);

      // Drawer should be open
      expect(screen.getByText('Files & Tracks')).toBeVisible();

      // Close it
      const closeButton = screen.getByLabelText('Close Drawer');
      fireEvent.click(closeButton);

      // Drawer content should be removed from DOM
      expect(screen.queryByText('Files & Tracks')).not.toBeInTheDocument();
    });

    it('toggles Settings drawer', () => {
      render(<ControlsPanel {...defaultProps} />);

      const settingsToggle = screen.getByLabelText('Open Settings Drawer');
      fireEvent.click(settingsToggle);

      expect(screen.getByText('Settings & Export')).toBeVisible();
    });

    it('ensures exclusive drawer access (UI hides other toggles when one is open)', () => {
      render(<ControlsPanel {...defaultProps} />);

      // Open Files Drawer
      const filesToggle = screen.getByLabelText('Open Files Drawer');
      fireEvent.click(filesToggle);
      expect(screen.getByText('Files & Tracks')).toBeVisible();

      // Settings Toggle should NOT be present (covered/removed by overlay logic)
      expect(screen.queryByLabelText('Open Settings Drawer')).not.toBeInTheDocument();

      // Close Files
      const closeButton = screen.getByLabelText('Close Drawer');
      fireEvent.click(closeButton);

      // Settings Toggle should be back
      expect(screen.getByLabelText('Open Settings Drawer')).toBeVisible();

      // Open Settings
      const settingsToggle = screen.getByLabelText('Open Settings Drawer');
      fireEvent.click(settingsToggle);
      expect(screen.getByText('Settings & Export')).toBeVisible();

      // Files Toggle should be gone
      expect(screen.queryByLabelText('Open Files Drawer')).not.toBeInTheDocument();
    });

    it('triggers Add Files directly from collapsed state', () => {
        render(<ControlsPanel {...defaultProps} />);

        const addFileBtn = screen.getByText('Add Files');
        fireEvent.click(addFileBtn);

        // Check that the hidden file input exists
        const fileInput = screen.getByTestId('hidden-file-input');
        expect(fileInput).toBeInTheDocument();
    });
  });
});
