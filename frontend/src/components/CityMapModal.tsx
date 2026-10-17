import React, { useEffect, useRef } from 'react';
import { Hospital } from '../types';
import L from 'leaflet';
import { X, MapPin, Building, ShieldCheck, Truck } from 'lucide-react';

interface CityMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  onSelectHospital: (h: Hospital) => void;
}

export const CityMapModal: React.FC<CityMapModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  onSelectHospital,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Center map around St. Jude Metro Hospital
    const defaultLat = hospitals[0]?.latitude || 12.9716;
    const defaultLng = hospitals[0]?.longitude || 77.5946;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 12);
      mapInstanceRef.current = map;

      // Clean OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Add Hospital Pins
      hospitals.forEach((h) => {
        const isHealthy = h.status === 'HEALTHY';
        const isAttention = h.status === 'ATTENTION';
        const color = isHealthy ? '#16A34A' : isAttention ? '#D97706' : '#DC2626';

        const customIcon = L.divIcon({
          className: 'custom-hosp-pin',
          html: `
            <div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);">
              +
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([h.latitude, h.longitude], { icon: customIcon }).addTo(map);

        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans';
        popupContent.innerHTML = `
          <div style="font-weight: bold; font-size: 14px; color: #1E293B;">${h.name}</div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">${h.hospital_type}</div>
          <div style="font-size: 12px; margin-bottom: 2px;">
            <strong>Usable ICU:</strong> ${h.icu_beds.usable} beds
          </div>
          <div style="font-size: 12px; margin-bottom: 2px;">
            <strong>Oxygen:</strong> ${Math.round(h.oxygen_liters.current)} L
          </div>
          <div style="font-size: 12px; margin-bottom: 6px;">
            <strong>Ambulances:</strong> ${h.ambulances.available} ready
          </div>
          <button id="btn-inspect-${h.id}" style="background-color: #2563EB; color: white; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: bold; cursor: pointer; width: 100%;">
            View Details & Coordinate
          </button>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-inspect-${h.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectHospital(h);
              onClose();
            };
          }
        });
      });

      // Add Emergency Logistics Corridors (Polylines between St. Jude and Hope / Riverside)
      if (hospitals.length >= 2) {
        const metroCoords: [number, number] = [hospitals[0].latitude, hospitals[0].longitude];
        const hopeCoords: [number, number] = [hospitals[1].latitude, hospitals[1].longitude];

        // Arterial corridor 1
        L.polyline([metroCoords, hopeCoords], {
          color: '#2563EB',
          weight: 4,
          opacity: 0.7,
          dashArray: '8, 8',
        })
          .addTo(map)
          .bindTooltip('Emergency Corridor A: Arterial Expressway (~14 mins)', { permanent: false });

        if (hospitals.length >= 3) {
          const riverCoords: [number, number] = [hospitals[2].latitude, hospitals[2].longitude];
          L.polyline([metroCoords, riverCoords], {
            color: '#0D9488',
            weight: 4,
            opacity: 0.7,
            dashArray: '8, 8',
          })
            .addTo(map)
            .bindTooltip('Emergency Corridor B: Riverway Arterial (~18 mins)', { permanent: false });
        }
      }

      // Add Incident Hotspot marker in Downtown Core
      const incidentIcon = L.divIcon({
        className: 'custom-incident-pin',
        html: `
          <div style="background-color: #DC2626; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 14px; border: 2px solid white; box-shadow: 0 0 15px rgba(220,38,38,0.8); animation: pulse 2s infinite;">
            !
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([12.9750, 77.5980], { icon: incidentIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-weight: bold; font-size: 13px; color: #DC2626;">Simulated Incident Epicenter</div>
          <div style="font-size: 11px; color: #475569;">Central Interchange (Mass-Casualty Incident)</div>
          <div style="font-size: 11px; color: #1E293B; margin-top: 4px;">Triage Routing to St. Jude Metro & Hope Valley.</div>
        `);
    }

    // Force size re-calculation when modal opens
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      // Don't necessarily destroy on each close unless unmounted
    };
  }, [isOpen, hospitals]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Top Bar */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">City Health Map & Emergency Corridors</h3>
            </div>
            <p className="text-xs text-slate-500">
              Interactive geospatial view of hospital capacity, incident hotspot, and green logistics corridors.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Canvas */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full"></div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-200 shadow-md text-xs space-y-2 pointer-events-auto max-w-xs">
            <span className="font-bold text-slate-800 block">Status Legend</span>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
              <span>Healthy (Surplus above 20% reserve)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>Attention Needed (High ICU / O2 burn)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-red-600"></span>
              <span>Critical Shortage (Reserve breach risk)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 pt-1 border-t border-slate-100">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-blue-600"></span>
              <span>Emergency Priority Logistics Corridor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
