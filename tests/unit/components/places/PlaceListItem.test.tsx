import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceListItem } from '@/components/places/PlaceListItem';
import { Place } from '@/types';

jest.mock('@/components/Icons', () => ({
  EditIcon: () => <div data-testid="edit-icon" />,
  TrashIcon: () => <div data-testid="trash-icon" />,
  EyeIcon: () => <div data-testid="eye-icon" />,
  EyeOffIcon: () => <div data-testid="eye-off-icon" />
}));

const mockPlace: Place = {
  id: '1',
  latitude: 51.505,
  longitude: -0.09,
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
    expect(screen.getByText('M')).toBeInTheDocument(); // Manual source label
    expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
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

    fireEvent.click(screen.getByTestId('eye-icon').parentElement!);
    expect(mockToggleVisibility).toHaveBeenCalledWith('1');

    fireEvent.click(screen.getByTestId('edit-icon').parentElement!);
    expect(mockEdit).toHaveBeenCalledWith(mockPlace);

    fireEvent.click(screen.getByTestId('trash-icon').parentElement!);
    expect(mockDelete).toHaveBeenCalledWith('1');

    // Test double click on title container
    fireEvent.doubleClick(screen.getByText('Test Place'));
    expect(mockZoomTo).toHaveBeenCalledWith(mockPlace);
  });

  it('shows hidden eye icon when not visible', () => {
    render(
      <PlaceListItem
        place={{ ...mockPlace, isVisible: false }}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
      />
    );

    expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
  });
});
