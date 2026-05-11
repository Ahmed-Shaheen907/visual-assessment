import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex items-center justify-center p-8">
      <div className="text-center max-w-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-6 ring-1 ring-indigo-500/30">
          Geography Game
        </div>
        <h1 className="text-5xl font-bold text-white tracking-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
          Visual Assessment
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed mb-10">
          Drag and drop the correct answers onto the map. Test your geographic knowledge.
        </p>
        <Link
          href="/game"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-semibold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-400/40 transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 active:translate-y-0"
        >
          Start Game →
        </Link>
      </div>
    </main>
  );
}
