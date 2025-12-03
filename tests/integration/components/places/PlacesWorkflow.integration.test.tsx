import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App';
import * as db from '@/services/db';
import { Place } from '@/types';
import 'fake-indexeddb/auto';
import { jest } from '@jest/globals';

// Mock MapComponent
jest.mock('@/components/MapComponent', () => ({
  MapComponent: ({ places }: { places: Place[] }) => (
    <div data-testid="mock-map">
      Map
      {places?.map(p => (
        <div key={p.id} data-testid={`map-place-${p.id}`}>
            {p.isVisible ? 'Visible' : 'Hidden'}
        </div>
      ))}
    </div>
  )
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock prompt and confirm
// @ts-ignore
window.prompt = jest.fn();
// @ts-ignore
window.confirm = jest.fn();

describe('Places Workflow Integration', () => {
  const mockPlace: Place = {
    id: 'place-1',
    latitude: 51.505,
    longitude: -0.09,
    title: 'London Eye',
    createdAt: Date.now(),
    source: 'manual',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin'
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (window.confirm as jest.Mock).mockReturnValue(true);
    (window.prompt as jest.Mock).mockReturnValue('Updated Title');

    // Setup DB
    await db.clearAllPlacesFromDb();
    await db.clearTracks();
    await db.savePlaceToDb(mockPlace);
  });

  it('loads places and allows interaction', async () => {
    render(<App />);

    // 1. Verify place is loaded
    await waitFor(() => {
        expect(screen.getByText('London Eye')).toBeInTheDocument();
    });

    // 2. Verify map shows place
    expect(screen.getByTestId('map-place-place-1')).toHaveTextContent('Visible');

    // 3. Toggle visibility
    // Find the toggle button. It has title "Hide place" initially.
    const hideBtn = screen.getByTitle('Hide place');
    fireEvent.click(hideBtn);

    // Verify map update
    await waitFor(() => {
        expect(screen.getByTestId('map-place-place-1')).toHaveTextContent('Hidden');
    });

    // Verify list update
    expect(screen.getByTitle('Show place')).toBeInTheDocument();

    // 4. Edit place
    // Hover to see edit button, or just click it (it's in DOM)
    const editBtn = screen.getByTitle('Edit place');
    fireEvent.click(editBtn);

    // Should have called prompt
    expect(window.prompt).toHaveBeenCalledWith('Enter new title', 'London Eye');

    // Should update title
    await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });

    // 5. Delete place
    const deleteBtn = screen.getByTitle('Delete place');
    fireEvent.click(deleteBtn);

    // Should remove from list
    await waitFor(() => {
        expect(screen.queryByText('Updated Title')).not.toBeInTheDocument();
    });

    // Verify DB empty
    const places = await db.getAllPlacesFromDb();
    expect(places).toHaveLength(0);
  });
});
