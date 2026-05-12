'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
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
import { SECTIONS } from '@/lib/data/landmarks';
import { saveAnswers } from '@/lib/supabase-helpers';

const ZoomedMap = dynamic(() => import('@/components/ZoomedMap'), { ssr: false });

function buildZones(sectionIdx: number): DropZone[] {
  return SECTIONS[sectionIdx].landmarks.map((lm) => ({
    id: lm.id,
    label: lm.label,
    lat: lm.lat,
    lng: lm.lng,
    accepted: null,
  }));
}

export default function Phase1Page() {
  const router = useRouter();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [activeBoundsIndex, setActiveBoundsIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(true);
  const [dropZones, setDropZones] = useState<DropZone[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // On mount: fly to first section, then reveal content
  useEffect(() => {
    const timer = setTimeout(() => {
      setDropZones(buildZones(0));
      setTransitioning(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const section = SECTIONS[sectionIndex];
  const activeBounds = SECTIONS[activeBoundsIndex].bounds;
  const answers = SECTIONS[sectionIndex].landmarks.map((lm) => {
    const zone = dropZones.find((z) => z.id === lm.id);
    return zone ?? { id: lm.id, label: lm.label, lat: lm.lat, lng: lm.lng, accepted: null };
  });

  const placedLabels = dropZones.map((z) => z.accepted).filter(Boolean) as string[];
  const allPlaced = dropZones.length === 0 || placedLabels.length === dropZones.length;
  const correctCount = dropZones.filter((z) => z.accepted === z.label).length;
  const activeAnswer = dropZones
    .map((z, i) => ({ id: `ans-${i}`, label: z.label }))
    .find((a) => a.id === activeId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (submitted) return;
    const { active, over } = event;
    if (!over) return;
    const idx = parseInt((active.id as string).replace('ans-', ''), 10);
    const answer = dropZones[idx];
    const targetZone = dropZones.find((z) => z.id === (over.id as string));
    if (!answer || !targetZone) return;
    setDropZones((prev) =>
      prev.map((z) => z.id === targetZone.id ? { ...z, accepted: answer.label } : z)
    );
  }

  function handleRemove(zoneId: string) {
    if (submitted) return;
    setDropZones((prev) => prev.map((z) => z.id === zoneId ? { ...z, accepted: null } : z));
  }

  const handleContinue = useCallback(async () => {
    setSaving(true);
    const sessionId = localStorage.getItem('va_session_id');
    if (sessionId && dropZones.length > 0) {
      await saveAnswers(sessionId, dropZones.map((z) => ({
        phase: `phase1_${section.id}`,
        question_id: z.id,
        answer_given: z.accepted,
        correct: z.accepted === z.label,
      })));
    }
    setSaving(false);

    if (sectionIndex < SECTIONS.length - 1) {
      const nextIdx = sectionIndex + 1;
      setTransitioning(true);
      setActiveBoundsIndex(nextIdx);
      setTimeout(() => {
        setSectionIndex(nextIdx);
        setDropZones(buildZones(nextIdx));
        setSubmitted(false);
        setTransitioning(false);
      }, 1800);
    } else {
      router.push('/quiz');
    }
  }, [dropZones, sectionIndex, section.id, router]);

  const progress = (sectionIndex / SECTIONS.length) * 100;

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
                style={{ fontFamily: 'var(--font-space)', color: 'var(--tgl-white)' }}
              >
                {section.label}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)' }}>
                {submitted ? 'Section Complete' : `Section ${sectionIndex + 1} of ${SECTIONS.length} — Label the landmarks`}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
            style={{
              border: '1px solid rgba(215,255,0,0.3)',
              fontFamily: 'var(--font-space)',
              color: 'var(--tgl-lime)',
              background: 'rgba(215,255,0,0.06)',
            }}
          >
            {sectionIndex + 1} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span> {SECTIONS.length}
          </div>
        </header>

        {/* Section progress bar */}
        <div className="shrink-0 px-6 pt-3 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-montserrat)' }}>
              Overall Progress
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--tgl-lime)', fontFamily: 'var(--font-space)' }}>
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
                background: 'var(--tgl-lime)',
                boxShadow: progress > 0 ? '0 0 8px rgba(215,255,0,0.6)' : 'none',
                transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 gap-5 p-5 min-h-0">

          {/* Map */}
          <div
            className="flex-1 rounded-xl overflow-hidden relative"
            style={{
              border: '1px solid rgba(215,255,0,0.15)',
              boxShadow: '0 0 40px rgba(215,255,0,0.05), inset 0 0 0 1px rgba(215,255,0,0.05)',
              minHeight: 460,
            }}
          >
            <ZoomedMap
              bounds={activeBounds}
              dropZones={dropZones}
              submitted={submitted}
              onRemove={handleRemove}
            />

            {/* Transition overlay */}
            {transitioning && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000,
                  backdropFilter: 'blur(2px)',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    className="text-sm font-bold mb-1"
                    style={{ color: 'var(--tgl-lime)', fontFamily: 'var(--font-space)' }}
                  >
                    Flying to {SECTIONS[activeBoundsIndex].label}…
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-montserrat)' }}>
                    Zooming in
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-52 flex flex-col gap-2 shrink-0">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}
            >
              Landmarks
            </p>

            {dropZones.length === 0 ? (
              /* No landmarks configured yet */
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div style={{ fontSize: 28 }}>📍</div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-montserrat)', lineHeight: 1.6 }}>
                  Landmark content for {section.label} coming soon.
                </p>
                <button
                  onClick={handleContinue}
                  disabled={saving || transitioning}
                  className="w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95"
                  style={{
                    background: saving || transitioning ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
                    color: saving || transitioning ? 'rgba(215,255,0,0.4)' : '#000',
                    boxShadow: saving || transitioning ? 'none' : 'var(--glow-lime-sm)',
                    fontFamily: 'var(--font-space)',
                    cursor: saving || transitioning ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : sectionIndex < SECTIONS.length - 1 ? 'Next Section →' : 'To Quiz →'}
                </button>
              </div>
            ) : submitted ? (
              /* Results state */
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div
                  className="text-4xl font-black"
                  style={{
                    fontFamily: 'var(--font-space)',
                    color: correctCount === dropZones.length ? 'var(--tgl-lime)' : '#ef4444',
                    lineHeight: 1,
                  }}
                >
                  {correctCount}/{dropZones.length}
                </div>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {correctCount === dropZones.length
                    ? 'Perfect!'
                    : `${dropZones.length - correctCount} wrong`}
                </p>
                <button
                  onClick={handleContinue}
                  disabled={saving || transitioning}
                  className="w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95"
                  style={{
                    background: saving || transitioning ? 'rgba(215,255,0,0.08)' : 'var(--tgl-lime)',
                    color: saving || transitioning ? 'rgba(215,255,0,0.4)' : '#000',
                    boxShadow: saving || transitioning ? 'none' : 'var(--glow-lime-sm)',
                    fontFamily: 'var(--font-space)',
                    cursor: saving || transitioning ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : sectionIndex < SECTIONS.length - 1 ? 'Next Section →' : 'To Quiz →'}
                </button>
              </div>
            ) : (
              <>
                {/* Answer cards */}
                <div className="flex flex-col gap-2 flex-1">
                  {dropZones.map((zone, i) => (
                    <DraggableAnswer
                      key={`ans-${i}`}
                      id={`ans-${i}`}
                      label={zone.label}
                      isPlaced={placedLabels.includes(zone.label)}
                    />
                  ))}
                </div>

                {/* Submit button */}
                <button
                  disabled={!allPlaced}
                  onClick={() => allPlaced && setSubmitted(true)}
                  className="mt-3 w-full py-3 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95"
                  style={{
                    fontFamily: 'var(--font-space)',
                    background: allPlaced ? 'var(--tgl-lime)' : 'rgba(215,255,0,0.06)',
                    color: allPlaced ? '#000' : 'rgba(215,255,0,0.3)',
                    border: allPlaced ? 'none' : '1px solid rgba(215,255,0,0.15)',
                    boxShadow: allPlaced ? 'var(--glow-lime)' : 'none',
                    cursor: allPlaced ? 'pointer' : 'not-allowed',
                  }}
                >
                  {allPlaced ? '✓ Submit' : `${placedLabels.length}/${dropZones.length} Placed`}
                </button>
              </>
            )}
          </aside>
        </div>
      </div>

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
