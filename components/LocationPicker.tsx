
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Crosshair } from 'lucide-react';

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ initialLat, initialLng, onLocationSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  
  // Default to Izmir Coordinates
  const DEFAULT_LAT = 38.4237;
  const DEFAULT_LNG = 27.1428;

  useEffect(() => {
    if (!mapRef.current) return;

    // Harita zaten varsa tekrar başlatma
    if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
    }

    // Initialize Map
    const map = L.map(mapRef.current).setView(
      [initialLat || DEFAULT_LAT, initialLng || DEFAULT_LNG], 
      initialLat ? 15 : 12
    );

    // Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initial Marker
    if (initialLat && initialLng) {
      addMarker(initialLat, initialLng, map);
    }

    // Click Event
    map.on('click', (e) => {
      addMarker(e.latlng.lat, e.latlng.lng, map);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker if initial props change externally (unlikely in this form flow but good practice)
  useEffect(() => {
    if (mapInstanceRef.current && initialLat && initialLng) {
        addMarker(initialLat, initialLng, mapInstanceRef.current);
        mapInstanceRef.current.setView([initialLat, initialLng], 15);
    }
  }, [initialLat, initialLng]);

  const addMarker = (lat: number, lng: number, map: L.Map) => {
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Custom Icon similar to MapPin
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #2563eb; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); display: flex; align-items: center; justify-content: center; color: white;">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
             </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
        alert("Tarayıcınız konum servisini desteklemiyor.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([latitude, longitude], 16);
                addMarker(latitude, longitude, mapInstanceRef.current);
                onLocationSelect(latitude, longitude);
            }
        },
        () => {
            alert("Konum alınamadı. Lütfen izinleri kontrol edin.");
        }
    );
  };

  return (
    <div className="relative w-full h-full group">
      <div ref={mapRef} className="w-full h-full rounded-lg z-0" style={{ minHeight: '300px' }} />
      <button
        type="button"
        onClick={handleLocateMe}
        className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-md border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 z-[400]"
        title="Mevcut Konumumu Bul"
      >
        <Crosshair size={24} />
      </button>
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 shadow-sm border border-slate-200 z-[400]">
        Konum seçmek için haritaya tıklayın
      </div>
    </div>
  );
};

export default LocationPicker;
