import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlacesList } from '@/components/places/PlacesList';
import { Place } from '@/types';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock useLocalStorage to behave like useState for testing state changes
jest.mock('@/hooks/useLocalStorage', () => {
  const React = require('react');
  return {
    useLocalStorage: (key: string, initialValue: any) => React.useState(initialValue),
  };
});

const mockPlaces: Place[] = [
  {
    id: 'place-1',
    latitude: 10,
    longitude: 20,
    title: 'Manual Place',
    createdAt: 1000,
    source: 'manual',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
  },
  {
    id: 'place-2',
    latitude: 11,
    longitude: 21,
    title: 'Track Place',
    createdAt: 2000,
    source: 'track-start',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
  }
];

describe('PlacesList', () => {
  const mockToggleVisibility = jest.fn();
  const mockEdit = jest.fn();
  const mockDelete = jest.fn();
  const mockZoomTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders grouped places', () => {
    render(
      <PlacesList
        places={mockPlaces}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
      />
    );

    expect(screen.getByText('Manual Place')).toBeInTheDocument();
    expect(screen.getByText('Track Place')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Track')).toBeInTheDocument();
  });

  it('handles empty state', () => {
    render(
      <PlacesList
        places={[]}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
      />
    );

    expect(screen.getByText('No places added yet.')).toBeInTheDocument();
  });

  it('can collapse', () => {
      render(
      <PlacesList
        places={mockPlaces}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
      />
    );

    // Initial state is expanded (mock default false for isCollapsed, wait, default is false means NOT collapsed)
    // In component: const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>('places-collapsed', false);
    // So default is false (expanded).

    expect(screen.getByText('Manual Place')).toBeInTheDocument();

    const button = screen.getByText('Places').closest('button');
    fireEvent.click(button!);

    // Should be collapsed now (isCollapsed = true)
    // The content is conditionally rendered: {!isCollapsed && ...}
    expect(screen.queryByText('Manual Place')).not.toBeInTheDocument();
  });
});
