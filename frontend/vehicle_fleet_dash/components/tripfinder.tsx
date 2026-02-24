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

  // 1. Fetch available license plates on mount
  React.useEffect(() => {
    const fetchVehicles = async () => {
      const snapshot = await getDocs(collection(db, "vehicles"))
      setVehicles(snapshot.docs.map(doc => doc.id)) // Assuming ID is the plate
    }
    fetchVehicles()
  }, [])

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
      <Card>
        <CardHeader><CardTitle>Trip History Finder</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          {/* License Plate Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Vehicle</label>
            <Select onValueChange={setSelectedPlate}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Plate" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(plate => (
                  <SelectItem key={plate} value={plate}>{plate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleSearch} disabled={loading || !selectedPlate}>
            <Search className="mr-2 h-4 w-4" /> {loading ? "Searching..." : "Search Trips"}
          </Button>
        </CardContent>
      </Card>

      {/* Results List */}
      <div className="grid gap-4">
        {trips.length > 0 ? (
          trips.map(trip => (
            <Card key={trip.id} onClick={() => onSelectTrip(trip.id)} className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold">{new Date(trip.startTime).toLocaleTimeString()}</p>
                  <p className="text-sm text-muted-foreground">Status: {trip.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{(trip.totalDistance).toFixed(2)} km</p>
                  <p className="text-xs text-muted-foreground">ID: {trip.id.split('_').pop()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-10">No trips found for this criteria.</p>
        )}
      </div>
    </div>
  )
}