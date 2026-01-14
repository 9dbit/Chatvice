export interface LocationData {
  latitude: number;
  longitude: number;
  source: 'exif' | 'browser';
  accuracy?: number;
  timestamp?: number;
}

export async function extractExifLocation(file: File): Promise<LocationData | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    if (dataView.getUint16(0) !== 0xFFD8) {
      return null;
    }
    
    let offset = 2;
    while (offset < dataView.byteLength) {
      const marker = dataView.getUint16(offset);
      
      if (marker === 0xFFE1) {
        const exifData = parseExifSegment(dataView, offset + 4);
        if (exifData) {
          return exifData;
        }
      }
      
      if ((marker & 0xFF00) !== 0xFF00) break;
      
      const length = dataView.getUint16(offset + 2);
      offset += 2 + length;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting EXIF location:', error);
    return null;
  }
}

function parseExifSegment(dataView: DataView, offset: number): LocationData | null {
  try {
    const exifHeader = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3)
    );
    
    if (exifHeader !== 'Exif') return null;
    
    const tiffOffset = offset + 6;
    const littleEndian = dataView.getUint16(tiffOffset) === 0x4949;
    
    const ifdOffset = dataView.getUint32(tiffOffset + 4, littleEndian);
    const gpsData = findGPSData(dataView, tiffOffset, tiffOffset + ifdOffset, littleEndian);
    
    return gpsData;
  } catch {
    return null;
  }
}

function findGPSData(dataView: DataView, tiffOffset: number, ifdOffset: number, littleEndian: boolean): LocationData | null {
  try {
    const numEntries = dataView.getUint16(ifdOffset, littleEndian);
    let gpsIfdOffset = 0;
    
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + (i * 12);
      const tag = dataView.getUint16(entryOffset, littleEndian);
      
      if (tag === 0x8825) {
        gpsIfdOffset = dataView.getUint32(entryOffset + 8, littleEndian);
        break;
      }
    }
    
    if (!gpsIfdOffset) return null;
    
    const gpsOffset = tiffOffset + gpsIfdOffset;
    const gpsEntries = dataView.getUint16(gpsOffset, littleEndian);
    
    let latRef = 'N', lonRef = 'E';
    let lat = 0, lon = 0;
    let hasLat = false, hasLon = false;
    
    for (let i = 0; i < gpsEntries; i++) {
      const entryOffset = gpsOffset + 2 + (i * 12);
      const tag = dataView.getUint16(entryOffset, littleEndian);
      const valueOffset = tiffOffset + dataView.getUint32(entryOffset + 8, littleEndian);
      
      switch (tag) {
        case 1: // GPSLatitudeRef
          latRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
          break;
        case 2: // GPSLatitude
          lat = readGPSCoordinate(dataView, valueOffset, littleEndian);
          hasLat = true;
          break;
        case 3: // GPSLongitudeRef
          lonRef = String.fromCharCode(dataView.getUint8(entryOffset + 8));
          break;
        case 4: // GPSLongitude
          lon = readGPSCoordinate(dataView, valueOffset, littleEndian);
          hasLon = true;
          break;
      }
    }
    
    if (!hasLat || !hasLon) return null;
    
    return {
      latitude: latRef === 'S' ? -lat : lat,
      longitude: lonRef === 'W' ? -lon : lon,
      source: 'exif',
      timestamp: Date.now()
    };
  } catch {
    return null;
  }
}

function readGPSCoordinate(dataView: DataView, offset: number, littleEndian: boolean): number {
  const degrees = dataView.getUint32(offset, littleEndian) / dataView.getUint32(offset + 4, littleEndian);
  const minutes = dataView.getUint32(offset + 8, littleEndian) / dataView.getUint32(offset + 12, littleEndian);
  const seconds = dataView.getUint32(offset + 16, littleEndian) / dataView.getUint32(offset + 20, littleEndian);
  
  return degrees + (minutes / 60) + (seconds / 3600);
}

export function getBrowserLocation(): Promise<LocationData | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: 'browser',
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        console.log('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      }
    );
  });
}

export async function getImageLocation(file: File): Promise<LocationData | null> {
  const exifLocation = await extractExifLocation(file);
  if (exifLocation) {
    return exifLocation;
  }
  
  const browserLocation = await getBrowserLocation();
  return browserLocation;
}

export function formatLocationForDisplay(location: LocationData): string {
  const lat = location.latitude.toFixed(6);
  const lon = location.longitude.toFixed(6);
  const source = location.source === 'exif' ? 'EXIF' : 'GPS';
  return `${lat}, ${lon} (${source})`;
}

export function getGoogleMapsUrl(location: LocationData): string {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}
