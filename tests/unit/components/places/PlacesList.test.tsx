import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlacesList } from '@/components/places/PlacesList';
import { Place } from '@/types';

// Mock icons
jest.mock('@/components/Icons', () => ({
  ChevronDownIcon: () => <div data-testid="chevron-down" />,
  ChevronUpIcon: () => <div data-testid="chevron-up" />,
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

describe('PlacesList', () => {
  const mockToggleVisibility = jest.fn();
  const mockEdit = jest.fn();
  const mockDelete = jest.fn();
  const mockToggleCollapse = jest.fn();
  const mockZoomTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when collapsed', () => {
    render(
      <PlacesList
        places={[mockPlace]}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
        isCollapsed={true}
        onToggleCollapse={mockToggleCollapse}
      />
    );

    expect(screen.getByText('Places')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Count
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
    expect(screen.queryByText('Test Place')).not.toBeInTheDocument();
  });

  it('renders correctly when expanded', () => {
    render(
      <PlacesList
        places={[mockPlace]}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
        isCollapsed={false}
        onToggleCollapse={mockToggleCollapse}
      />
    );

    expect(screen.getByText('Places')).toBeInTheDocument();
    expect(screen.getByTestId('chevron-up')).toBeInTheDocument();
    expect(screen.getByText('Test Place')).toBeInTheDocument();
  });

  it('calls onToggleCollapse when header is clicked', () => {
    render(
      <PlacesList
        places={[mockPlace]}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
        isCollapsed={true}
        onToggleCollapse={mockToggleCollapse}
      />
    );

    // Click on the container div of header
    fireEvent.click(screen.getByText('Places').closest('div')!.parentElement!);
    expect(mockToggleCollapse).toHaveBeenCalled();
  });

  it('renders empty state', () => {
    render(
      <PlacesList
        places={[]}
        onToggleVisibility={mockToggleVisibility}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onZoomTo={mockZoomTo}
        isCollapsed={false}
        onToggleCollapse={mockToggleCollapse}
      />
    );

    expect(screen.getByText('No places added yet.')).toBeInTheDocument();
  });
});
