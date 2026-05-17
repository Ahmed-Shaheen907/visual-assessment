'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { saveAnswers } from '@/lib/supabase-helpers';
import { cursorCollision } from '@/lib/utils/collision';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const INITIAL_DROP_ZONES: DropZone[] = [
  { id: 'zone-1', label: 'Sidi Heneish',       lat: 31.1630, lng: 27.6270, accepted: null },
  { id: 'zone-2', label: 'Ras Al Hekma',       lat: 31.1944, lng: 27.7881, accepted: null },
  { id: 'zone-3', label: 'El Dabaa',           lat: 31.0322, lng: 28.4444, accepted: null },
  { id: 'zone-4', label: 'Sidi Abdel Rahman',  lat: 30.9619, lng: 28.7369, accepted: null },
  { id: 'zone-5', label: 'Marina',             lat: 30.826013, lng: 28.993615, accepted: null },
  { id: 'zone-6', label: 'New Alamein',        lat: 30.8572, lng: 28.8547, accepted: null },
];

const ANSWERS = INITIAL_DROP_ZONES.map((z, i) => ({ id: `ans-${i}`, label: z.label }));
const TOTAL = INITIAL_DROP_ZONES.length;

export default function GamePage() {
  const router = useRouter();
  const [dropZones, setDropZones] = useState<DropZone[]>(INITIAL_DROP_ZONES);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('va_user_email') === 'admin@gmail.com';

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

  function handleRemove(zoneId: string) {
    if (submitted) return;
    setDropZones((prev) => prev.map((z) => z.id === zoneId ? { ...z, accepted: null } : z));
  }

  function handleLabelSelect(labelId: string) {
    if (submitted) return;
    setSelectedLabelId((prev) => prev === labelId ? null : labelId);
  }

  function handleLabelPlace(zoneId: string) {
    if (!selectedLabelId || submitted) return;
    const answer = ANSWERS.find((a) => a.id === selectedLabelId);
    if (!answer) return;
    setDropZones((prev) => prev.map((z) => z.id === zoneId ? { ...z, accepted: answer.label } : z));
    setSelectedLabelId(null);
  }

  function handleDeselectLabel() {
    setSelectedLabelId(null);
  }

  const handleSkip = useCallback(async () => {
    setSaving(true);
    const sessionId = localStorage.getItem('va_session_id');
    if (sessionId) {
      await saveAnswers(sessionId, INITIAL_DROP_ZONES.map((z) => ({
        phase: 'phase0',
        question_id: z.id,
        answer_given: null,
        correct: false,
      })));
    }
    router.push('/phase1');
  }, [router]);

  const handleContinue = useCallback(async () => {
    setSaving(true);
    const sessionId = localStorage.getItem('va_session_id');
    if (sessionId) {
      await saveAnswers(sessionId, dropZones.map((z) => ({
        phase: 'phase0',
        question_id: z.id,
        answer_given: z.accepted,
        correct: z.accepted === z.label,
      })));
    }
    router.push('/phase1');
  }, [dropZones, router]);

  return (
    <DndContext sensors={sensors} collisionDetection={cursorCollision} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
              position: 'relative',
            }}
          >
            {!mapReady && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  background: '#0d0d0d',
                  borderRadius: 'inherit',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '3px solid rgba(215,255,0,0.15)',
                    borderTopColor: 'var(--tgl-lime)',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'var(--font-montserrat)' }}>
                  Loading map…
                </span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            <Map
              center={[31.05, 28.2]}
              zoom={9}
              dropZones={dropZones}
              submitted={submitted}
              selectedLabelId={selectedLabelId}
              onRemove={handleRemove}
              onLabelPlace={handleLabelPlace}
              onDeselectLabel={handleDeselectLabel}
              onReady={() => setMapReady(true)}
            />
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
                  onClick={handleContinue}
                  disabled={saving}
                  className="w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95"
                  style={{
                    background: saving ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
                    color: saving ? 'rgba(215,255,0,0.4)' : '#000',
                    boxShadow: saving ? 'none' : 'var(--glow-lime-sm)',
                    fontFamily: 'var(--font-space)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Continue →'}
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
                      isSelected={selectedLabelId === answer.id}
                      onSelect={handleLabelSelect}
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
                {isAdmin && (
                  <button
                    onClick={handleSkip}
                    disabled={saving}
                    className="w-full py-2 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95"
                    style={{
                      fontFamily: 'var(--font-space)',
                      background: 'transparent',
                      color: 'rgba(251,146,60,0.7)',
                      border: '1px dashed rgba(251,146,60,0.35)',
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ⚡ Skip Phase →
                  </button>
                )}
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
