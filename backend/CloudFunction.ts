import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const processTripLogic = onDocumentCreated(
  "locations/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const newData = snapshot.data();
    const carplate = newData.carplate;
    const currentTs = newData.unixTimestamp || newData.unix_timestamp;
    const speed = newData.speed || 0;
    const {lat, lon} = newData;
    
    const TEN_MINS_MS = 10 * 60 * 1000;
    const vehicleRef = db.collection("vehicles").doc(carplate);

    try {
      await db.runTransaction(async (transaction) => {
        const vDoc = await transaction.get(vehicleRef);
        const vData = vDoc.data() || {};
        
        let status: "ACTIVE" | "IDLE" | "PARKED" = "ACTIVE";
        let tripId = vData.currentTripId;
        let isNewTrip = false;
        let stationarySince = vData.stationarySince || null;

        // 1. Determine Status & Stationary Timer
        if (speed === 0) {
          // If not already stationary, start the timer
          if (!stationarySince) {
            stationarySince = currentTs;
          }
          
          const idleDuration = currentTs - stationarySince;
          status = idleDuration >= TEN_MINS_MS ? "PARKED" : "IDLE";
        } else {
          // Vehicle is moving
          status = "ACTIVE";
          stationarySince = null; // Reset timer
        }

        // 2. Logic for New Trip
        // Triggered if: No previous data OR previous status was PARKED OR time gap > 10m
        const timeGap = currentTs - (vData.lastTimestamp || 0);
        if (!vDoc.exists || vData.status === "PARKED" || timeGap > TEN_MINS_MS) {
          tripId = `trip_${carplate}_${currentTs}`;
          isNewTrip = true;
        }

        // 3. Update Firestore
        const dist = isNewTrip ? 0 : getDistance(vData.lastLat, vData.lastLon, lat, lon);

        transaction.update(snapshot.ref, { tripId, status });

        transaction.set(vehicleRef, {
          currentTripId: tripId,
          lastTimestamp: currentTs,
          lastLat: lat,
          lastLon: lon,
          status: status,
          stationarySince: stationarySince
        }, {merge: true});

        const tripRef = db.collection("trips").doc(tripId);
        if (isNewTrip) {
          transaction.set(tripRef, {
            carplate,
            startTime: currentTs,
            startLat: lat,
            startLon: lon,
            totalDistance: 0,
            status: "STARTED",
          });
        } else {
          transaction.update(tripRef, {
            totalDistance: admin.firestore.FieldValue.increment(dist),
            lastUpdate: currentTs,
          });
        }
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  }
);