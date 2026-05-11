'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
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

export default function GamePage() {
  const [dropZones, setDropZones] = useState<DropZone[]>(INITIAL_DROP_ZONES);
  const [score, setScore] = useState(0);

  const sensors = useSensors(useSensor(PointerSensor));
  const placedLabels = dropZones.map((z) => z.accepted).filter(Boolean) as string[];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const answer = ANSWERS.find((a) => a.id === (active.id as string));
    const zone = dropZones.find((z) => z.id === (over.id as string));
    if (!answer || !zone) return;

    const isCorrect = answer.label === zone.label;

    setDropZones((prev) =>
      prev.map((z) =>
        z.id === zone.id ? { ...z, accepted: isCorrect ? answer.label : null } : z
      )
    );

    if (isCorrect) setScore((s) => s + 1);
  }

  const total = INITIAL_DROP_ZONES.length;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-linear-to-br from-indigo-950 via-slate-900 to-indigo-900 flex flex-col">
        <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">North Coast Map Quiz</h1>
            <p className="text-xs text-indigo-300/70 mt-0.5">Drag each location name to the correct pin on the map</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium">
            Score: <span className="text-indigo-300 font-bold ml-1">{score} / {total}</span>
          </div>
        </header>

        <div className="flex flex-1 gap-6 p-6">
          <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ minHeight: 500 }}>
            <Map center={[31.15, 28.1]} zoom={9} dropZones={dropZones} />
          </div>

          <aside className="w-56 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-1">
              Drag to map
            </p>
            {ANSWERS.map((answer) => (
              <DraggableAnswer
                key={answer.id}
                id={answer.id}
                label={answer.label}
                isPlaced={placedLabels.includes(answer.label)}
              />
            ))}
          </aside>
        </div>
      </div>
    </DndContext>
  );
}
