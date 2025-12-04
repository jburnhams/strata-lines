import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import App from '@/App';
import * as db from '@/services/db';
import { Place, Track } from '@/types';
import * as trackPlaceUtils from '@/utils/trackPlaceUtils';
import { getGeocodingService } from '@/services/geocodingService';

// Mock dependencies
jest.mock('@/services/db');
jest.mock('@/components/MapComponent', () => ({
  MapComponent: () => <div data-testid="map-component">Map</div>
}));
jest.mock('@/utils/trackPlaceUtils');
jest.mock('@/services/geocodingService', () => ({
    getGeocodingService: jest.fn(),
}));

const mockGeocodingService = {
  getLocalityName: jest.fn().mockResolvedValue('Integrated Locality'),
};
(getGeocodingService as jest.Mock).mockReturnValue(mockGeocodingService);

const mockTrack: Track = {
  id: 't-int-ui-1',
  name: 'UI Integration Track',
  points: [[51.5, -0.1], [51.51, -0.11], [51.52, -0.12]],
  length: 5.0,
  isVisible: true,
  activityType: 'run',
  sourceFileId: 'file-1'
};

const mockPlaceStart: Place = {
    id: 'p-start',
    latitude: 51.5,
    longitude: -0.1,
    title: 'UI Integration Track',
    createdAt: 1000,
    source: 'track-start',
    trackId: 't-int-ui-1',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
};

describe('Track Places UI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getTracks as jest.Mock).mockResolvedValue([mockTrack]);
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([]);
    (db.getPlacesByTrackId as jest.Mock).mockResolvedValue([]);
    (db.savePlaceToDb as jest.Mock).mockResolvedValue(undefined);
    (db.updatePlaceInDb as jest.Mock).mockResolvedValue(undefined);
    (db.deletePlaceFromDb as jest.Mock).mockResolvedValue(undefined);
    (db.addTrack as jest.Mock).mockResolvedValue(undefined);
    (trackPlaceUtils.findOptimalMiddlePoint as jest.Mock).mockReturnValue([51.51, -0.11]);
    (trackPlaceUtils.findTrackMiddlePoint as jest.Mock).mockReturnValue([51.51, -0.11]);
  });

  it('renders track and place controls', async () => {
    render(<App />);

    await waitFor(() => {
        expect(screen.getByText('UI Integration Track')).toBeInTheDocument();
    });

    const managePlacesBtn = screen.getByTitle('Manage Places');
    expect(managePlacesBtn).toBeInTheDocument();

    // Expand places controls
    fireEvent.click(managePlacesBtn);

    expect(screen.getByText('Places:')).toBeInTheDocument();
    expect(screen.getByTitle('Add Start Place')).toBeInTheDocument();
    expect(screen.getByTitle('Add Middle Place')).toBeInTheDocument();
    expect(screen.getByTitle('Add End Place')).toBeInTheDocument();
    expect(screen.getByTitle('Add All')).toBeInTheDocument();
  });

  it('can create a start place', async () => {
    render(<App />);

    await waitFor(() => screen.getByText('UI Integration Track'));

    // Expand
    fireEvent.click(screen.getByTitle('Manage Places'));

    // Click Add Start
    fireEvent.click(screen.getByTitle('Add Start Place'));

    await waitFor(() => {
        expect(db.savePlaceToDb).toHaveBeenCalledWith(expect.objectContaining({
            source: 'track-start',
            trackId: mockTrack.id
        }));
    });

    // Should now show Remove button
    // We need to simulate the state update that happens after DB operation
    // Since App uses `useTrackManagement` which calls `getTracks`, and our mock `getTracks`
    // returns the static `mockTrack` which doesn't have the place ID, the UI won't update
    // unless we update the mock return value and trigger a re-render or if the hook handles local state.
    // The hook DOES update local state, so it should reflect immediately.
  });

  it('can create all places via batch button', async () => {
      render(<App />);
      await waitFor(() => screen.getByText('UI Integration Track'));
      fireEvent.click(screen.getByTitle('Manage Places'));

      fireEvent.click(screen.getByTitle('Add All'));

      await waitFor(() => {
          expect(db.savePlaceToDb).toHaveBeenCalledTimes(3);
      });
  });
});
