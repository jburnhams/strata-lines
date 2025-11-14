import type { Track } from '@/types';

/**
 * Converts a track object into a GPX 1.1 formatted string.
 * @param track The track to convert.
 * @returns A string containing the GPX data.
 */
export const trackToGpxString = (track: Track): string => {
    const pointsXml = track.points.map(p => `        <trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StrataLines" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name><![CDATA[${track.name}]]></name>
    <trkseg>
${pointsXml}
    </trkseg>
  </trk>
</gpx>`;
};
