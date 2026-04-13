"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Shadcn UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Gauge, Mountain, Timer, MapPin } from "lucide-react";

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
  accuracy: number;       // number
  altitude: number;       // number
  carplate: string;       // string
  lat: number;            // number
  lon: number;            // number
  speed: number;          // number
  timestamp: string;      // string (ISO format)
  tripId: string;         // string
  unix_timestamp: number; // number
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.panTo(center); }, [center, map]);
  return null;
}

export default function TrackingMap({ tripId }: { tripId: string | null }) {
  const [points, setPoints] = useState<VehicleLocation[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadTripData = async () => {
  if (!tripId) return;
  setLoading(true);
  
  try {
    // 1. We query WITHOUT the orderBy initially to bypass index latency
    // and verify the connection is actually working.
    const q = query(
      collection(db, "locations"),
      where("tripId", "==", tripId)
    );

    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.warn(`No docs found for ID: ${tripId}. Check if field is 'tripId' or 'tripid'`);
      setPoints([]);
      return;
    }

    // 2. Map the data and fix potential type issues
// Inside your TrackingMap loadTripData function
const data = snap.docs.map(doc => {
  const d = doc.data();
  return {
    ...d, // This pulls in speed, altitude, accuracy, timestamp, and tripId
    lat: Number(d.lat),
    lon: Number(d.lon),
    unix_timestamp: Number(d.unix_timestamp)
  } as VehicleLocation; // TypeScript is now happy because all fields are present
});

    // 3. Manual Sort (Browser-side) 
    // This ensures your map works even if the Firestore index is still propagating
    const sortedData = data.sort((a, b) => a.unix_timestamp - b.unix_timestamp);
    
    setPoints(sortedData);
    setIndex(0); 

  } catch (error) {
    console.error("Firestore Map Error:", error);
  } finally {
    setLoading(false);
  }
};
    loadTripData();
  }, [tripId]);

  if (!tripId) {
    return (
      <Card className="flex h-[600px] flex-col items-center justify-center border-dashed">
        <MapPin className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">Válassz ki egy utat az út megtekintéséhez</p>
      </Card>
    );
  }

  if (loading) return <Skeleton className="h-[600px] w-full rounded-xl" />;

  if (loading || !points || points.length === 0) {
  return (
    <Card className="flex h-[450px] items-center justify-center bg-muted/20 border-dashed">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground animate-pulse">
          {loading ? "Fetching coordinates..." : "No GPS data found for this trip."}
        </p>
      </div>
    </Card>
  );
}

const current = points[index];
const polylinePath: [number, number][] = points.map(p => [p.lat, p.lon]);

  return (
    <Card className="overflow-hidden border-none shadow-none lg:border lg:shadow-sm flex flex-col h-full">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium leading-none">Út visszajátszása</CardTitle>
            <CardDescription className="text-xs font-mono">{tripId}</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono uppercase">
            {new Date(current.timestamp).toLocaleTimeString()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative flex-1 flex flex-col">
        {/* Leaflet Map */}
        <div className="flex-1 w-full z-0 min-h-[400px]">
          <MapContainer 
            center={[current.lat, current.lon]} 
            zoom={40} 
            className="h-full w-full"
            zoomControl={false} // Clean look
            
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polyline positions={polylinePath} pathOptions={{ color: '#3b82f6',weight: 5, opacity: 0.8, lineJoin: 'round' }} />
            <Marker position={[current.lat, current.lon]} />
            <MapController center={[current.lat, current.lon]} />
          </MapContainer>
        </div>

        {/* Floating Telemetry Overlay (Shadcn Style) */}
        <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
          <Card className="w-40 shadow-xl backdrop-blur-md bg-background/95">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Gauge className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold">{current.speed.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">km/h</span></span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Mountain className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-bold">{current.altitude.toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">m</span></span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Timer className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-bold">{new Date(current.unix_timestamp).toLocaleTimeString()} <span className="text-[10px] font-normal text-muted-foreground"></span></span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Playback Controls Footer */}
        <div className="p-6 bg-card border-t">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Indulás</span>
              <span className="text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px]">
                Előrehaladás: {Math.round(((index + 1) / points.length) * 100)}%
              </span>
              <span>Érkezés</span>
            </div>
            <Slider
              value={[index]}
              max={points.length - 1}
              step={1}
              onValueChange={(val) => setIndex(val[0])}
              className="py-4"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}