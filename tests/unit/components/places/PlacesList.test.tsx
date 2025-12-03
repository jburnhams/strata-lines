import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlacesList } from '@/components/places/PlacesList';
import { Place } from '@/types';

// Mock useLocalStorage
jest.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn((key, initial) => [initial, jest.fn()]),
}));

const mockPlaces: Place[] = [
  {
    id: 'place-1',
    latitude: 51.505,
    longitude: -0.09,
    title: 'Manual Place',
    createdAt: 1000,
    source: 'manual',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
  },
  {
    id: 'place-2',
    latitude: 51.515,
    longitude: -0.10,
    title: 'Track Place',
    createdAt: 1001,
    source: 'track-start',
    isVisible: true,
    showIcon: true,
    iconStyle: 'dot'
  }
];

const mockHandlers = {
  onToggleVisibility: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onZoomTo: jest.fn(),
};

describe('PlacesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list of places grouped by source', () => {
    render(<PlacesList places={mockPlaces} {...mockHandlers} />);

    expect(screen.getByText('Places')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Count
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Track')).toBeInTheDocument();
    expect(screen.getByText('Manual Place')).toBeInTheDocument();
    expect(screen.getByText('Track Place')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<PlacesList places={[]} {...mockHandlers} />);

    expect(screen.getByText('No places added yet.')).toBeInTheDocument();
  });
});
