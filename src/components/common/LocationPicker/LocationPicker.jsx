import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationPicker.module.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const clinicIcon = L.divIcon({
  className: 'clinic-marker',
  html: `
    <div style="
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
      border: 3px solid white;
      cursor: grab;
    ">
      <svg style="transform: rotate(45deg); color: white; width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
        <path d="M9 22v-4h6v4"/>
        <line x1="12" y1="6" x2="12" y2="14"/>
        <line x1="8" y1="10" x2="16" y2="10"/>
      </svg>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 15);
    }
  }, [center, zoom, map]);
  return null;
}

function DraggableMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onPositionChange(lat, lng);
      }
    },
  };
  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={clinicIcon}
    />
  );
}

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// India bounding box:
//   Nominatim viewbox: lon_min,lat_max,lon_max,lat_min
//   Photon bbox:       lon_min,lat_min,lon_max,lat_max
const INDIA_VIEWBOX = '68.0,37.5,97.5,6.0';
const INDIA_BBOX = '68.0,6.0,97.5,37.5';

function toSuggestion(item) {
  // Shared shape for both providers: { display, lat, lng, full, address }.
  return item;
}

async function nominatimSearch(query) {
  const base = 'https://nominatim.openstreetmap.org/search';
  const common = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    limit: '8',
    'accept-language': 'en-IN,en',
    q: query,
  });

  const mapItem = (item) =>
    toSuggestion({
      display: item.display_name.split(',').slice(0, 4).join(','),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      full: item.display_name,
      address: item.address || null,
    });

  try {
    const res = await fetch(`${base}?${common.toString()}&countrycodes=in`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data.map(mapItem);
  } catch { /* fall through */ }

  try {
    const res = await fetch(`${base}?${common.toString()}&viewbox=${INDIA_VIEWBOX}&bounded=0`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data.map(mapItem);
  } catch { /* fall through */ }

  return [];
}

// Photon (komoot) — free, no key. Often indexes POIs (shops, brands)
// that Nominatim's index misses.
async function photonSearch(query) {
  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
      `&lang=en&limit=8&bbox=${INDIA_BBOX}`;
    const res = await fetch(url);
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];

    return features
      .filter((f) => {
        const cc = f.properties?.countrycode;
        return !cc || cc === 'IN'; // bbox already biases; be permissive
      })
      .map((f) => {
        const p = f.properties || {};
        const [lng, lat] = f.geometry?.coordinates || [NaN, NaN];
        const displayParts = [p.name, p.street, p.city || p.county, p.state].filter(Boolean);
        const fullParts = [
          p.name, p.housenumber, p.street, p.district, p.suburb,
          p.city || p.county, p.state, p.postcode, p.country,
        ].filter(Boolean);
        return toSuggestion({
          display: displayParts.slice(0, 4).join(', '),
          lat,
          lng,
          full: fullParts.join(', '),
          address: {
            house_number: p.housenumber,
            road: p.street,
            neighbourhood: p.district,
            suburb: p.suburb,
            city: p.city || p.county || p.locality,
            state: p.state,
            postcode: p.postcode,
          },
        });
      })
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.display);
  } catch {
    return [];
  }
}

// Run both geocoders in parallel and dedupe results within ~50m of each other.
async function combinedSearch(query) {
  const [n, p] = await Promise.allSettled([nominatimSearch(query), photonSearch(query)]);
  const merged = [];
  if (n.status === 'fulfilled') merged.push(...n.value);
  if (p.status === 'fulfilled') merged.push(...p.value);

  const deduped = [];
  for (const r of merged) {
    const near = deduped.find(
      (d) => Math.abs(d.lat - r.lat) < 0.0005 && Math.abs(d.lng - r.lng) < 0.0005
    );
    if (!near) deduped.push(r);
  }
  return deduped.slice(0, 10);
}

async function nominatimReverse(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?format=json&addressdetails=1&zoom=18` +
    `&accept-language=en-IN,en&lat=${lat}&lon=${lng}`;
  const res = await fetch(url);
  return res.json();
}

// Extract lat/lng from raw coords or the most common Google Maps URL shapes.
function parseCoordsOrMapsUrl(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  // Raw coords: "28.1234, 80.5678" or "28.1234 80.5678"
  const plain = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (plain) return { lat: parseFloat(plain[1]), lng: parseFloat(plain[2]) };

  // @lat,lng,zoom  (google.com/maps/place/.../@27.123,80.456,15z)
  const at = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };

  // ?q=lat,lng / &query=lat,lng / &ll=lat,lng
  const qp = trimmed.match(/[?&](?:q|query|ll|center|viewpoint)=(-?\d+(?:\.\d+)?)[,%]\s*(-?\d+(?:\.\d+)?)/);
  if (qp) return { lat: parseFloat(qp[1]), lng: parseFloat(qp[2]) };

  // !3dLAT!4dLNG (embedded in some Google Maps place URLs)
  const d34 = trimmed.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d34) return { lat: parseFloat(d34[1]), lng: parseFloat(d34[2]) };

  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onAddressFound,
  disabled = false,
}) {
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState('');
  const searchTimeout = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        setPosition([lat, lng]);
      }
    }
  }, [latitude, longitude]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length >= 3) {
      setSearching(true);
      setSearchDone(false);
      setShowSuggestions(true);
      searchTimeout.current = setTimeout(async () => {
        const results = await combinedSearch(query);
        setSuggestions(results);
        setSearching(false);
        setSearchDone(true);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      setSearchDone(false);
    }
  };

  const applyReverseGeocodedAddress = (data) => {
    if (!data?.address || !onAddressFound) return;
    const addr = data.address;
    setSearchQuery(data.display_name.split(',').slice(0, 3).join(','));
    onAddressFound({
      address: [addr.house_number, addr.road, addr.neighbourhood, addr.suburb].filter(Boolean).join(', '),
      city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
      state: addr.state || '',
      postal_code: addr.postcode || '',
    });
  };

  const selectSuggestion = (suggestion) => {
    setPosition([suggestion.lat, suggestion.lng]);
    onLocationChange(suggestion.lat.toFixed(6), suggestion.lng.toFixed(6));
    setSearchQuery(suggestion.display);
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchDone(false);

    if (!onAddressFound) return;

    // Prefer structured address (addressdetails=1) over display_name splitting.
    if (suggestion.address) {
      const a = suggestion.address;
      onAddressFound({
        address: [a.house_number, a.road, a.neighbourhood, a.suburb].filter(Boolean).join(', '),
        city: a.city || a.town || a.village || a.municipality || a.county || '',
        state: a.state || '',
        postal_code: a.postcode || '',
      });
      return;
    }

    const parts = suggestion.full.split(',').map((p) => p.trim());
    onAddressFound({
      address: parts.slice(0, 2).join(', '),
      city: parts.find((p) => /\b(city|town|village)\b/i.test(p)) || parts[parts.length - 4] || '',
      state: parts[parts.length - 2] || '',
      postal_code: parts.find((p) => /^\d{6}$/.test(p)) || '',
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        onLocationChange(lat.toFixed(6), lng.toFixed(6));

        setReverseGeocoding(true);
        try {
          const data = await nominatimReverse(lat, lng);
          applyReverseGeocodedAddress(data);
        } catch {
          /* silent */
        } finally {
          setReverseGeocoding(false);
        }
        setDetecting(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setDetecting(false);
        alert('Could not detect your location. Please search or click on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = useCallback(
    async (lat, lng) => {
      if (disabled) return;

      setPosition([lat, lng]);
      onLocationChange(lat.toFixed(6), lng.toFixed(6));

      setReverseGeocoding(true);
      try {
        const data = await nominatimReverse(lat, lng);
        applyReverseGeocodedAddress(data);
      } catch {
        /* silent */
      } finally {
        setReverseGeocoding(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, onLocationChange, onAddressFound]
  );

  const handleMarkerDrag = useCallback((lat, lng) => handleMapClick(lat, lng), [handleMapClick]);

  const handlePasteSubmit = () => {
    setPasteError('');
    const parsed = parseCoordsOrMapsUrl(pasteInput);
    if (!parsed) {
      if (/goo\.gl|maps\.app\.goo\.gl/.test(pasteInput)) {
        setPasteError(
          'Short Google links hide the coordinates. Open the link in a browser, then copy the full URL (with "@lat,lng") or the coordinates themselves.'
        );
      } else {
        setPasteError('Paste coordinates like "28.1234, 80.5678" or a Google Maps URL that contains @lat,lng.');
      }
      return;
    }
    const { lat, lng } = parsed;
    if (
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180
    ) {
      setPasteError('Those coordinates look out of range.');
      return;
    }
    setPasteInput('');
    handleMapClick(lat, lng);
  };

  const defaultCenter = [20.5937, 78.9629];
  const center = position || defaultCenter;
  const zoom = position ? 16 : 5;

  return (
    <div className={styles.picker}>
      <div className={styles.searchRow}>
        <div className={styles.searchField}>
          <div className={styles.searchIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search for your clinic address..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            disabled={disabled}
          />
          {reverseGeocoding && <div className={styles.spinner}></div>}

          {showSuggestions && (searching || searchDone) && (
            <div className={styles.suggestions}>
              {searching && (
                <div className={styles.suggestionStatus}>Searching India…</div>
              )}
              {!searching && suggestions.length === 0 && searchDone && (
                <div className={styles.suggestionStatus}>
                  No matches on OpenStreetMap. Try a pincode or landmark, click the map,
                  or paste Google Maps coordinates below.
                </div>
              )}
              {!searching &&
                suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.suggestionItem}
                    onClick={() => selectSuggestion(s)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {s.display}
                  </button>
                ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.locateBtn}
          onClick={useCurrentLocation}
          disabled={disabled || detecting}
          title="Use my current location"
        >
          {detecting ? (
            <div className={styles.btnSpinner}></div>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          )}
          <span>Detect Location</span>
        </button>
      </div>

      <div className={styles.mapContainer}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          className={styles.map}
          ref={mapRef}
        >
          <MapController center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {!disabled && <ClickHandler onClick={handleMapClick} />}

          {position && <DraggableMarker position={position} onPositionChange={handleMarkerDrag} />}
        </MapContainer>

        {!position && (
          <div className={styles.overlay}>
            <div className={styles.overlayContent}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p>Search, click on the map, or detect your location to pin your clinic</p>
            </div>
          </div>
        )}
      </div>

      <details className={styles.paste}>
        <summary className={styles.pasteSummary}>
          Can't find it? Paste Google Maps coordinates or a link
        </summary>
        <div className={styles.pasteBody}>
          <p className={styles.pasteHint}>
            In Google Maps, right-click your clinic and click the coordinates shown at the top
            of the menu — they'll be copied to your clipboard. Paste them here. A full Google
            Maps URL containing <code>@lat,lng</code> works too.
          </p>
          <div className={styles.pasteRow}>
            <input
              type="text"
              className={styles.pasteInput}
              placeholder="e.g. 28.6139, 77.2090"
              value={pasteInput}
              onChange={(e) => { setPasteInput(e.target.value); setPasteError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePasteSubmit(); } }}
              disabled={disabled}
            />
            <button
              type="button"
              className={styles.pasteBtn}
              onClick={handlePasteSubmit}
              disabled={disabled || !pasteInput.trim()}
            >
              Drop pin
            </button>
          </div>
          {pasteError && <p className={styles.pasteError}>{pasteError}</p>}
        </div>
      </details>

      {position && (
        <div className={styles.coordsRow}>
          <div className={styles.coordItem}>
            <span className={styles.coordLabel}>Latitude</span>
            <span className={styles.coordValue}>{position[0].toFixed(6)}</span>
          </div>
          <div className={styles.coordItem}>
            <span className={styles.coordLabel}>Longitude</span>
            <span className={styles.coordValue}>{position[1].toFixed(6)}</span>
          </div>
          <a
            className={styles.coordOpen}
            href={`https://www.google.com/maps?q=${position[0]},${position[1]}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Maps
          </a>
          <div className={styles.coordHint}>Drag the marker to fine-tune</div>
        </div>
      )}
    </div>
  );
}
