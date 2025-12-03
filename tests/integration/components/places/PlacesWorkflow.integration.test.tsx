import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '@/App';
import * as db from '@/services/db';
import { Place } from '@/types';

// Mock DB
jest.mock('@/services/db');

// Mock MapComponent
jest.mock('@/components/MapComponent', () => ({
  MapComponent: () => <div data-testid="map-component">Map</div>
}));

// Mock prompt for edit
const mockPrompt = jest.fn();
window.prompt = mockPrompt;

// Mock GeocodingSearchDialog
jest.mock('@/components/places/GeocodingSearchDialog', () => {
  return (props: any) => {
    return props.isOpen ? (
      <div data-testid="geocoding-dialog">
        <button
          onClick={() => props.onSelectLocation({
            displayName: 'Simulated Place',
            locality: 'Simulated Locality',
            latitude: 20,
            longitude: 20
          })}
        >
          Select Simulated Location
        </button>
      </div>
    ) : null;
  };
});

const mockPlace: Place = {
  id: '1',
  latitude: 51.505,
  longitude: -0.09,
  title: 'Existing Place',
  createdAt: 1000,
  source: 'manual',
  isVisible: true,
  showIcon: true,
  iconStyle: 'pin'
};

describe('Places Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getTracks as jest.Mock).mockResolvedValue([]);
    (db.getAllPlacesFromDb as jest.Mock).mockResolvedValue([mockPlace]);
    (db.savePlaceToDb as jest.Mock).mockResolvedValue(undefined);
    (db.updatePlaceInDb as jest.Mock).mockImplementation((id, updates) => Promise.resolve({ ...mockPlace, ...updates }));
    (db.deletePlaceFromDb as jest.Mock).mockResolvedValue(undefined);
    (db.getTracksByActivityType as jest.Mock).mockResolvedValue([]);
  });

  it('loads places and renders them', async () => {
    render(<App />);

    // Wait for places to load
    await waitFor(() => {
      expect(screen.getByText('Existing Place')).toBeInTheDocument();
    });

    const placesHeading = screen.getByRole('heading', { name: 'Places' });
    expect(placesHeading).toBeInTheDocument();

    const placesSection = placesHeading.closest('section');
    expect(placesSection).toBeInTheDocument();

    // Check for count '1' inside the section
    if (placesSection) {
       expect(within(placesSection).getByText('1')).toBeInTheDocument();
    }
  });

  it('can add a place via dialog workflow', async () => {
    render(<App />);

    await waitFor(() => screen.getByText('Add Place'));

    fireEvent.click(screen.getByText('Add Place'));

    // Expect dialog to open
    expect(screen.getByTestId('geocoding-dialog')).toBeInTheDocument();

    // Select location
    fireEvent.click(screen.getByText('Select Simulated Location'));

    // Should call savePlaceToDb
    await waitFor(() => {
        expect(db.savePlaceToDb).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Simulated Locality',
            latitude: 20,
            longitude: 20
        }));
    });
  });

  it('can toggle visibility', async () => {
    render(<App />);

    await waitFor(() => screen.getByText('Existing Place'));

    const eyeIcon = screen.getByTitle('Hide place');
    fireEvent.click(eyeIcon);

    expect(db.updatePlaceInDb).toHaveBeenCalledWith('1', { isVisible: false });
  });

  it('can edit a place title', async () => {
    mockPrompt.mockReturnValue('New Title');

    render(<App />);

    await waitFor(() => screen.getByText('Existing Place'));

    const editButton = screen.getByTitle('Edit place');
    fireEvent.click(editButton);

    expect(mockPrompt).toHaveBeenCalledWith("Enter new title", "Existing Place");
    expect(db.updatePlaceInDb).toHaveBeenCalledWith('1', { title: 'New Title' });

    (db.updatePlaceInDb as jest.Mock).mockReturnValue(Promise.resolve({ ...mockPlace, title: 'New Title' }));

    await waitFor(() => {
        expect(screen.getByText('New Title')).toBeInTheDocument();
    });
  });

  it('can delete a place', async () => {
    render(<App />);

    await waitFor(() => screen.getByText('Existing Place'));

    const deleteButton = screen.getByTitle('Delete place');
    fireEvent.click(deleteButton);

    expect(db.deletePlaceFromDb).toHaveBeenCalledWith('1');

    await waitFor(() => {
        expect(screen.queryByText('Existing Place')).not.toBeInTheDocument();
    });
  });
});
