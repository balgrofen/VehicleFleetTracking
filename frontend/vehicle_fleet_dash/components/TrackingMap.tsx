"use client";

import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons in Next.js
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


// 1. Define the custom icon globally or for specific markers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// 2. Set it as the default for all markers
L.Marker.prototype.options.icon = DefaultIcon;

// @ts-ignore - Leaflet icon internals
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: (markerIcon as any).src,
  iconRetinaUrl: (markerIcon2x as any).src,
  shadowUrl: (markerShadow as any).src,
});

interface VehicleLocation {
  lat: number;
  lon: number;
  speed: number;
  altitude: number;
  accuracy: number;
  timestamp: string;
}

interface TrackingMapProps {
  carPlate: string;
}

// Sub-component to pan the map automatically
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center);
  }, [center, map]);
  return null;
}

export default function TrackingMap({ carPlate }: TrackingMapProps) {
  const [points, setPoints] = useState<VehicleLocation[]>([]);
  const [index, setIndex] = useState<number>(0);

  useEffect(() => {
    const loadData = async () => {
      const q = query(
        collection(db, "vehicles", carPlate, "locations"), 
        orderBy("timestamp", "asc")
      );
      
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => doc.data() as VehicleLocation);
      setPoints(data);
    };

    if (carPlate) loadData();
  }, [carPlate]);

  if (points.length === 0) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Loading path...</div>;
  }

  const current = points[index];
  const polylinePath: [number, number][] = points.map(p => [p.lat, p.lon]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white font-sans">
      {/* Map Header */}
      <div className="p-4 bg-slate-800 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Fleet Tracker: <span className="text-blue-400">{carPlate}</span></h1>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Last Update</p>
          <p className="text-sm font-mono">{new Date(current.timestamp).toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        <MapContainer 
          center={[current.lat, current.lon]} 
          zoom={16} 
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Polyline positions={polylinePath} color="#3b82f6" weight={4} opacity={0.6} />
          <Marker position={[current.lat, current.lon]} />
          <MapController center={[current.lat, current.lon]} />
        </MapContainer>

        {/* Floating Data Card */}
        <div className="absolute bottom-10 right-6 z-[1000] bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-slate-700 w-64">
           <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Speed</p>
                <p className="text-lg font-bold">{current.speed} <span className="text-sm font-normal text-slate-500">km/h</span></p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Altitude</p>
                <p className="text-lg font-bold">{current.altitude} <span className="text-sm font-normal text-slate-500">m</span></p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 uppercase">Accuracy</p>
                <p className="text-sm font-medium text-blue-300">{current.accuracy.toFixed(2)} HDOP</p>
              </div>
           </div>
        </div>
      </div>

      {/* Bottom Slider Control */}
      <div className="p-8 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
            <input 
              type="range"
              min="0"
              max={points.length - 1}
              value={index}
              onChange={(e) => setIndex(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
            />
            <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-500 tracking-tighter uppercase">
              <span>Start Trip</span>
              <span className="text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full text-xs">
                {index + 1} / {points.length} Points
              </span>
              <span>End Trip</span>
            </div>
        </div>
      </div>
    </div>
  );
}