'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import DraggableAnswer from '@/components/DraggableAnswer';
import type { DropZone } from '@/components/Map';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const INITIAL_DROP_ZONES: DropZone[] = [
  { id: 'zone-1', label: 'Marsa Matrouh',      lat: 31.3543, lng: 27.2373, accepted: null },
  { id: 'zone-2', label: 'Sidi Heneish',        lat: 31.2430, lng: 27.9350, accepted: null },
  { id: 'zone-3', label: 'Ras Al Hekma',        lat: 31.1150, lng: 28.6330, accepted: null },
  { id: 'zone-4', label: 'El Dabaa',            lat: 30.9600, lng: 28.4240, accepted: null },
  { id: 'zone-5', label: 'Sidi Abdel Rahman',   lat: 30.8770, lng: 28.7240, accepted: null },
  { id: 'zone-6', label: 'New Alamein',         lat: 30.8430, lng: 29.0120, accepted: null },
];

const ANSWERS = INITIAL_DROP_ZONES.map((z, i) => ({ id: `ans-${i}`, label: z.label }));
const TOTAL = INITIAL_DROP_ZONES.length;

export default function GamePage() {
  const [dropZones, setDropZones] = useState<DropZone[]>(INITIAL_DROP_ZONES);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const placedLabels = dropZones.map((z) => z.accepted).filter(Boolean) as string[];
  const placedCount = placedLabels.length;
  const correctCount = dropZones.filter((z) => z.accepted === z.label).length;
  const allPlaced = placedCount === TOTAL;
  const activeAnswer = ANSWERS.find((a) => a.id === activeId);

  const displayScore = submitted ? correctCount : placedCount;
  const progress = (displayScore / TOTAL) * 100;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (submitted) return;
    const { active, over } = event;
    if (!over) return;

    const answer = ANSWERS.find((a) => a.id === (active.id as string));
    const targetZone = dropZones.find((z) => z.id === (over.id as string));
    if (!answer || !targetZone) return;

    // Accept any label on any pin — old occupant is implicitly freed since
    // placedLabels derives from dropZones and the old label leaves the accepted set
    setDropZones((prev) =>
      prev.map((z) => z.id === targetZone.id ? { ...z, accepted: answer.label } : z)
    );
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleReset() {
    setDropZones(INITIAL_DROP_ZONES);
    setSubmitted(false);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--tgl-black)' }}>

        {/* Header */}
        <header
          className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid rgba(215,255,0,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <Image src="/tgl-logo.png" alt="TGL" width={36} height={36} className="object-contain" />
            <div>
              <h1
                className="text-lg font-bold tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-space, "Space Grotesk", sans-serif)', color: 'var(--tgl-white)' }}
              >
                North Coast Assessment
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
                {submitted ? 'Results' : 'Drag each location to its correct pin'}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
            style={{
              border: `1px solid ${submitted ? (correctCount === TOTAL ? 'rgba(215,255,0,0.3)' : 'rgba(239,68,68,0.3)') : 'rgba(215,255,0,0.3)'}`,
              fontFamily: 'var(--font-space, "Space Grotesk", sans-serif)',
              color: submitted ? (correctCount === TOTAL ? 'var(--tgl-lime)' : '#ef4444') : 'var(--tgl-lime)',
              background: submitted ? (correctCount === TOTAL ? 'rgba(215,255,0,0.06)' : 'rgba(239,68,68,0.06)') : 'rgba(215,255,0,0.06)',
            }}
          >
            {displayScore} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span> {TOTAL}
          </div>
        </header>

        {/* Progress bar */}
        <div className="shrink-0 px-6 pt-3 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-montserrat)' }}>
              {submitted ? 'Score' : 'Progress'}
            </span>
            <span
              className="text-xs font-bold"
              style={{
                color: submitted ? (correctCount === TOTAL ? 'var(--tgl-lime)' : '#ef4444') : 'var(--tgl-lime)',
                fontFamily: 'var(--font-space)',
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(215,255,0,0.1)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: submitted
                  ? correctCount === TOTAL ? 'var(--tgl-lime)' : '#ef4444'
                  : 'var(--tgl-lime)',
                boxShadow: progress > 0
                  ? submitted
                    ? correctCount === TOTAL ? '0 0 8px rgba(215,255,0,0.6)' : '0 0 8px rgba(239,68,68,0.6)'
                    : '0 0 8px rgba(215,255,0,0.6)'
                  : 'none',
                transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s',
              }}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 gap-5 p-5 min-h-0">

          {/* Map */}
          <div
            className="flex-1 rounded-xl overflow-hidden"
            style={{
              border: '1px solid rgba(215,255,0,0.15)',
              boxShadow: '0 0 40px rgba(215,255,0,0.05), inset 0 0 0 1px rgba(215,255,0,0.05)',
              minHeight: 460,
            }}
          >
            <Map center={[31.05, 28.2]} zoom={9} dropZones={dropZones} submitted={submitted} />
          </div>

          {/* Sidebar */}
          <aside className="w-52 flex flex-col gap-2 shrink-0">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}
            >
              Locations
            </p>

            {submitted ? (
              /* Results state */
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div
                  className="text-4xl font-black"
                  style={{
                    fontFamily: 'var(--font-space)',
                    color: correctCount === TOTAL ? 'var(--tgl-lime)' : '#ef4444',
                    lineHeight: 1,
                  }}
                >
                  {correctCount}/{TOTAL}
                </div>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {correctCount === TOTAL ? 'Perfect score!' : `${TOTAL - correctCount} wrong — try again`}
                </p>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95"
                  style={{
                    background: 'var(--tgl-lime)',
                    color: '#000',
                    boxShadow: 'var(--glow-lime-sm)',
                    fontFamily: 'var(--font-space)',
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {/* Answer cards */}
                <div className="flex flex-col gap-2 flex-1">
                  {ANSWERS.map((answer) => (
                    <DraggableAnswer
                      key={answer.id}
                      id={answer.id}
                      label={answer.label}
                      isPlaced={placedLabels.includes(answer.label)}
                    />
                  ))}
                </div>

                {/* Submit button — enabled when all 6 pins have a label placed */}
                <button
                  disabled={!allPlaced}
                  onClick={() => allPlaced && handleSubmit()}
                  className="mt-3 w-full py-3 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95"
                  style={{
                    fontFamily: 'var(--font-space)',
                    background: allPlaced ? 'var(--tgl-lime)' : 'rgba(215,255,0,0.06)',
                    color: allPlaced ? '#000' : 'rgba(215,255,0,0.3)',
                    border: allPlaced ? 'none' : '1px solid rgba(215,255,0,0.15)',
                    boxShadow: allPlaced ? 'var(--glow-lime)' : 'none',
                    cursor: allPlaced ? 'pointer' : 'not-allowed',
                  }}
                  data-testid="done-button"
                >
                  {allPlaced ? '✓ Submit' : `${placedCount}/${TOTAL} Placed`}
                </button>
              </>
            )}
          </aside>
        </div>
      </div>

      {/* DragOverlay — renders above everything including Leaflet */}
      <DragOverlay dropAnimation={null}>
        {activeAnswer ? (
          <DraggableAnswer
            id={activeAnswer.id}
            label={activeAnswer.label}
            isPlaced={false}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
