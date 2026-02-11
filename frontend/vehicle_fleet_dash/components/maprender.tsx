"use client";

import dynamic from 'next/dynamic';

const TrackingMap = dynamic(() => import('../components/TrackingMap'), { 
  ssr: false,
  loading: () => <div className="h-screen bg-slate-900 flex items-center justify-center text-white">Loading Map Engine...</div>
});

export default function RenderMap() {
  return (
    <main>
      <TrackingMap carPlate="ABC-123" />
    </main>
  );
}