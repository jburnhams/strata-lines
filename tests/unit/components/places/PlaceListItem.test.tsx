import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceListItem } from '@/components/places/PlaceListItem';
import { Place } from '@/types';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

const mockPlace: Place = {
  id: 'place-1',
  latitude: 10,
  longitude: 20,
  title: 'Test Place',
  createdAt: 1000,
  source: 'manual',
  isVisible: true,
  showIcon: true,
  iconStyle: 'pin'
};

describe('PlaceListItem', () => {
  const mockToggleVisibility = jest.fn();
  const mockEdit = jest.fn();
  const mockDelete = jest.fn();
  const mockZoomTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders place details', () => {
    render(
      <PlaceListItem
        place={mockPlace}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
      />
    );

    expect(screen.getByText('Test Place')).toBeInTheDocument();
    expect(screen.getByTitle('Hide place')).toBeInTheDocument();
  });

  it('calls handlers', () => {
    render(
      <PlaceListItem
        place={mockPlace}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
      />
    );

    fireEvent.click(screen.getByTitle('Hide place'));
    expect(mockToggleVisibility).toHaveBeenCalledWith('place-1');

    // Edit and Delete buttons are visible on hover (or always in DOM but hidden via CSS)
    // We can click them directly in tests usually
    const editBtn = screen.getByTitle('Edit place');
    fireEvent.click(editBtn);
    expect(mockEdit).toHaveBeenCalledWith(mockPlace);

    const deleteBtn = screen.getByTitle('Delete place');
    fireEvent.click(deleteBtn);
    expect(mockDelete).toHaveBeenCalledWith('place-1');
  });

  it('handles zoom on double click', () => {
     render(
      <PlaceListItem
        place={mockPlace}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
      />
    );

    const item = screen.getByRole('listitem');
    fireEvent.doubleClick(item);
    expect(mockZoomTo).toHaveBeenCalledWith(mockPlace);
  });
});
