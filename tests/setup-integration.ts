/**
 * Setup file for integration tests using leaflet-node
 * Leaflet-node will set up its own jsdom environment with all necessary DOM APIs
 */

import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder/TextDecoder to global
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Note: leaflet-node handles all DOM setup including window, document, Image, etc.
// and patches HTMLImageElement to support network image loading with proxy support
