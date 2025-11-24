import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import App from '@/App';
import * as useMediaQueryHooks from '@/hooks/useMediaQuery';
import * as db from '@/services/db';

// Mock MapComponent to avoid Leaflet/Canvas overhead during layout testing
jest.mock('@/components/MapComponent', () => ({
  MapComponent: () => <div data-testid="mock-map">Map</div>
}));

// Mock hooks to control responsiveness
jest.mock('@/hooks/useMediaQuery', () => ({
  useIsMobile: jest.fn(),
  useIsLandscape: jest.fn(),
  useMediaQuery: jest.fn(),
}));

const mockUseIsMobile = useMediaQueryHooks.useIsMobile as jest.Mock;
const mockUseIsLandscape = useMediaQueryHooks.useIsLandscape as jest.Mock;

// Mock DB to prevent side effects and ensure clean state
jest.mock('@/services/db', () => ({
  getTracks: jest.fn(),
  saveTrack: jest.fn(),
  deleteTrack: jest.fn(),
  clearTracks: jest.fn(),
  updateTrackVisibility: jest.fn(),
}));

describe('Responsive Layout Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getTracks as jest.Mock).mockResolvedValue([]);
    mockUseIsMobile.mockReturnValue(false); // Default Desktop
    mockUseIsLandscape.mockReturnValue(false);
    localStorage.clear();
  });

  it('switches between desktop and mobile layouts based on screen size hook', async () => {
    // 1. Initial Render: Desktop
    mockUseIsMobile.mockReturnValue(false);

    const { rerender, unmount } = render(<App />);

    // Check for Desktop specific element (Sidebar header)
    expect(screen.getByText('StrataLines')).toBeVisible();
    expect(screen.getByText(/Weave your routes/i)).toBeVisible();

    // Check that Mobile controls are NOT present
    expect(screen.queryByLabelText('Open Files Drawer')).not.toBeInTheDocument();

    unmount(); // Unmount to reset state/DOM for next render pass with new mock

    // 2. Switch to Mobile Portrait
    mockUseIsMobile.mockReturnValue(true);
    mockUseIsLandscape.mockReturnValue(false);

    render(<App />);

    // Desktop sidebar should be gone
    // Note: It might still be in DOM if hidden, but our implementation conditionally renders it.
    expect(screen.queryByText(/Weave your routes/i)).not.toBeInTheDocument();

    // Mobile controls should be present
    expect(screen.getByText('Add Files')).toBeVisible();
    expect(screen.getByText('Export')).toBeVisible();
    // In Portrait, we expect Top and Bottom bars.
    // We can check classes or position, but checking visibility of buttons is good enough for functional test.

    // 3. Test Drawer Interaction in App context
    const filesToggle = screen.getByLabelText('Open Files Drawer');
    fireEvent.click(filesToggle);

    expect(screen.getByText('Files & Tracks')).toBeVisible();
    expect(screen.getByText('1. Manage GPX / TCX / FIT Files')).toBeVisible();
  });

  it('adapts to landscape orientation in mobile', () => {
    mockUseIsMobile.mockReturnValue(true);
    mockUseIsLandscape.mockReturnValue(true); // Landscape

    render(<App />);

    // Check Mobile controls
    // In landscape, we expect the layout to change (CSS classes).
    // We can verify that the "Add Files" button is present (it might be an icon now).
    // Our implementation for Landscape Add Files button uses an Icon only?
    // <button title="Add Files"> ... <PlusIcon /> ... </button>

    // So getByText('Add Files') might fail if it's just an icon.
    // Let's check the code:
    // {isLandscape ? <PlusIcon /> : <span className="text-sm">Add Files</span>}

    // So we should query by title or aria-label.
    expect(screen.getByTitle('Add Files')).toBeInTheDocument();
    expect(screen.queryByText('Add Files')).not.toBeInTheDocument(); // Text should be hidden

    expect(screen.getByTitle('Export')).toBeInTheDocument();
  });
});
