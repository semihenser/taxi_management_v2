
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TaxiStand } from '../types';

interface StandMapProps {
  stands: TaxiStand[];
}

const StandMap: React.FC<StandMapProps> = ({ stands }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Center on Izmir by default
  const DEFAULT_LAT = 38.4237;
  const DEFAULT_LNG = 27.1428;

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize Map only once
    if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapInstanceRef.current = map;
    }

    // Update Markers
    const map = mapInstanceRef.current;
    
    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Add Markers for stands with location
    const validStands = stands.filter(s => s.location && s.location.lat && s.location.lng);
    const bounds = L.latLngBounds([]);

    validStands.forEach(stand => {
        if (!stand.location) return;

        const customIcon = L.divIcon({
            className: 'custom-stand-icon',
            html: `<div style="
                    background-color: ${stand.status === 'Aktif' ? '#facc15' : '#ef4444'}; 
                    width: 36px; height: 36px; 
                    border-radius: 50%; 
                    border: 3px solid white; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.2); 
                    display: flex; align-items: center; justify-content: center; 
                    color: ${stand.status === 'Aktif' ? '#854d0e' : 'white'};
                    font-size: 10px; font-weight: bold;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                   </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        });

        const marker = L.marker([stand.location.lat, stand.location.lng], { icon: customIcon })
            .bindPopup(`
                <div style="font-family: 'Inter', sans-serif;">
                    <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${stand.name}</h3>
                    <p style="margin: 0; color: #64748b; font-size: 12px;">${stand.district} / ${stand.neighborhood}</p>
                    <div style="margin-top: 8px; display: flex; gap: 8px;">
                        <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${stand.plates?.length || 0} Araç</span>
                        <span style="background: ${stand.status === 'Aktif' ? '#f0fdf4' : '#fef2f2'}; color: ${stand.status === 'Aktif' ? '#166534' : '#991b1b'}; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${stand.status}</span>
                    </div>
                </div>
            `);
        
        marker.addTo(map);
        bounds.extend([stand.location.lat, stand.location.lng]);
    });

    // Fit bounds if we have markers
    if (validStands.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [stands]);

  return (
    <div className="w-full h-full bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200 relative">
        <div ref={mapRef} className="w-full h-full z-0" />
        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-white p-3 rounded-lg shadow-lg z-[400] border border-slate-200 text-xs">
            <h4 className="font-bold mb-2 text-slate-700">Durak Durumları</h4>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div>
                <span>Aktif Durak</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 border border-red-700"></div>
                <span>Pasif Durak</span>
            </div>
        </div>
    </div>
  );
};

export default StandMap;
