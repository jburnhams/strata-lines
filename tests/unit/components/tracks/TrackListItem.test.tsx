import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TrackListItem } from '@/components/tracks/TrackListItem';
import type { Track } from '@/types';
import { jest, describe, it } from '@jest/globals';

const mockTrack: Track = {
  id: 't1',
  name: 'Test Track',
  points: [],
  length: 10,
  isVisible: true,
  activityType: 'run',
};

describe('TrackListItem', () => {
  const defaultProps = {
    track: mockTrack,
    onHover: jest.fn(),
    onToggleVisibility: jest.fn(),
    onRemove: jest.fn(),
    createTrackPlace: jest.fn<any>().mockResolvedValue(undefined),
    removeTrackPlace: jest.fn<any>().mockResolvedValue(undefined),
    createAllTrackPlaces: jest.fn<any>().mockResolvedValue(undefined),
    removeAllTrackPlaces: jest.fn<any>().mockResolvedValue(undefined),
  };

  it('renders track name and length', () => {
    render(<TrackListItem {...defaultProps} />);
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('10.0 km')).toBeInTheDocument();
  });

  it('toggles places panel', () => {
    render(<TrackListItem {...defaultProps} />);
    const manageBtn = screen.getByTitle('Manage Places');
    fireEvent.click(manageBtn);
    expect(screen.getByText('Places:')).toBeInTheDocument();
  });

  it('calls createTrackPlace when start button clicked', async () => {
    render(<TrackListItem {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Manage Places'));

    const startBtn = screen.getByTitle('Add Start Place');
    await act(async () => {
      fireEvent.click(startBtn);
    });

    expect(defaultProps.createTrackPlace).toHaveBeenCalledWith('t1', 'start', false);
  });

  it('shows remove button when place exists', async () => {
    const trackWithPlace = { ...mockTrack, startPlaceId: 'p1' };
    render(<TrackListItem {...defaultProps} track={trackWithPlace} />);
    fireEvent.click(screen.getByTitle('Manage Places'));

    const removeBtn = screen.getByTitle('Remove Start Place');
    expect(removeBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(removeBtn);
    });
    expect(defaultProps.removeTrackPlace).toHaveBeenCalledWith('t1', 'start');
  });

  it('calls createAllTrackPlaces', async () => {
    render(<TrackListItem {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Manage Places'));

    const allBtn = screen.getByTitle('Add All');
    await act(async () => {
      fireEvent.click(allBtn);
    });

    expect(defaultProps.createAllTrackPlaces).toHaveBeenCalledWith('t1', false);
  });
});
