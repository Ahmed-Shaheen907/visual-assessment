'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useDroppable } from '@dnd-kit/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createPortal } from 'react-dom';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface DropZone {
  id: string;
  label: string;
  lat: number;
  lng: number;
  accepted: string | null;
}

const ZONE_COLORS: Record<string, string> = {
  'zone-1': '#e91e8c',
  'zone-2': '#7c3aed',
  'zone-3': '#f59e0b',
  'zone-4': '#ef4444',
  'zone-5': '#2563eb',
  'zone-6': '#10b981',
};

function DroppablePin({ zone, index }: { zone: DropZone; index: number }) {
  const map = useMap();
  const [pos, setPos] = useState(() => map.latLngToContainerPoint([zone.lat, zone.lng]));
  const { setNodeRef, isOver } = useDroppable({ id: zone.id });

  const update = useCallback(() => {
    setPos(map.latLngToContainerPoint([zone.lat, zone.lng]));
  }, [map, zone.lat, zone.lng]);

  useEffect(() => {
    map.on('move zoom viewreset resize', update);
    update();
    return () => { map.off('move zoom viewreset resize', update); };
  }, [map, update]);

  const color = ZONE_COLORS[zone.id] ?? '#6366f1';

  return createPortal(
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        pointerEvents: 'all',
      }}
    >
      {/* drop ring */}
      <div style={{
        position: 'absolute',
        inset: -18,
        borderRadius: '50%',
        border: `2px dashed ${color}`,
        opacity: isOver ? 1 : 0.45,
        transform: isOver ? 'scale(1.15)' : 'scale(1)',
        background: isOver ? `${color}28` : 'transparent',
        transition: 'opacity 0.15s, transform 0.15s, background 0.15s',
        pointerEvents: 'none',
      }} />
      {/* pin circle */}
      <div style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: zone.accepted ? '#10b981' : color,
        border: '3px solid white',
        boxShadow: `0 2px 10px ${color}99, 0 0 0 1px ${color}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
        cursor: 'default',
        position: 'relative',
      }}>
        {zone.accepted
          ? <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>
          : <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{index + 1}</span>
        }
      </div>
      {/* label badge after correct answer */}
      {zone.accepted && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 5,
          background: 'rgba(16,185,129,0.95)',
          color: 'white',
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 5px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        }}>
          {zone.accepted}
        </div>
      )}
    </div>,
    map.getContainer()
  );
}

interface MapProps {
  center: [number, number];
  zoom: number;
  dropZones: DropZone[];
}

export default function Map({ center, zoom, dropZones }: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png"
      />
      {dropZones.map((zone, i) => (
        <DroppablePin key={zone.id} zone={zone} index={i} />
      ))}
    </MapContainer>
  );
}
