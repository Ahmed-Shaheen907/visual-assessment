'use client';

import { useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableAnswerProps {
  id: string;
  label: string;
  isPlaced: boolean;
  isDragOverlay?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export default function DraggableAnswer({ id, label, isPlaced, isDragOverlay, isSelected, onSelect }: DraggableAnswerProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: isDragOverlay || isPlaced,
  });

  const wasDragging = useRef(false);
  useEffect(() => {
    if (isDragging) wasDragging.current = true;
  }, [isDragging]);

  const style = {
    transform: isDragOverlay ? undefined : CSS.Translate.toString(transform),
    fontFamily: 'var(--font-space), "Space Grotesk", sans-serif',
  };

  if (isPlaced) {
    return (
      <div
        style={{
          ...style,
          background: 'rgba(215,255,0,0.06)',
          border: '1px solid rgba(215,255,0,0.25)',
          padding: '10px 16px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'line-through',
          opacity: 0.45,
          color: 'var(--tgl-lime)',
          userSelect: 'none',
        }}
      >
        {label}
      </div>
    );
  }

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={{
        ...style,
        background: isSelected
          ? 'rgba(215,255,0,0.1)'
          : isDragging && !isDragOverlay ? 'transparent' : '#0d0d0d',
        border: isSelected
          ? '1px solid #D7FF00'
          : isDragging && !isDragOverlay
            ? '1px dashed rgba(215,255,0,0.3)'
            : isDragOverlay
              ? '1px solid #D7FF00'
              : '1px solid rgba(255,255,255,0.15)',
        boxShadow: isSelected
          ? '0 0 12px rgba(215,255,0,0.35)'
          : isDragOverlay ? '0 0 16px rgba(215,255,0,0.45), 0 4px 20px rgba(0,0,0,0.6)' : 'none',
        opacity: isDragging && !isDragOverlay ? 0.25 : 1,
        color: isDragOverlay ? '#000' : '#fff',
        backgroundColor: isDragOverlay ? '#D7FF00' : isSelected ? 'rgba(215,255,0,0.1)' : isDragging ? 'transparent' : '#0d0d0d',
        cursor: isSelected ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
        transition: isDragOverlay ? 'none' : 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
      }}
      {...(isDragOverlay ? {} : listeners)}
      {...(isDragOverlay ? {} : attributes)}
      className="px-4 py-2.5 rounded-lg text-sm font-semibold select-none"
      onClick={() => {
        if (isDragOverlay) return;
        if (wasDragging.current) { wasDragging.current = false; return; }
        onSelect?.(id);
      }}
    >
      {label}
    </div>
  );
}
