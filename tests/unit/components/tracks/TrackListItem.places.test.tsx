import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TrackListItem } from '@/components/tracks/TrackListItem';
import type { Track, TrackPlaceType } from '@/types';
import { jest } from '@jest/globals';

// Mock Icons
jest.mock('@/components/Icons', () => ({
  EyeIcon: () => <span data-testid="eye-icon" />,
  EyeOffIcon: () => <span data-testid="eye-off-icon" />,
  PinIcon: () => <span data-testid="pin-icon" />
}));

const mockTrack: Track = {
  id: 't1',
  name: 'Test Track',
  points: [[0,0], [1,1]],
  length: 10,
  isVisible: true,
  activityType: 'run'
};

describe('TrackListItem Places', () => {
  const defaultProps = {
    track: mockTrack,
    onHover: jest.fn(),
    onToggleVisibility: jest.fn(),
    onRemove: jest.fn(),
    createTrackPlace: jest.fn<(id: string, type: TrackPlaceType, useLocality: boolean) => Promise<any>>().mockResolvedValue(undefined),
    removeTrackPlace: jest.fn<(id: string, type: TrackPlaceType) => Promise<void>>().mockResolvedValue(undefined),
    createAllTrackPlaces: jest.fn<(id: string, useLocality: boolean) => Promise<any>>().mockResolvedValue({}),
    removeAllTrackPlaces: jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders place management button', () => {
    render(<TrackListItem {...defaultProps} />);
    expect(screen.getByTitle('Manage Places')).toBeInTheDocument();
  });

  it('expands places section when clicked', async () => {
    render(<TrackListItem {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Manage Places'));
    expect(screen.getByText('Places:')).toBeInTheDocument();
  });

  it('calls createTrackPlace when Add button clicked', async () => {
    render(<TrackListItem {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Manage Places'));

    // Find Add Start Place button (S)
    const addStartBtn = screen.getByTitle('Add Start Place');
    fireEvent.click(addStartBtn);

    expect(defaultProps.createTrackPlace).toHaveBeenCalledWith('t1', 'start', false);
  });

  it('calls removeTrackPlace when Remove button clicked', async () => {
    const trackWithPlace = { ...mockTrack, startPlaceId: 'p1' };
    render(<TrackListItem {...defaultProps} track={trackWithPlace} />);
    fireEvent.click(screen.getByTitle('Manage Places'));

    // Find Remove Start Place button (S - active)
    const removeStartBtn = screen.getByTitle('Remove Start Place');
    fireEvent.click(removeStartBtn);

    expect(defaultProps.removeTrackPlace).toHaveBeenCalledWith('t1', 'start');
  });

  it('calls createAllTrackPlaces when +All clicked', async () => {
    render(<TrackListItem {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Manage Places'));

    const addAllBtn = screen.getByTitle('Add All');
    fireEvent.click(addAllBtn);

    expect(defaultProps.createAllTrackPlaces).toHaveBeenCalledWith('t1', false);
  });

  it('calls removeAllTrackPlaces when -All clicked', async () => {
    render(<TrackListItem {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Manage Places'));

    const removeAllBtn = screen.getByTitle('Remove All');
    fireEvent.click(removeAllBtn);

    expect(defaultProps.removeAllTrackPlaces).toHaveBeenCalledWith('t1');
  });

  it('shows loading state during operation', async () => {
    // Make promise resolve slowly
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise(r => resolvePromise = r);
    const slowCreate = jest.fn<(id: string, type: TrackPlaceType, useLocality: boolean) => Promise<any>>().mockReturnValue(promise);

    render(<TrackListItem {...defaultProps} createTrackPlace={slowCreate} />);
    fireEvent.click(screen.getByTitle('Manage Places'));

    const addStartBtn = screen.getByTitle('Add Start Place');
    fireEvent.click(addStartBtn);

    // It should be disabled/loading
    expect(addStartBtn).toBeDisabled();

    // Finish promise
    // Wrap in act because it triggers state update in component
    await React.act(async () => {
        resolvePromise!(undefined);
    });

    await waitFor(() => expect(addStartBtn).not.toBeDisabled());
  });

  it('shows loading state for All operation', async () => {
     let resolvePromise: (value: unknown) => void;
     const promise = new Promise(r => resolvePromise = r);
     const slowCreateAll = jest.fn<(id: string, useLocality: boolean) => Promise<any>>().mockReturnValue(promise);

     render(<TrackListItem {...defaultProps} createAllTrackPlaces={slowCreateAll} />);
     fireEvent.click(screen.getByTitle('Manage Places'));

     const addAllBtn = screen.getByTitle('Add All');
     fireEvent.click(addAllBtn);

     expect(addAllBtn).toBeDisabled();
     expect(addAllBtn).toHaveTextContent('...');

     // Wrap in act
     await React.act(async () => {
        resolvePromise!({});
     });

     await waitFor(() => expect(addAllBtn).not.toBeDisabled());
     expect(addAllBtn).toHaveTextContent('+All');
  });
});
