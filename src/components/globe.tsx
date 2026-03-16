'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

export type GlobeTheme = 'hybrid' | 'satellite';

interface GlobeProps {
  onLocationClick: (location: { name: string; lat: number; lng: number }) => void;
  theme?: GlobeTheme;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  marker?: { lat: number; lng: number };
  disableInteraction?: boolean;
}

export interface GlobeRef {
  selectRandomLocation: () => void;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/** Convert zoom level (Mapbox-style 0-22) to Google 3D range (meters from camera to target) */
function zoomToRange(zoom?: number): number {
  if (!zoom) return 30000000; // default: far out world view
  // Approximate: range ≈ 40_000_000 / 2^zoom
  return Math.round(40_000_000 / Math.pow(2, zoom));
}

/** Reverse geocode using Google Geocoding API */
async function reverseGeocode(
  lat: number,
  lng: number,
  rangeMeters: number,
): Promise<string> {
  try {
    // Use result_type to request specific granularity based on camera range
    let resultType = '';
    if (rangeMeters < 5_000) {
      resultType = '&result_type=neighborhood|sublocality|locality';
    } else if (rangeMeters < 50_000) {
      resultType = '&result_type=locality|administrative_area_level_2';
    } else if (rangeMeters < 500_000) {
      resultType = '&result_type=administrative_area_level_1|locality';
    } else if (rangeMeters < 5_000_000) {
      resultType = '&result_type=country|administrative_area_level_1';
    } else {
      resultType = '&result_type=country';
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}${resultType}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    // If filtered request returned nothing, retry without filter
    if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
      // Try natural_feature — this catches oceans, seas, mountains, etc.
      const naturalUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=natural_feature&key=${GOOGLE_MAPS_API_KEY}`;
      const naturalRes = await fetch(naturalUrl);
      const naturalData = await naturalRes.json();
      if (naturalData.status === 'OK' && naturalData.results?.length) {
        return extractCleanName(naturalData.results);
      }

      // Last resort — unfiltered
      const fallbackUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const fallbackRes = await fetch(fallbackUrl);
      const fallbackData = await fallbackRes.json();
      if (fallbackData.status === 'OK' && fallbackData.results?.length) {
        return extractCleanName(fallbackData.results);
      }

      // Nothing at all — try GeoNames ocean API
      return await getOceanName(lat, lng);
    }

    if (data.status !== 'OK') {
      console.warn('[Globe] Geocoding failed:', data.status, data.error_message);
      return await getOceanName(lat, lng);
    }

    return extractCleanName(data.results);
  } catch (err) {
    console.error('[Globe] Reverse geocode error:', err);
    return await getOceanName(lat, lng);
  }
}

/** Extract a clean, short name from geocoding results array */
function extractCleanName(results: any[]): string {
  // Scan ALL results for the best address components (not just the first one)
  for (const result of results) {
    const components = result.address_components || [];
    const locality = components.find((c: any) => c.types.includes('locality'));
    const admin2 = components.find((c: any) => c.types.includes('administrative_area_level_2'));
    const admin1 = components.find((c: any) => c.types.includes('administrative_area_level_1'));
    const country = components.find((c: any) => c.types.includes('country'));

    if (locality && country) return `${locality.long_name}, ${country.long_name}`;
    if (admin2 && country) return `${admin2.long_name}, ${country.long_name}`;
    if (admin1 && country) return `${admin1.long_name}, ${country.long_name}`;
    if (country) return country.long_name;
  }
  return results[0]?.formatted_address || 'Unknown Location';
}

/** Get ocean/sea name using GeoNames oceanJSON API, with hardcoded fallback */
async function getOceanName(lat: number, lng: number): Promise<string> {
  // Try GeoNames ocean API — dedicated endpoint for ocean/sea names
  try {
    const geonamesUser = process.env.NEXT_PUBLIC_GEONAMES_USERNAME || 'demo';
    const url = `https://secure.geonames.org/oceanJSON?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&username=${geonamesUser}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();
    if (data?.ocean?.name) {
      return data.ocean.name;
    }
  } catch {
    // Fall through to hardcoded lookup
  }

  // Hardcoded fallback — rough bounding boxes
  return getOceanNameFallback(lat, lng);
}

function getOceanNameFallback(lat: number, lng: number): string {
  // Polar regions
  if (lat > 65) return 'Arctic Ocean';
  if (lat < -60) return 'Southern Ocean';

  // Mediterranean & nearby seas
  if (lat > 30 && lat < 46 && lng > -6 && lng < 36) return 'Mediterranean Sea';
  if (lat > 40 && lat < 47 && lng > 26 && lng < 42) return 'Black Sea';
  if (lat > 36 && lat < 42 && lng > 17 && lng < 30) return 'Aegean Sea';

  // Middle East seas
  if (lat > 12 && lat < 30 && lng > 32 && lng < 44) return 'Red Sea';
  if (lat > 24 && lat < 30 && lng > 48 && lng < 56) return 'Persian Gulf';
  if (lat > 5 && lat < 25 && lng > 50 && lng < 75) return 'Arabian Sea';

  // Asian seas
  if (lat > 5 && lat < 22 && lng > 78 && lng < 95) return 'Bay of Bengal';
  if (lat > 0 && lat < 25 && lng > 100 && lng < 121) return 'South China Sea';
  if (lat > 33 && lat < 52 && lng > 127 && lng < 142) return 'Sea of Japan';
  if (lat > 23 && lat < 35 && lng > 120 && lng < 132) return 'East China Sea';

  // Americas
  if (lat > 18 && lat < 31 && lng > -98 && lng < -80) return 'Gulf of Mexico';
  if (lat > 8 && lat < 23 && lng > -88 && lng < -60) return 'Caribbean Sea';

  // Major oceans — Atlantic
  if (lng > -80 && lng < 0) {
    if (lat >= 0) return 'North Atlantic Ocean';
    return 'South Atlantic Ocean';
  }

  // Indian Ocean
  if (lng >= 20 && lng <= 120 && lat < 30) return 'Indian Ocean';

  // Pacific Ocean
  if (lat >= 0) return 'North Pacific Ocean';
  return 'South Pacific Ocean';
}

// Load the Google Maps 3D script once globally
let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

function loadGoogleMaps3D(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }

    // Check if already loaded
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=alpha&libraries=maps3d`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

const VALID_THEMES: GlobeTheme[] = ['hybrid', 'satellite'];

export const Globe = forwardRef<GlobeRef, GlobeProps>(function Globe(
  { onLocationClick, theme: rawTheme = 'hybrid', initialCenter, initialZoom, marker, disableInteraction = false },
  ref,
) {
  // Sanitize theme — old Mapbox values may still be cached in state
  const theme: GlobeTheme = VALID_THEMES.includes(rawTheme as GlobeTheme) ? (rawTheme as GlobeTheme) : 'hybrid';
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<any>(null);
  const markerElementRef = useRef<any>(null);
  const clickMarkerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onLocationClickRef = useRef(onLocationClick);
  onLocationClickRef.current = onLocationClick;

  // Compute initial camera position
  const centerLat = initialCenter ? initialCenter[1] : 20;
  const centerLng = initialCenter ? initialCenter[0] : 0;
  const range = zoomToRange(initialZoom);

  const placeMarker = useCallback(async (lat: number, lng: number, label: string) => {
    if (!mapElementRef.current) return;

    // Remove previous click marker
    if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }

    try {
      // Create a marker using gmp-marker-3d
      const markerEl = document.createElement('gmp-marker-3d') as any;
      markerEl.setAttribute('position', `${lat},${lng}`);
      markerEl.setAttribute('altitude-mode', 'clamp-to-ground');
      markerEl.setAttribute('label', label);

      mapElementRef.current.appendChild(markerEl);
      clickMarkerRef.current = markerEl;
    } catch {
      // Marker creation failed — non-critical
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key is not configured');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMaps3D();
        if (cancelled) return;

        // Wait for the custom element to be defined
        await customElements.whenDefined('gmp-map-3d');
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;

        // Clear any existing content
        container.innerHTML = '';

        // Create the 3D map element
        const mapEl = document.createElement('gmp-map-3d') as any;
        mapEl.setAttribute('mode', theme);
        mapEl.setAttribute('center', `${centerLat},${centerLng}`);
        mapEl.setAttribute('range', String(range));
        mapEl.setAttribute('tilt', marker ? '45' : '0');
        mapEl.setAttribute('heading', '0');
        mapEl.style.width = '100%';
        mapEl.style.height = '100%';

        container.appendChild(mapEl);
        mapElementRef.current = mapEl;

        setIsLoading(false);

        // Add static marker if provided (for mini-globe in research view)
        if (marker) {
          try {
            await customElements.whenDefined('gmp-marker-3d');
            const markerEl = document.createElement('gmp-marker-3d') as any;
            markerEl.setAttribute('position', `${marker.lat},${marker.lng}`);
            markerEl.setAttribute('altitude-mode', 'clamp-to-ground');
            mapEl.appendChild(markerEl);
            markerElementRef.current = markerEl;
          } catch {
            // Marker not critical
          }
        }

        // Handle clicks on the map (only if no static marker and interaction enabled)
        if (!marker && !disableInteraction) {
          mapEl.addEventListener('gmp-click', async (e: any) => {
            const position = e.position;
            if (!position) return;

            // LatLngAltitude — lat/lng are plain number properties
            const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
            const lng = typeof position.lng === 'function' ? position.lng() : position.lng;

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

            // Read range from the JS property (not HTML attribute)
            const currentRange = typeof mapEl.range === 'number' ? mapEl.range : parseFloat(mapEl.getAttribute('range') || '30000000');

            const locationName = await reverseGeocode(lat, lng, currentRange);

            placeMarker(lat, lng, locationName);

            onLocationClickRef.current({
              name: locationName,
              lat,
              lng,
            });
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to initialize Google Maps 3D');
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (clickMarkerRef.current) {
        clickMarkerRef.current.remove();
        clickMarkerRef.current = null;
      }
      if (markerElementRef.current) {
        markerElementRef.current.remove();
        markerElementRef.current = null;
      }
      if (mapElementRef.current) {
        mapElementRef.current.remove();
        mapElementRef.current = null;
      }
    };
  }, [theme, centerLat, centerLng, range, marker, disableInteraction, placeMarker]);

  // Expose selectRandomLocation to parent via ref
  useImperativeHandle(ref, () => ({
    selectRandomLocation: async () => {
      if (!mapElementRef.current) return;

      const lat = Math.random() * 140 - 70; // -70 to 70 (avoid poles)
      const lng = Math.random() * 360 - 180;

      // Fly to the location
      const mapEl = mapElementRef.current;
      mapEl.setAttribute('center', `${lat},${lng}`);
      mapEl.setAttribute('range', '5000000');
      mapEl.setAttribute('tilt', '45');

      // After a short delay, reverse geocode and trigger callback
      setTimeout(async () => {
        const locationName = await reverseGeocode(lat, lng, 5000000);
        placeMarker(lat, lng, locationName);
        onLocationClickRef.current({ name: locationName, lat, lng });
      }, 1500);
    },
  }));

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Map Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Please check your Google Maps configuration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading 3D globe...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
      {!marker && (
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-medium">Click anywhere on the globe to research its history</p>
        </div>
      )}
    </div>
  );
});
