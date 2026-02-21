import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Calculates the distance between two points in kilometers.
 * @param {number} lat1 Latitude of point 1.
 * @param {number} lon1 Longitude of point 1.
 * @param {number} lat2 Latitude of point 2.
 * @param {number} lon2 Longitude of point 2.
 * @return {number} The distance in kilometers.
 */
const getDistance = (
  lat1: number, lon1: number, lat2: number, lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const processTripLogic = onDocumentCreated(
  "locations/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const newData = snapshot.data();
    const carplate = newData.carplate;
    const currentTs = newData.unixTimestamp || newData.unix_timestamp;
    const {lat, lon} = newData;
    const tenMinutesMs = 10 * 60 * 1000;

    const vehicleRef = db.collection("vehicles").doc(carplate);

    try {
      await db.runTransaction(async (transaction) => {
        const vDoc = await transaction.get(vehicleRef);
        const vData = vDoc.data();

        let tripId: string;
        let isNewTrip = false;
        let dist = 0;

        const timeGap = currentTs - (vData?.lastTimestamp || 0);
        if (!vDoc.exists || timeGap > tenMinutesMs) {
          tripId = `trip_${carplate}_${currentTs}`;
          isNewTrip = true;
        } else {
          tripId = vData?.currentTripId;
          dist = getDistance(vData?.lastLat, vData?.lastLon, lat, lon);
        }

        transaction.update(snapshot.ref, {tripId: tripId});

        transaction.set(vehicleRef, {
          currentTripId: tripId,
          lastTimestamp: currentTs,
          lastLat: lat,
          lastLon: lon,
        }, {merge: true});

        const tripRef = db.collection("trips").doc(tripId);
        if (isNewTrip) {
          transaction.set(tripRef, {
            carplate,
            startTime: currentTs,
            startLat: lat,
            startLon: lon,
            totalDistance: 0,
            status: "ACTIVE",
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
  });