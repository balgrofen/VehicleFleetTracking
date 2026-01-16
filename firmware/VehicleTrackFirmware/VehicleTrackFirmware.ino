#define TINY_GSM_MODEM_SIM7600
#define TINY_GSM_RX_BUFFER 1024

#include <TinyGsmClient.h>
#include <PubSubClient.h>

// ================= PINS & CREDENTIALS =================
#define MODEM_TX      27
#define MODEM_RX      26
#define MODEM_PWRKEY  4
#define MODEM_FLIGHT  25 

const char apn[]      = "internet.vodafone.net"; 
const char gprsUser[] = "";         
const char gprsPass[] = "";         

// ================= MQTT SETTINGS =================
const char* broker = "10.tcp.eu.ngrok.io"; 
const int   port   = 23295;            
const char* topic  = "esp32/location"; 

// ================= OBJECTS =================
HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);
TinyGsmClient client(modem);
PubSubClient mqtt(client);

// Variables for GPS (Must allow library to fill all these)
float lat, lon, speed, alt, accuracy;
int   vsat, usat, year, month, day, hour, minute, sec;

void setup() {
  Serial.begin(115200);
  delay(10);

  // 1. Power On
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, LOW);
  delay(100);
  digitalWrite(MODEM_PWRKEY, HIGH);
  delay(1000);
  digitalWrite(MODEM_PWRKEY, LOW);

  SerialAT.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);

  // 2. Init & Network
  Serial.println("Initializing...");
  modem.restart();
  
  // Your Custom GPS Setup (Keep this!)
  modem.sendAT("+CGPS=1,1"); // Set Stand-alone mode
  modem.waitResponse();
  modem.enableGPS();         // Turn GPS On

  Serial.print("Connecting to Network...");
  if (!modem.waitForNetwork()) {
    Serial.println("Fail");
    while (true);
  }
  Serial.println("OK");

  Serial.print("Connecting to APN...");
  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
    Serial.println("Fail");
    while (true);
  }
  Serial.println("OK");

  mqtt.setServer(broker, port);
}

void loop() {
  if (!mqtt.connected()) reconnect();
  mqtt.loop();
  
  static unsigned long lastMsg = 0;
  // Send every 5 seconds
  if (millis() - lastMsg > 5000) {
    lastMsg = millis();
    
    // Get GPS data
    if (modem.getGPS(&lat, &lon, &speed, &alt, &vsat, &usat, &accuracy,
                     &year, &month, &day, &hour, &minute, &sec)) {
      
      // Only send if we have a valid location
      if (lat != 0 && lon != 0) {
        
        // SIMPLE FORMAT: "lat,lon" (e.g. "45.1234,19.1234")
        //String payload = String(lat, 6) + "," + String(lon, 6);
        String payload = String(lat, 6) + "," + String(lon, 6) + "," + String(speed) + "," + String(alt) + "," + String(vsat) + "," + String(usat) + "," + String(accuracy) + "," + String(year) + "," + String(month) + "," + String(day) + "," + String(hour) + "," + String(minute) + "," + String(sec);
        
        Serial.print("Sending: ");
        Serial.println(payload);
        mqtt.publish(topic, payload.c_str());
        
      } else {
        Serial.println("Searching for Satellites...");
      }
    }
  }
}

void reconnect() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    String clientId = "ESP32-" + String(random(0xffff), HEX);
    if (mqtt.connect(clientId.c_str())) {
      Serial.println("Connected!");
    } else {
      Serial.print("Failed (rc=");
      Serial.print(mqtt.state());
      Serial.println(")");
      delay(5000);
    }
  }
}