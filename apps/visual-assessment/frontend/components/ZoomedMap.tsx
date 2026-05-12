'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useDroppable } from '@dnd-kit/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DropZone } from './Map';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LANDMARK_COLORS = [
  '#ff3cac', '#a855f7', '#f59e0b', '#ef4444',
  '#3b82f6', '#10b981', '#f97316', '#06b6d4',
  '#8b5cf6', '#ec4899',
];

function FlyController({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    const key = JSON.stringify(bounds);
    if (key !== prevKey.current) {
      prevKey.current = key;
      map.flyToBounds(bounds as L.LatLngBoundsExpression, { duration: 1.5, padding: [40, 40], maxZoom: 14 });
    }
  }, [map, bounds]);

  return null;
}

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
    return () => { map.off('move zoom viewreset resize', update); };
  }, [map, update]);

  return null;
}

function DroppablePin({
  zone,
  index,
  pos,
  submitted,
  onRemove,
}: {
  zone: DropZone;
  index: number;
  pos: { x: number; y: number } | undefined;
  submitted: boolean;
  onRemove?: (zoneId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id });
  const baseColor = LANDMARK_COLORS[index % LANDMARK_COLORS.length];

  const answered = !!zone.accepted;
  const isCorrect = submitted && zone.accepted === zone.label;
  const isWrong = submitted && answered && zone.accepted !== zone.label;
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
      <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: `radial-gradient(circle, ${pinColor}33 0%, transparent 70%)`, opacity: isOver ? 1 : answered ? 0.3 : 0.7, transition: 'opacity 0.2s', pointerEvents: 'none', animation: answered || submitted ? 'none' : 'pin-pulse-ring 2.5s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 62, height: 62, borderRadius: '50%', left: '50%', top: '50%', transform: isOver ? 'translate(-50%, -50%) scale(1.15)' : 'translate(-50%, -50%)', border: `2px solid ${pinColor}`, opacity: isOver ? 1 : answered ? 0.5 : 0.65, boxShadow: isOver ? `0 0 16px ${pinColor}88` : answered ? `0 0 10px ${pinColor}44` : 'none', transition: 'opacity 0.2s, box-shadow 0.2s, transform 0.2s', pointerEvents: 'none' }} />
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: answered ? pinColor : baseColor, border: '2.5px solid rgba(0,0,0,0.5)', boxShadow: `0 2px 12px ${pinColor}88, 0 0 0 1px ${pinColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'background 0.25s, transform 0.15s', transform: isOver ? 'scale(1.15)' : 'scale(1)', animation: answered || submitted ? 'none' : 'pin-pulse 2.5s ease-in-out infinite' }}>
        {submitted ? (
          <span style={{ color: isCorrect ? '#000' : '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-space)' }}>{isCorrect ? '✓' : '✗'}</span>
        ) : answered ? (
          <span style={{ color: '#000', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-space)' }}>●</span>
        ) : (
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-space)' }}>{index + 1}</span>
        )}
      </div>
      {answered && (
        <div
          onClick={!submitted && onRemove ? () => onRemove(zone.id) : undefined}
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: submitted ? (isCorrect ? '#D7FF00' : '#ef4444') : 'rgba(255,255,255,0.15)', color: submitted ? (isCorrect ? '#000' : '#fff') : '#fff', fontSize: 9, fontWeight: 700, padding: submitted ? '2px 8px' : '2px 6px 2px 8px', borderRadius: 4, whiteSpace: 'nowrap', boxShadow: submitted ? (isCorrect ? '0 0 10px rgba(215,255,0,0.5)' : '0 0 10px rgba(239,68,68,0.5)') : 'none', border: submitted ? 'none' : '1px solid rgba(255,255,255,0.2)', pointerEvents: submitted ? 'none' : 'all', cursor: submitted ? 'default' : 'pointer', fontFamily: 'var(--font-space, "Space Grotesk", sans-serif)', letterSpacing: '0.02em', transition: 'background 0.3s, color 0.3s', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {submitted && isWrong ? zone.label : zone.accepted}
          {!submitted && <span style={{ fontSize: 10, lineHeight: 1, opacity: 0.6, fontWeight: 900, marginTop: -1 }}>×</span>}
        </div>
      )}
    </div>
  );
}

interface ZoomedMapProps {
  bounds: [[number, number], [number, number]];
  dropZones: DropZone[];
  submitted: boolean;
  onRemove?: (zoneId: string) => void;
}

export default function ZoomedMap({ bounds, dropZones, submitted, onRemove }: ZoomedMapProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const handlePositions = useCallback((pos: Record<string, { x: number; y: number }>) => setPositions(pos), []);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[31.05, 28.2]}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FlyController bounds={bounds} />
        <MapTracker dropZones={dropZones} onPositionsUpdate={handlePositions} />
      </MapContainer>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {dropZones.map((zone, i) => (
          <DroppablePin key={zone.id} zone={zone} index={i} pos={positions[zone.id]} submitted={submitted} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
