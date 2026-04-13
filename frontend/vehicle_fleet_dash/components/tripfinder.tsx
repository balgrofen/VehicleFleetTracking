"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Car, Search } from "lucide-react"
import { db } from "@/lib/firebase" // Your firebase config
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TripFinderProps {
  onSelectTrip: (tripId: string) => void;
}

export default function TripFinder({ onSelectTrip }: TripFinderProps) {
  const [vehicles, setVehicles] = React.useState<string[]>([])
  const [selectedPlate, setSelectedPlate] = React.useState<string>("")
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [trips, setTrips] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  // Inside your TripFinder component
const [tripDates, setTripDates] = React.useState<Date[]>([])

// Fetch all trip dates for the selected vehicle to "mark" the calendar
React.useEffect(() => {
  const fetchTripDates = async () => {
    if (!selectedPlate) return
    try {
      const q = query(
        collection(db, "trips"),
        where("carplate", "==", selectedPlate)
      )
      const snapshot = await getDocs(q)
      const dates = snapshot.docs.map(doc => new Date(doc.data().startTime))
      setTripDates(dates)
    } catch (e) {
      console.error("Error fetching trip dates:", e)
    }
  }
  fetchTripDates()
}, [selectedPlate])

  // 1. Fetch available license plates on mount
   React.useEffect(() => {
  const fetchVehicles = async () => {
    try {
      console.log("Fetching from collection: vehicles...");
      const snapshot = await getDocs(collection(db, "vehicles"));
      
      if (snapshot.empty) {
        console.warn("No documents found in 'vehicles' collection.");
        return;
      }

      const plates = snapshot.docs.map(doc => doc.id);
      console.log("Found plates:", plates);
      setVehicles(plates);
    } catch (error) {
      // This will tell you if it's a permission error or a config error
      console.error("Failed to fetch vehicles:", error);
    }
  };
  fetchVehicles();
}, []);

  // 2. Query Trips based on filters
  const handleSearch = async () => {
    if (!selectedPlate || !date) return
    setLoading(true)

    // Calculate start and end of the selected day in Unix ms
    const startOfDay = new Date(date).setHours(0, 0, 0, 0)
    const endOfDay = new Date(date).setHours(23, 59, 59, 999)

    try {
      const q = query(
        collection(db, "trips"),
        where("carplate", "==", selectedPlate),
        where("startTime", ">=", startOfDay),
        where("startTime", "<=", endOfDay),
        orderBy("startTime", "desc")
      )

      const querySnapshot = await getDocs(q)
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setTrips(results)
    } catch (error) {
      console.error("Firestore Error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader><CardTitle>Korábbi út kereső</CardTitle></CardHeader>
        <CardContent className="flex flex-col md:flex-row flex-wrap gap-4 items-end">
          {/* License Plate Select */}
          <div className="space-y-2 w-full md:w-auto flex-1 min-w-[200px]">
            <label className="text-sm font-medium">Rendszám</label>
            <Select onValueChange={setSelectedPlate}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Plate" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999]">
                {vehicles.map(plate => (
                  <SelectItem key={plate} value={plate}>{plate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker */}
          <div className="space-y-2 w-full md:w-auto flex-1 min-w-[200px]">
            <label className="text-sm font-medium">Dátum</label><br></br>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Válassz dátumot</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                modifiers={{
                booked: tripDates,
                }}
                // Pont azok alatt a dátumok alatt ahol van helyadat
                modifiersClassNames={{
                booked: "after:block after:mx-auto after:w-1 after:h-1 after:bg-primary after:rounded-full after:mt-1"
                }}/>
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleSearch} disabled={loading || !selectedPlate} className="w-full md:w-auto">
            <Search className="mr-2 h-4 w-4" /> {loading ? "Keresés..." : "Útvonal listázása"}
          </Button>
        </CardContent>
      </Card>

      {/* Results List */}
      <div className="grid gap-4">
        {trips.length > 0 ? (
          trips.map(trip => (
            <Card key={trip.id} onClick={() => onSelectTrip(trip.id)} className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 flex justify-center items-center gap-8">
                <div>
                  <p className="font-medium">Menetidő: {new Date(trip.lastUpdate - trip.startTime).toLocaleTimeString()}</p>
                  
                  <p className="text-xs text-muted-foreground">Út kezdete: {new Date(trip.startTime).toLocaleTimeString()}</p>
                  <p className="text-xs text-muted-foreground">Út vége: {new Date(trip.lastUpdate).toLocaleTimeString()}</p>
                   
                </div>
                
                <div className="h-30 w-[2px] bg-border" />

                <div className="text-left">
                  <p className="font-medium">Megtett táv: {(trip.totalDistance).toFixed(2)} km</p>
                  <p className="text-xs text-muted-foreground">ID: {trip.id.split('_').pop()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-10">Az kiválaszott rendszámmal és dátummal nem létezik adat.</p>
        )}
      </div>
    </div>
  )
}