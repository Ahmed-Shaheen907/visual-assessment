'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useDroppable } from '@dnd-kit/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  'zone-1': '#ff3cac',
  'zone-2': '#a855f7',
  'zone-3': '#f59e0b',
  'zone-4': '#ef4444',
  'zone-5': '#3b82f6',
  'zone-6': '#10b981',
};

// Lives inside MapContainer — tracks pixel coords and reports them up
function MapTracker({
  dropZones,
  onPositionsUpdate,
}: {
  dropZones: DropZone[];
  onPositionsUpdate: (positions: Record<string, { x: number; y: number }>) => void;
}) {
  const map = useMap();

  const update = useCallback(() => {
    const next: Record<string, { x: number; y: number }> = {};
    dropZones.forEach((zone) => {
      const pt = map.latLngToContainerPoint([zone.lat, zone.lng]);
      next[zone.id] = { x: pt.x, y: pt.y };
    });
    onPositionsUpdate(next);
  }, [map, dropZones, onPositionsUpdate]);

  useEffect(() => {
    map.on('move zoom viewreset resize', update);
    update();
    return () => {
      map.off('move zoom viewreset resize', update);
    };
  }, [map, update]);

  return null;
}

// Renders outside MapContainer to avoid Leaflet's overflow:hidden clipping
function DroppablePin({
  zone,
  index,
  pos,
  submitted,
}: {
  zone: DropZone;
  index: number;
  pos: { x: number; y: number } | undefined;
  submitted: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id });
  const baseColor = ZONE_COLORS[zone.id] ?? '#D7FF00';

  const answered = !!zone.accepted;
  const isCorrect = submitted && zone.accepted === zone.label;
  const isWrong = submitted && answered && zone.accepted !== zone.label;

  // After submit: green for correct, red for wrong; before submit: zone color
  const pinColor = isCorrect ? '#D7FF00' : isWrong ? '#ef4444' : baseColor;

  if (!pos) return null;

  return (
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
      {/* Outer glow halo */}
      <div
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: '50%',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${pinColor}33 0%, transparent 70%)`,
          opacity: isOver ? 1 : answered ? 0.3 : 0.7,
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
          animation: answered || submitted ? 'none' : 'pin-pulse-ring 2.5s ease-in-out infinite',
        }}
      />

      {/* Colored ring */}
      <div
        style={{
          position: 'absolute',
          width: 62,
          height: 62,
          borderRadius: '50%',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          border: `2px solid ${pinColor}`,
          opacity: isOver ? 1 : answered ? 0.5 : 0.65,
          boxShadow: isOver ? `0 0 16px ${pinColor}88` : answered ? `0 0 10px ${pinColor}44` : 'none',
          transition: 'opacity 0.2s, box-shadow 0.2s, transform 0.2s',
          ...(isOver ? { transform: 'translate(-50%, -50%) scale(1.15)' } : {}),
          pointerEvents: 'none',
        }}
      />

      {/* Pin circle */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: answered ? pinColor : baseColor,
          border: '2.5px solid rgba(0,0,0,0.5)',
          boxShadow: `0 2px 12px ${pinColor}88, 0 0 0 1px ${pinColor}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background 0.25s, transform 0.15s',
          transform: isOver ? 'scale(1.15)' : 'scale(1)',
          animation: answered || submitted ? 'none' : 'pin-pulse 2.5s ease-in-out infinite',
        }}
      >
        {submitted ? (
          <span style={{ color: isCorrect ? '#000' : '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-space)' }}>
            {isCorrect ? '✓' : '✗'}
          </span>
        ) : answered ? (
          <span style={{ color: '#000', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-space)' }}>●</span>
        ) : (
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-space)' }}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Answer badge — shown when a label is placed (before submit: neutral, after: colored) */}
      {answered && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: submitted ? (isCorrect ? '#D7FF00' : '#ef4444') : 'rgba(255,255,255,0.15)',
            color: submitted ? (isCorrect ? '#000' : '#fff') : '#fff',
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            boxShadow: submitted
              ? isCorrect ? '0 0 10px rgba(215,255,0,0.5)' : '0 0 10px rgba(239,68,68,0.5)'
              : 'none',
            border: submitted ? 'none' : '1px solid rgba(255,255,255,0.2)',
            pointerEvents: 'none',
            fontFamily: 'var(--font-space, "Space Grotesk", sans-serif)',
            letterSpacing: '0.02em',
            transition: 'background 0.3s, color 0.3s',
          }}
        >
          {submitted && isWrong ? zone.label : zone.accepted}
        </div>
      )}
    </div>
  );
}

interface MapProps {
  center: [number, number];
  zoom: number;
  dropZones: DropZone[];
  submitted: boolean;
}

export default function Map({ center, zoom, dropZones, submitted }: MapProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const handlePositions = useCallback((pos: Record<string, { x: number; y: number }>) => {
    setPositions(pos);
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        {/* Dark base map — no labels at any zoom level */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapTracker
          dropZones={dropZones}
          onPositionsUpdate={handlePositions}
        />
      </MapContainer>

      {/* Pin overlay — outside MapContainer so Leaflet's overflow:hidden doesn't clip pins */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {dropZones.map((zone, i) => (
          <DroppablePin key={zone.id} zone={zone} index={i} pos={positions[zone.id]} submitted={submitted} />
        ))}
      </div>
    </div>
  );
}
