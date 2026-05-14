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

export type QuizPhase = 'idle' | 'zooming' | 'transitioning' | 'active';

// ─── FlyController ────────────────────────────────────────────────────────────

function FlyController({
  bounds,
  target,
}: {
  bounds: L.LatLngBoundsExpression;
  target?: { lat: number; lng: number; zoom: number };
}) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    const key = target
      ? `pt:${target.lat},${target.lng},${target.zoom}`
      : JSON.stringify(bounds);
    if (key === prevKey.current) return;
    prevKey.current = key;
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.8, easeLinearity: 0.25 });
    } else {
      map.flyToBounds(bounds, { duration: 1.5, padding: [40, 40], maxZoom: 14 });
    }
  }, [map, bounds, target]);

  return null;
}

// ─── MapLocker ────────────────────────────────────────────────────────────────

function MapLocker({ locked }: { locked: boolean }) {
  const map = useMap();
  useEffect(() => {
    const handlers = [
      map.dragging,
      map.scrollWheelZoom,
      map.doubleClickZoom,
      map.touchZoom,
      map.keyboard,
    ] as Array<{ enable(): void; disable(): void }>;
    if (locked) {
      handlers.forEach((h) => h.disable());
    } else {
      handlers.forEach((h) => h.enable());
    }
  }, [map, locked]);
  return null;
}

// ─── MapTracker ───────────────────────────────────────────────────────────────

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

// ─── DroppablePin ─────────────────────────────────────────────────────────────

function DroppablePin({
  zone,
  index,
  pos,
  submitted,
  hasQuiz,
  hiddenPinId,
  completedQuizPinIds,
  blinkingPinId,
  onRemove,
  onPinClick,
}: {
  zone: DropZone;
  index: number;
  pos: { x: number; y: number } | undefined;
  submitted: boolean;
  hasQuiz: boolean;
  hiddenPinId?: string | null;
  completedQuizPinIds: Set<string>;
  blinkingPinId?: string | null;
  onRemove?: (zoneId: string) => void;
  onPinClick?: (zoneId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id });
  const baseColor = LANDMARK_COLORS[index % LANDMARK_COLORS.length];

  const answered = !!zone.accepted;
  const isCorrect = submitted && zone.accepted === zone.label;
  const isWrong = submitted && answered && zone.accepted !== zone.label;
  const pinColor = isCorrect ? '#D7FF00' : isWrong ? '#ef4444' : baseColor;
  const quizDone = completedQuizPinIds.has(zone.id);
  const canClick = hasQuiz && !submitted && !quizDone;
  const isBlinking = blinkingPinId === zone.id && canClick;

  if (!pos || zone.id === hiddenPinId) return null;

  return (
    <div
      ref={setNodeRef}
      onClick={canClick ? () => onPinClick?.(zone.id) : undefined}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        pointerEvents: 'all',
        cursor: canClick ? 'pointer' : 'default',
      }}
    >
      {/* Outer glow ring */}
      <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', background: `radial-gradient(circle, ${pinColor}33 0%, transparent 70%)`, opacity: isOver ? 1 : answered ? 0.3 : 0.7, transition: 'opacity 0.2s', pointerEvents: 'none', animation: answered || submitted ? 'none' : 'pin-pulse-ring 2.5s ease-in-out infinite' }} />
      {/* Border ring */}
      <div style={{ position: 'absolute', width: 62, height: 62, borderRadius: '50%', left: '50%', top: '50%', transform: isOver ? 'translate(-50%, -50%) scale(1.15)' : 'translate(-50%, -50%)', border: `2px solid ${pinColor}`, opacity: isOver ? 1 : answered ? 0.5 : 0.65, boxShadow: isOver ? `0 0 16px ${pinColor}88` : answered ? `0 0 10px ${pinColor}44` : 'none', transition: 'opacity 0.2s, box-shadow 0.2s, transform 0.2s', pointerEvents: 'none' }} />
      {/* Center circle */}
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
          <span style={{ color: isCorrect ? '#000' : '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-space)' }}>{isCorrect ? '✓' : '✗'}</span>
        ) : answered ? (
          <span style={{ color: '#000', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-space)' }}>●</span>
        ) : (
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-space)' }}>{index + 1}</span>
        )}
      </div>

      {/* Quiz indicator badge — own pointerEvents so the full badge area is clickable even outside parent bounds */}
      {canClick && (
        <div
          onClick={(e) => { e.stopPropagation(); onPinClick?.(zone.id); }}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--tgl-lime)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 900,
            color: '#000',
            boxShadow: '0 0 10px rgba(215,255,0,0.8), 0 0 20px rgba(215,255,0,0.3)',
            pointerEvents: 'all',
            cursor: 'pointer',
            fontFamily: 'var(--font-space)',
            animation: isBlinking ? 'star-blink 0.8s ease-in-out infinite' : 'none',
          }}
        >
          ✦
        </div>
      )}

      {answered && (
        <div
          onClick={!submitted && onRemove ? (e) => { e.stopPropagation(); onRemove(zone.id); } : undefined}
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: submitted ? (isCorrect ? '#D7FF00' : '#ef4444') : 'rgba(8, 10, 20, 0.88)', color: submitted ? (isCorrect ? '#000' : '#fff') : '#fff', fontSize: 9, fontWeight: 700, padding: submitted ? '2px 8px' : '2px 6px 2px 8px', borderRadius: 4, whiteSpace: 'nowrap', boxShadow: submitted ? (isCorrect ? '0 0 10px rgba(215,255,0,0.5)' : '0 0 10px rgba(239,68,68,0.5)') : '0 2px 10px rgba(0,0,0,0.5)', border: submitted ? 'none' : '1px solid rgba(215,255,0,0.3)', pointerEvents: submitted ? 'none' : 'all', cursor: submitted ? 'default' : 'pointer', fontFamily: 'var(--font-space, "Space Grotesk", sans-serif)', letterSpacing: '0.02em', transition: 'background 0.3s, color 0.3s', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {submitted && isWrong ? zone.label : zone.accepted}
          {!submitted && <span style={{ fontSize: 10, lineHeight: 1, opacity: 0.6, fontWeight: 900, marginTop: -1 }}>×</span>}
        </div>
      )}
    </div>
  );
}

// ─── ZoomedMap ────────────────────────────────────────────────────────────────

interface ZoomedMapProps {
  bounds: [[number, number], [number, number]];
  dropZones: DropZone[];
  submitted: boolean;
  onRemove?: (zoneId: string) => void;
  onPinClick?: (zoneId: string) => void;
  quizPinIds?: Set<string>;
  quizPhase: QuizPhase;
  activePinTarget?: { lat: number; lng: number; zoom: number };
  hiddenPinId?: string | null;
  completedQuizPinIds?: Set<string>;
  blinkingPinId?: string | null;
}

export default function ZoomedMap({
  bounds,
  dropZones,
  submitted,
  onRemove,
  onPinClick,
  quizPinIds,
  quizPhase,
  activePinTarget,
  hiddenPinId,
  completedQuizPinIds = new Set(),
  blinkingPinId,
}: ZoomedMapProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const handlePositions = useCallback((pos: Record<string, { x: number; y: number }>) => setPositions(pos), []);

  const mapFaded = quizPhase === 'transitioning' || quizPhase === 'active';

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Leaflet map layer — fades out when quiz activates */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: mapFaded ? 0 : 1,
          transition: 'opacity 0.8s ease',
          pointerEvents: mapFaded ? 'none' : 'auto',
        }}
      >
        <MapContainer
          center={[31.05, 28.2]}
          zoom={9}
          minZoom={4}
          maxZoom={17}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            maxZoom={19}
            maxNativeZoom={19}
          />
          <FlyController
            bounds={bounds as L.LatLngBoundsExpression}
            target={quizPhase === 'zooming' ? activePinTarget : undefined}
          />
          <MapLocker locked={quizPhase !== 'idle'} />
          <MapTracker dropZones={dropZones} onPositionsUpdate={handlePositions} />
        </MapContainer>

        {/* Pin overlay — sits above the Leaflet canvas */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {dropZones.map((zone, i) => (
            <DroppablePin
              key={zone.id}
              zone={zone}
              index={i}
              pos={positions[zone.id]}
              submitted={submitted}
              hasQuiz={quizPinIds?.has(zone.id) ?? false}
              hiddenPinId={hiddenPinId}
              completedQuizPinIds={completedQuizPinIds}
              blinkingPinId={blinkingPinId}
              onRemove={onRemove}
              onPinClick={onPinClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
