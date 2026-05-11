'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableAnswerProps {
  id: string;
  label: string;
  isPlaced: boolean;
}

export default function DraggableAnswer({ id, label, isPlaced }: DraggableAnswerProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  if (isPlaced) {
    return (
      <div className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700 line-through opacity-50 select-none">
        {label}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-slate-700 shadow-md border border-slate-200 select-none hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5 transition-[transform,box-shadow] duration-150 active:scale-95"
    >
      {label}
    </div>
  );
}
