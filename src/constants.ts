


import L from 'leaflet';
import type { TileLayerDefinition } from './types';

// A stable center point for initial map load and calculations
export const UK_CENTER_LATLNG = new L.LatLng(54.5, -2.5);

export const ASPECT_RATIOS = [
  { key: '16:9', label: 'Landscape 16:9', width: 16, height: 9 },
  { key: '4:3', label: 'Landscape 4:3', width: 4, height: 3 },
  { key: '3:2', label: 'Landscape 3:2', width: 3, height: 2 },
  { key: 'a4l', label: 'A4 Landscape', width: 297, height: 210 },
  { key: '1:1', label: 'Square 1:1', width: 1, height: 1 },
  { key: '9:16', label: 'Portrait 9:16', width: 9, height: 16 },
  { key: '3:4', label: 'Portrait 3:4', width: 3, height: 4 },
  { key: '2:3', label: 'Portrait 2:3', width: 2, height: 3 },
  { key: 'a4p', label: 'A4 Portrait', width: 210, height: 297 },
];

export const TILE_LAYERS: TileLayerDefinition[] = [
  {
    key: 'esriImagery',
    name: 'Satellite',
    layers: [{
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    }],
  },
  {
    key: 'openStreetMap',
    name: 'Street Map',
    layers: [{
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }],
  },
  {
    key: 'openTopoMap',
    name: 'Topographic',
    layers: [{
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    }],
  },
  {
    key: 'cartoDark',
    name: 'CartoDB Dark',
    layers: [{
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }],
  },
  {
    key: 'cartoLight',
    name: 'CartoDB Light',
    layers: [{
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }],
  },
];
