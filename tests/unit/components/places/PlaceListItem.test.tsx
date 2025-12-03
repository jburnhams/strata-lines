import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlaceListItem } from '@/components/places/PlaceListItem';
import { Place } from '@/types';

const mockPlace: Place = {
  id: 'place-1',
  latitude: 51.505,
  longitude: -0.09,
  title: 'Test Place',
  createdAt: 1000,
  source: 'manual',
  isVisible: true,
  showIcon: true,
  iconStyle: 'pin'
};

const mockHandlers = {
  onToggleVisibility: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onZoomTo: jest.fn(),
};

describe('PlaceListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders place information', () => {
    render(<PlaceListItem place={mockPlace} {...mockHandlers} />);

    expect(screen.getByText('Test Place')).toBeInTheDocument();
    expect(screen.getByText('manual')).toBeInTheDocument();
  });

  it('calls onToggleVisibility when eye icon is clicked', () => {
    render(<PlaceListItem place={mockPlace} {...mockHandlers} />);

    const eyeButton = screen.getByLabelText('Hide place');
    fireEvent.click(eyeButton);

    expect(mockHandlers.onToggleVisibility).toHaveBeenCalledWith(mockPlace.id);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<PlaceListItem place={mockPlace} {...mockHandlers} />);

    const editButton = screen.getByLabelText('Edit place');
    fireEvent.click(editButton);

    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockPlace);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<PlaceListItem place={mockPlace} {...mockHandlers} />);

    const deleteButton = screen.getByLabelText('Delete place');
    fireEvent.click(deleteButton);

    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockPlace.id);
  });

  it('calls onZoomTo on double click', () => {
    render(<PlaceListItem place={mockPlace} {...mockHandlers} />);

    const item = screen.getByRole('listitem');
    fireEvent.doubleClick(item);

    expect(mockHandlers.onZoomTo).toHaveBeenCalledWith(mockPlace);
  });
});
