from datetime import datetime
import json
import paho.mqtt.client as mqtt

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("/app/service-account.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

def save_to_firebase(carplate, data):
    # Calculate Unix Timestamp in MS
    ts_ms = int(
        datetime.fromisoformat(
            data["timestamp"].replace("Z", "+00:00")
        ).timestamp() * 1000
    )

    # Add necessary fields for the Cloud Function to process
    data["carplate"] = carplate
    data["unix_timestamp"] = ts_ms

    # SAVE TO FLAT COLLECTION: locations/{auto_id}
    # This triggers the Cloud Function
    db.collection("locations").add(data)
    
def parse_payload(payload: str):
    fields = payload.split(",")
    carplate = str(fields[0])
    lat = float(fields[1])
    lon = float(fields[2])
    speed = float(fields[3])
    altitude = float(fields[4])
    hdop = float(fields[7])

    year, month, day = map(int, fields[8:11])
    hour, minute, second = map(int, fields[11:14])

    timestamp = datetime(
        year, month, day, hour, minute, second
    ).isoformat() + "Z"

    return carplate, {
        "lat": lat,
        "lon": lon,
        "speed": speed,
        "altitude": altitude,
        "accuracy": hdop,
        "timestamp": timestamp
    }


def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    carplate,parsed = parse_payload(payload)
    save_to_firebase(carplate, parsed)
    print(parsed)

client = mqtt.Client()
client.on_message = on_message
client.connect("localhost", 23295)
client.subscribe("esp32/location")
client.loop_forever()
