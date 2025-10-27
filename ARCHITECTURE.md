# StrataLines Architecture Document

## 1. Overview

StrataLines is a high-performance, client-side web application designed for visualizing personal GPS track data (from GPX, TCX, and FIT files). It allows users to upload their routes, view them on an interactive satellite map, and export high-resolution, print-quality images of their combined journeys.

The application is built as a single-page application (SPA) using **React** and **TypeScript**. It leverages a modern, build-less frontend architecture using native browser ES Modules and **import maps**, which eliminates the need for a complex build step during development and results in a fast, lightweight experience.

A key architectural principle is its **offline-first, data-privacy-centric design**. All user data (GPS tracks) is processed and stored exclusively in the user's browser using **IndexedDB**. No track data is ever sent to a server. UI settings are persisted in `localStorage` for a seamless user experience across sessions.

## 2. Core Features

-   **Multi-format File Parsing**: Supports GPX, TCX, and FIT file formats, including `.gz` compressed versions.
-   **Interactive Map Visualization**: Uses **Leaflet.js** and **React Leaflet** to display tracks on a choice of map styles (Satellite, Street Map, etc.).
-   **Client-Side Data Persistence**: All tracks are stored in the browser's IndexedDB, allowing users to close and reopen the app without losing their data.
-   **Track Management**: A full suite of tools to manage tracks, including:
    -   Listing all loaded tracks with names and distances.
    -   Toggling the visibility of individual tracks.
    -   Deleting individual tracks or all tracks at once.
    -   Downloading all tracks as a single ZIP archive.
    -   Filtering out tracks below a minimum length during import.
-   **Customizable Styling**: Users can control the appearance of the tracks, including line thickness and a randomized color gradient.
-   **High-Resolution Image Export**: The flagship feature, allowing users to export custom map views as high-quality PNG images. This includes:
    -   **Interactive Export Area**: A draggable and resizable box on the map defines the export region.
    -   **Custom Aspect Ratios**: Presets (16:9, A4, etc.) and custom ratios for the export.
    -   **Adjustable Quality**: A quality slider that increases the map detail (zoom level) for the final export.
    -   **Layered Exports**: Ability to export the final image as a single merged PNG, or as separate transparent layers (base map, lines, labels) for advanced editing in other software.
-   **Advanced Tiled Export**: For extremely large or high-resolution exports that would crash a browser, the app can generate a ZIP file containing all the individual map tiles and stitched images for each layer.

## 3. Technical Deep Dive

### 3.1. Project Structure

The codebase is organized into components, services, and static assets for clarity and maintainability.

-   `index.html`: The application's single entry point. It sets up the root DOM element, defines the **import map** for managing JavaScript dependencies without a bundler, and includes basic styles.
-   `index.tsx`: The root of the React application. It renders the main `<App />` component and contains logic to initialize the in-browser test suite if a specific URL query parameter is present (`?run_tests=true`).
-   `App.tsx`: The "brain" of the application. This is the primary stateful component that manages the entire application state, including the list of tracks, all UI settings (colors, quality, etc.), and loading/exporting states. It fetches data from IndexedDB on load and passes down state and callbacks to child components.
-   `components/`: This directory contains all reusable React components.
    -   `MapComponent.tsx`: A wrapper around the `MapContainer` from React Leaflet. It's responsible for rendering the tile layers, track polylines, and the draggable export box. It communicates user interactions (pan, zoom) back up to the `App` component.
    -   `ControlsPanel.tsx`: The UI sidebar. This is a largely "controlled" component that receives all its data and behavior via props from `App.tsx`. It contains all the inputs, buttons, and information displays for the user.
    -   `DraggableBoundsBox.tsx`: A specialized Leaflet component that renders the yellow, resizable bounding box for defining the export area.
-   `services/`: This directory contains the application's core business logic, decoupled from the UI.
    -   `gpxProcessor.ts`: Exports a function that takes an array of `File` objects and returns processed track data. It handles file reading, decompression (`pako`), and parsing for GPX (`gpxparser`), TCX (DOMParser), and FIT (`@garmin/fitsdk`).
    -   `db.ts`: An abstraction layer for all IndexedDB operations (get, add, delete, clear). This isolates database logic and makes it easy to manage.
    -   `gpxGenerator.ts`: A utility to convert a `Track` object back into a valid GPX 1.1 formatted string for the "Download All" feature.
    -   `utils.ts`: A collection of pure, reusable helper functions for tasks like color manipulation (hex to RGB, etc.) and calculating the geographical bounds of a set of tracks.
-   `tests.ts`: A lightweight, self-contained test suite that can be run directly in the browser. It includes a simple test runner and a series of assertions to validate the core logic in the `services/` directory.
-   `types.ts` & `constants.ts`: Centralized files for TypeScript type definitions and application-wide constants (e.g., aspect ratios, tile layer URLs), respectively.

### 3.2. State Management Strategy

The application employs a simple yet effective state management strategy without relying on external libraries like Redux or MobX.

-   **Application Data (Tracks)**: The single source of truth for track data is **IndexedDB**, managed by `services/db.ts`. On application load, `App.tsx` fetches all tracks from the database and stores them in a React state variable (`const [tracks, setTracks]`). All subsequent modifications (add, delete, toggle visibility) first update the React state for immediate UI feedback (optimistic update) and then persist the change to IndexedDB.
-   **UI State**: All user interface settings (e.g., line color, export quality, map center/zoom) are managed within `App.tsx` using React's `useState` hook. A custom hook, `useLocalStorage`, is used to wrap `useState`, automatically persisting these settings to the browser's **localStorage**. This ensures that the user's preferred settings are remembered between sessions.

### 3.3. Data Flow (Example: File Upload)

1.  **User Action**: The user clicks the "Add Files" button in the `ControlsPanel`.
2.  **Event Handling**: `ControlsPanel` triggers the `handleFiles` callback function, which was passed down as a prop from `App.tsx`.
3.  **Processing**: `App.tsx` receives the `FileList` object. It sets a loading state (`setIsLoading(true)`) and calls `processGpxFiles()` from the `services/gpxProcessor.ts` module.
4.  **Persistence**: Once `processGpxFiles` returns the new track data, `App.tsx` iterates through the new tracks, filters out duplicates or tracks that are too short, and calls `db.addTrack()` for each valid new track to save it to IndexedDB.
5.  **State Update**: `App.tsx` updates its own `tracks` state array with the new data (`setTracks([...oldTracks, ...newTracks])`).
6.  **Re-render**: The state update triggers a re-render of `App.tsx`. The new list of tracks is passed down as props to `ControlsPanel` (to update the track list) and `MapComponent` (to draw the new polylines on the map).
7.  **UI Feedback**: `App.tsx` sets a notification message and then sets the loading state back to false (`setIsLoading(false)`).

### 3.4. High-Resolution Export Logic

This is the most complex feature of the application, designed to handle image exports that can be hundreds of megapixels in size without crashing the browser.

1.  **Calculate Dimensions**: When the user initiates an export, the app uses the geographical bounds of the yellow export box (`exportBounds`) and the selected quality level (`exportQuality`, which acts as a zoom offset) to calculate the final pixel dimensions of the output image.

2.  **Recursive Tiling Strategy (`renderLayerRecursive`)**:
    -   The core of the export logic is a recursive function that checks if the calculated dimensions of a given geographical area exceed a predefined `MAX_TILE_DIMENSION` (e.g., 4000px).
    -   If they do, the geographical area is split in half (horizontally or vertically, depending on which dimension is larger). The function then calls itself for each of the two smaller areas.
    -   This process continues until the entire export area is divided into a grid of smaller "tiles," each of which is guaranteed to be renderable within browser memory limits.

3.  **Tile Rendering (`renderCanvasForBounds`)**:
    -   For each tile in the grid, the app creates a new, temporary, off-screen Leaflet map instance.
    -   This map's container is sized to the exact pixel dimensions of the tile.
    -   The map is programmatically centered and zoomed to fit the tile's specific geographical bounds perfectly.
    -   The required layers (e.g., base satellite imagery, track polylines) are added to this temporary map.
    -   A `waitForTiles` utility function pauses execution until all map tiles for the current view are fully loaded.
    -   Once loaded, `html2canvas` is used to capture a snapshot of the off-screen map container, producing an `HTMLCanvasElement` for that specific tile.

4.  **Stitching (`stitchCanvases`)**:
    -   After all tiles have been rendered into individual canvas elements, a final, large canvas is created with the total target dimensions.
    -   The application iterates through the rendered tile canvases, calculating the precise pixel offset of each tile relative to the top-left corner of the total export area.
    -   Each tile is then drawn onto the final canvas at its correct position using `drawImage`.

5.  **Final Output**: The fully stitched canvas is converted to a PNG Blob, and a temporary link is created to trigger a download for the user. For the ZIP export, each tile is saved individually, and the stitched images are also included if their total size is below a certain threshold.
