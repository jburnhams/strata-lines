import type { Place } from '@/types';

export const exportPlacesToGeoJSON = (places: Place[]): string => {
  const features = places.map(place => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [place.longitude, place.latitude]
    },
    properties: {
      id: place.id,
      title: place.title,
      source: place.source,
      activityType: place.iconStyle, // Mapping icon style to activity/type loosely
      createdAt: new Date(place.createdAt).toISOString()
    }
  }));

  const collection = {
    type: 'FeatureCollection',
    features
  };

  return JSON.stringify(collection, null, 2);
};

export const exportPlacesToCSV = (places: Place[]): string => {
  const headers = ['ID', 'Title', 'Latitude', 'Longitude', 'Source', 'Created At'];
  const rows = places.map(place => {
    // Escape quotes in title
    const safeTitle = `"${place.title.replace(/"/g, '""')}"`;
    return [
      place.id,
      safeTitle,
      place.latitude.toFixed(6),
      place.longitude.toFixed(6),
      place.source,
      new Date(place.createdAt).toISOString()
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const exportPlacesToGPX = (places: Place[]): string => {
  const wpts = places.map(place => {
    return `  <wpt lat="${place.latitude}" lon="${place.longitude}">
    <name>${place.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</name>
    <time>${new Date(place.createdAt).toISOString()}</time>
    <desc>Source: ${place.source}</desc>
  </wpt>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StrataLines" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
</gpx>`;
};

export const downloadPlaces = (places: Place[], format: 'geojson' | 'csv' | 'gpx') => {
  let content = '';
  let mimeType = '';
  let extension = '';

  switch (format) {
    case 'geojson':
      content = exportPlacesToGeoJSON(places);
      mimeType = 'application/json';
      extension = 'json';
      break;
    case 'csv':
      content = exportPlacesToCSV(places);
      mimeType = 'text/csv';
      extension = 'csv';
      break;
    case 'gpx':
      content = exportPlacesToGPX(places);
      mimeType = 'application/gpx+xml';
      extension = 'gpx';
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];

  link.href = url;
  link.download = `places-${date}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
