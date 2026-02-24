"use client";

import dynamic from 'next/dynamic';

// We define what props this dynamic component accepts
const TrackingMap = dynamic(() => import('../components/TrackingMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-slate-900 rounded-xl flex items-center justify-center text-white border border-slate-800 animate-pulse">
      Loading Map Engine...
    </div>
  )
});

// Add the prop here so the Dashboard can talk to it
export default function RenderMap({ tripId }: { tripId: string | null }) {
  return (
    <div className="w-full h-full">
      {/* Pass the tripId down to the dynamic TrackingMap */}
      <TrackingMap tripId={tripId} />
    </div>
  );
}