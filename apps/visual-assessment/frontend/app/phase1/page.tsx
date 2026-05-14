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
import { cursorCollision } from '@/lib/utils/collision';
import DraggableAnswer from '@/components/DraggableAnswer';
import PinQuizPanel from '@/components/PinQuizPanel';
import type { DropZone } from '@/components/Map';
import type { QuizPhase } from '@/components/ZoomedMap';
import { SECTIONS } from '@/lib/data/landmarks';
import { PIN_QUIZZES } from '@/lib/data/pin-quizzes';
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

  // Click-to-place state
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  // Quiz mode state machine
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle');
  const [activePinQuizId, setActivePinQuizId] = useState<string | null>(null);
  const [activePinTarget, setActivePinTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [completedQuizPinIds, setCompletedQuizPinIds] = useState<Set<string>>(new Set());
  const [starBlinking, setStarBlinking] = useState(false);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDropZones(buildZones(0));
      setTransitioning(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const quizPinIds = new Set(PIN_QUIZZES.map((q) => q.landmarkId));
  const activePinQuiz = PIN_QUIZZES.find((q) => q.landmarkId === activePinQuizId) ?? null;

  const section = SECTIONS[sectionIndex];
  const activeBounds = SECTIONS[activeBoundsIndex].bounds;
  const answers = SECTIONS[sectionIndex].landmarks.map((lm) => {
    const zone = dropZones.find((z) => z.id === lm.id);
    return zone ?? { id: lm.id, label: lm.label, lat: lm.lat, lng: lm.lng, accepted: null };
  });

  const placedLabels = dropZones.map((z) => z.accepted).filter(Boolean) as string[];
  const allPlaced = dropZones.length === 0 || placedLabels.length === dropZones.length;
  const sectionQuizPinIds = section.landmarks
    .filter((lm) => quizPinIds.has(lm.id))
    .map((lm) => lm.id);
  const allSectionQuizDone =
    sectionQuizPinIds.length === 0 ||
    sectionQuizPinIds.every((id) => completedQuizPinIds.has(id));
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

  function handleLabelSelect(labelId: string) {
    if (submitted || transitioning || quizPhase !== 'idle') return;
    setSelectedLabelId((prev) => prev === labelId ? null : labelId);
  }

  function handleLabelPlace(zoneId: string) {
    if (!selectedLabelId || submitted) return;
    const idx = parseInt(selectedLabelId.replace('ans-', ''), 10);
    const labelText = dropZones[idx]?.label;
    if (!labelText) return;
    setDropZones((prev) => prev.map((z) => z.id === zoneId ? { ...z, accepted: labelText } : z));
    setSelectedLabelId(null);
  }

  function handleDeselectLabel() {
    setSelectedLabelId(null);
  }

  function handlePinClick(zoneId: string) {
    if (submitted || transitioning || quizPhase !== 'idle') return;
    const quiz = PIN_QUIZZES.find((q) => q.landmarkId === zoneId);
    if (!quiz) return;

    setStarBlinking(false);
    setShowQuizPrompt(false);
    setSelectedLabelId(null);
    setActivePinQuizId(zoneId);       // pin disappears immediately (hiddenPinId)
    setActivePinTarget(quiz.focusPoint);
    setQuizPhase('zooming');

    // t=2000ms: layout starts shifting, map starts fading
    setTimeout(() => {
      setQuizPhase('transitioning');
      // t=2800ms: PNG fades in, quiz panel appears
      setTimeout(() => {
        setQuizPhase('active');
      }, 800);
    }, 2000);
  }

  const handleQuizSubmit = useCallback(async (ans: Record<string, string>) => {
    setQuizSubmitting(true);
    const sessionId = localStorage.getItem('va_session_id');
    if (sessionId && activePinQuiz) {
      await saveAnswers(sessionId, activePinQuiz.questions.map((q) => {
        const given = ans[q.id] ?? null;
        let correct = false;
        if (q.type === 'mcq' || q.type === 'truefalse') {
          correct = given !== null && given.toLowerCase() === String(q.answer).toLowerCase();
        } else if (q.type === 'multiselect') {
          const givenArr: string[] = given ? JSON.parse(given) : [];
          const correctArr = Array.isArray(q.answer) ? (q.answer as string[]) : [];
          correct = givenArr.length === correctArr.length && givenArr.every((a) => correctArr.includes(a));
        }
        return { phase: `phase1_pin_${activePinQuizId}`, question_id: q.id, answer_given: given, correct };
      }));
    }
    setQuizSubmitting(false);
    setCompletedQuizPinIds((prev) => new Set([...prev, activePinQuizId!]));
    setStarBlinking(false);
    setShowQuizPrompt(false);
    // Reset everything — layout transitions back via CSS
    setQuizPhase('idle');
    setActivePinQuizId(null);
    setActivePinTarget(null);
  }, [activePinQuiz, activePinQuizId]);

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
        setStarBlinking(false);
        setShowQuizPrompt(false);
        setSelectedLabelId(null);
      }, 1800);
    } else {
      router.push('/quiz');
    }
  }, [dropZones, sectionIndex, section.id, router]);

  const progress = (sectionIndex / SECTIONS.length) * 100;

  // Drive layout widths from quiz phase
  const quizActive = quizPhase === 'transitioning' || quizPhase === 'active';
  const MAP_NORMAL_WIDTH = 'calc(100% - 228px)'; // fill - (208px sidebar + 20px gap)
  const MAP_QUIZ_WIDTH = '40%';
  const SIDEBAR_NORMAL_WIDTH = '208px';
  const SIDEBAR_QUIZ_WIDTH = '60%';

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

        {/* Progress bar */}
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
        <div
          className="flex flex-1 min-h-0"
          style={{ padding: 20, gap: 20 }}
        >

          {/* Map container — animates width */}
          <div
            style={{
              width: quizActive ? MAP_QUIZ_WIDTH : MAP_NORMAL_WIDTH,
              flexShrink: 0,
              transition: 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              position: 'relative',
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
              onPinClick={handlePinClick}
              quizPinIds={quizPinIds}
              quizPhase={quizPhase}
              activePinTarget={activePinTarget ?? undefined}
              hiddenPinId={activePinQuizId}
              completedQuizPinIds={completedQuizPinIds}
              blinkingPinId={starBlinking ? (sectionQuizPinIds.find((id) => !completedQuizPinIds.has(id)) ?? null) : null}
              selectedLabelId={selectedLabelId}
              onLabelPlace={handleLabelPlace}
              onDeselectLabel={handleDeselectLabel}
            />

            {/* Masterplan PNG — mounts during 'transitioning' so opacity transition fires correctly */}
            {activePinQuiz && (quizPhase === 'transitioning' || quizPhase === 'active') && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#000',
                  zIndex: 1500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: quizPhase === 'active' ? 1 : 0,
                  transition: 'opacity 0.8s ease',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePinQuiz.masterPlanImage}
                  alt="Compound masterplan"
                  style={{
                    maxWidth: '90%',
                    maxHeight: '90%',
                    objectFit: 'contain',
                    animation: quizPhase === 'active'
                      ? 'masterplan-entrance 1s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                      : 'none',
                  }}
                />
              </div>
            )}

            {/* Section transition overlay */}
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

          {/* Sidebar — animates width */}
          <aside
            style={{
              width: quizActive ? SIDEBAR_QUIZ_WIDTH : SIDEBAR_NORMAL_WIDTH,
              flexShrink: 0,
              transition: 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {quizPhase === 'active' && activePinQuiz ? (
              /* Active quiz */
              <PinQuizPanel
                quiz={activePinQuiz}
                onSubmit={handleQuizSubmit}
                submitting={quizSubmitting}
              />
            ) : quizPhase === 'zooming' || quizPhase === 'transitioning' ? (
              /* Entering compound placeholder */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '2px solid rgba(215,255,0,0.3)',
                    borderTopColor: 'var(--tgl-lime)',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p style={{ fontSize: 12, color: 'rgba(215,255,0,0.5)', fontFamily: 'var(--font-space)', textAlign: 'center', lineHeight: 1.6 }}>
                  Entering project…
                </p>
              </div>
            ) : dropZones.length === 0 ? (
              /* No landmarks */
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
              /* Results */
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
                  {correctCount === dropZones.length ? 'Perfect!' : `${dropZones.length - correctCount} wrong`}
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
              /* Drag labels + submit */
              <>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1 shrink-0"
                  style={{ color: 'rgba(215,255,0,0.6)', fontFamily: 'var(--font-space)' }}
                >
                  Landmarks
                </p>
                <div className="flex flex-col gap-2 flex-1">
                  {dropZones.map((zone, i) => (
                    <DraggableAnswer
                      key={`ans-${i}`}
                      id={`ans-${i}`}
                      label={zone.label}
                      isPlaced={placedLabels.includes(zone.label)}
                      isSelected={selectedLabelId === `ans-${i}`}
                      onSelect={handleLabelSelect}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (!allPlaced) return;
                    if (!allSectionQuizDone) {
                      setStarBlinking(true);
                      setShowQuizPrompt(true);
                      return;
                    }
                    setSubmitted(true);
                  }}
                  className="mt-3 w-full py-3 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 shrink-0"
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
                {showQuizPrompt && !allSectionQuizDone && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(215,255,0,0.06)',
                      border: '1px solid rgba(215,255,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ color: 'var(--tgl-lime)', fontSize: 14, flexShrink: 0, animation: 'star-blink 0.8s ease-in-out infinite' }}>✦</span>
                    <p style={{ color: 'rgba(215,255,0,0.7)', fontSize: 11, fontFamily: 'var(--font-space)', margin: 0, lineHeight: 1.5 }}>
                      Click the ✦ star on the map to complete the project quiz first
                    </p>
                  </div>
                )}
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
