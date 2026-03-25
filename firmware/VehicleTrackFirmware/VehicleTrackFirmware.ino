// ================================================================
//  Combined Firmware: OLED + GSM/GPS/MQTT + TOTP + SMS Config
// ================================================================
#define TINY_GSM_MODEM_SIM7600
#define TINY_GSM_RX_BUFFER 1024

#include <U8g2lib.h>
#include <Wire.h>
#include <Preferences.h>
#include <TOTP.h>
#include <TinyGsmClient.h>
#include <PubSubClient.h>

// ================= PIN DEFINITIONS =================
#define BTN_PIN       32
#define OLED_SDA      21
#define OLED_SCL      22
#define MODEM_TX      27
#define MODEM_RX      26
#define MODEM_PWRKEY  4
#define MODEM_FLIGHT  25
#define LED_PIN       12

// ================= CREDENTIALS =================
const char apn[]      = "online";
const char gprsUser[] = "";
const char gprsPass[] = "";

// ================= MQTT SETTINGS =================
const char* broker = "10.tcp.eu.ngrok.io";
const int   port   = 23295;
const char* topic  = "esp32/location";

// ================= DEFAULT LICENSE PLATE =================
#define DEFAULT_PLATE "ABC-123"

// ================= BITMAPS =================
static const unsigned char image_NetworkConnection_bits[] U8X8_PROGMEM = {
  0xc0,0x03,0xb0,0x0d,0x4c,0x32,0x24,0x24,0x22,0x44,0xfe,0x7f,
  0x11,0x88,0x11,0x88,0x11,0x88,0x11,0x88,0xfe,0x7f,0x22,0x44,
  0x24,0x24,0x4c,0x32,0xb0,0x0d,0xc0,0x03
};
static const unsigned char image_location_bits[] U8X8_PROGMEM = {
  0xf0,0x01,0x0c,0x06,0x02,0x08,0xe2,0x08,0x11,0x11,0x09,0x12,
  0x09,0x12,0x0a,0x0a,0x12,0x09,0xe4,0x04,0x04,0x04,0x08,0x02,
  0x10,0x01,0xa0,0x00,0xe0,0x00,0x40,0x00
};

// ================= OBJECTS =================
U8G2_SH1106_128X64_VCOMH0_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

uint8_t hmacKey[] = {0x4d, 0x79, 0x53, 0x65, 0x63, 0x72, 0x65, 0x74};
TOTP totp = TOTP(hmacKey, 8);

HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);
TinyGsmClient gsmClient(modem);
PubSubClient mqtt(gsmClient);

Preferences preferences;

// ================= STATE MACHINE =================
typedef enum { SLEEP, MAINMENU, CONFIG_MODE } State;
typedef enum { NONE, SHORT_PRESS, LONG_PRESS } ButtonEvent;

State current_state = SLEEP;
unsigned long stateStartTime = 0;
unsigned long pressStartTime = 0;
bool isPressed = false;
const unsigned long LONG_PRESS_TIME = 2000;

// ================= GPS / TIME GLOBALS =================
float lat = 0, lon = 0, gpsSpeed = 0, alt = 0, accuracy = 0;
int   vsat = 0, usat = 0;
int   gYear = 0, gMonth = 0, gDay = 0, gHour = 0, gMinute = 0, gSec = 0;
bool  gpsValid = false;

// Soft clock — updated from GPS/network, ticked by millis()
int   rtHour = 0, rtMinute = 0, rtSec = 0;
unsigned long lastSecTick = 0;

// ================= LICENSE PLATE =================
String licensePlate = DEFAULT_PLATE;

// ================================================================
//  SMS CONFIG
// ================================================================

String readSMS(int index) {
  modem.sendAT(String("+CMGR=") + index);
  String resp;
  modem.waitResponse(2000, resp);
  return resp;
}

void deleteSMS(int index) {
  modem.sendAT(String("+CMGD=") + index);
  modem.waitResponse(1000);
}

String extractSMSBody(const String& raw) {
  // The raw string looks like:
  // AT+CMGR=1\r\n
  // +CMGR: "REC UNREAD","+3630123456",,"2026/03/25,23:05:00+00"\r\n
  // 873275,AAX-123\r\n
  // OK

  int headerIndex = raw.indexOf("+CMGR:");
  if (headerIndex == -1) return "";

  // Find the end of that +CMGR header line
  int firstNL = raw.indexOf("\n", headerIndex);
  if (firstNL == -1) return "";

  // The body starts after that newline
  String body = raw.substring(firstNL + 1);
  
  // The body ends before the "OK"
  int okIndex = body.lastIndexOf("OK");
  if (okIndex != -1) {
    body = body.substring(0, okIndex);
  }

  body.trim(); // Remove \r, \n, and spaces
  return body;
}

// Poll slots 1-5 for an OTP,plate SMS; update plate if OTP matches
void checkIncomingSMS() {
  modem.sendAT("+CMGF=1");
  modem.waitResponse(1000);

  for (int i = 1; i <= 5; i++) {
    String raw = readSMS(i);
    if (raw.indexOf("+CMGR:") == -1) continue; 

    String body = extractSMSBody(raw);
    if (body.length() == 0) { deleteSMS(i); continue; }

    int commaIdx = body.indexOf(',');
    if (commaIdx == -1) { deleteSMS(i); continue; }

    String receivedOTP = body.substring(0, commaIdx);
    String newPlate    = body.substring(commaIdx + 1);
    receivedOTP.trim();
    newPlate.trim();

    // --- KEY FIX HERE ---
    // Get the exact same timestamp used by the OLED display
    unsigned long now = getUnixTimestamp();
    
    // Generate the OTP for 'now' and '30 seconds ago' (in case of SMS delay)
    String code0 = String(totp.getCode(now - 30)); // 30s ago
    String code1 = String(totp.getCode(now));      // Now
    String code2 = String(totp.getCode(now + 30)); // 30s in the future

    if ( receivedOTP == code0 || receivedOTP == code1 || receivedOTP == code2) {
      licensePlate = newPlate;
      preferences.putString("plate", licensePlate);
      
      Serial.println("Success! Plate updated to: " + licensePlate);
      current_state=MAINMENU;

      // Show confirmation on OLED
      u8g2.clearBuffer();
      u8g2.setFont(u8g2_font_profont17_tr);
      u8g2.drawStr(10, 25, "OTP Accepted!");
      u8g2.setFont(u8g2_font_6x10_tr);
      u8g2.drawStr(10, 42, licensePlate.c_str());
      u8g2.sendBuffer();
      delay(3000);
      
      stateStartTime = millis(); 
    } else {
      Serial.print("Mismatch! Sent: ");
      Serial.print(receivedOTP);
      Serial.print(" | Expected: ");
      Serial.println(code1);
    }

    deleteSMS(i);
  }
}

// ================================================================
//  BUTTON
// ================================================================
ButtonEvent checkButton() {
  static bool longPressTriggered = false;
  bool pressed = (digitalRead(BTN_PIN) == LOW);

  if (pressed && !isPressed) {
    pressStartTime      = millis();
    isPressed           = true;
    longPressTriggered  = false;
    return NONE;
  }
  if (pressed && isPressed) {
    if (!longPressTriggered && (millis() - pressStartTime >= LONG_PRESS_TIME)) {
      longPressTriggered = true;
      return LONG_PRESS;
    }
  }
  if (!pressed && isPressed) {
    isPressed = false;
    if (!longPressTriggered) return SHORT_PRESS;
  }
  return NONE;
}

// ================================================================
//  STATE HANDLER
// ================================================================
void handle_event(ButtonEvent e) {
  stateStartTime = millis();

  if (current_state == SLEEP) {
    current_state = MAINMENU;
    return;
  }
  if (current_state == MAINMENU) {
    if      (e == SHORT_PRESS) current_state = SLEEP;
    else if (e == LONG_PRESS)  current_state = CONFIG_MODE;
  }
  else if (current_state == CONFIG_MODE) {
    if (e == SHORT_PRESS || e == LONG_PRESS) current_state = MAINMENU;
  }
}

// ================================================================
//  SOFT CLOCK  (increments every 1 s; synced from GPS / network)
// ================================================================
void tickClock() {
  if (millis() - lastSecTick >= 1000) {
    lastSecTick = millis();
    if (++rtSec   >= 60) { rtSec   = 0; if (++rtMinute >= 60) { rtMinute = 0; if (++rtHour >= 24) rtHour = 0; } }
  }
}

#include <time.h>

unsigned long getUnixTimestamp() {
    struct tm t;
    t.tm_year = gYear - 1900; // Year since 1900
    t.tm_mon = gMonth - 1;    // Month 0-11
    t.tm_mday = gDay;
    t.tm_hour = gHour;
    t.tm_min = gMinute;
    t.tm_sec = gSec;
    t.tm_isdst = -1;          // Not considering daylight saving
    
    return mktime(&t);
    time_t res = mktime(&t);
    if (res == -1) return millis() / 1000; // Fallback to keep bar moving
    return (unsigned long)res;
}

// ================================================================
//  DISPLAY
// ================================================================
void updateDisplay() {
  u8g2.clearBuffer();

  if (current_state == SLEEP) {
    u8g2.setPowerSave(1);
    u8g2.sendBuffer();
    return;
  }

  u8g2.setPowerSave(0);

  // Status icons (always shown when awake)
  u8g2.drawXBMP(3,  2, 16, 16, image_NetworkConnection_bits);
  u8g2.drawXBMP(24, 2, 13, 16, image_location_bits);

  if (current_state == MAINMENU) {
    // ---- Time from soft clock ----
    char timeBuf[6];
    sprintf(timeBuf, "%02d:%02d", rtHour, rtMinute);
    u8g2.setFont(u8g2_font_profont29_tr);
    u8g2.drawStr(26, 40, timeBuf);

    // ---- Long-press bar or hint ----
    if (isPressed) {
      int w = map(constrain(millis() - pressStartTime, 0, LONG_PRESS_TIME), 0, LONG_PRESS_TIME, 0, 128);
      u8g2.drawBox(0, 60, w, 4);
    } else {
      u8g2.setFont(u8g2_font_6x10_tr);
      u8g2.drawStr(30, 62, "Hold for OTP");
    }
  }
  else if (current_state == CONFIG_MODE) {
    u8g2.clearBuffer();
    unsigned long now = getUnixTimestamp();
    // ---- OTP code ----
    u8g2.setFont(u8g2_font_profont17_tr);
    u8g2.drawStr(11, 19, "OTP CODE");
    long currentWindow = millis() / 30000;
    u8g2.setFont(u8g2_font_profont29_tr);
    u8g2.drawStr(9, 45, totp.getCode(now));

    
    // ---- Countdown bar aligned to real 30 s TOTP window ----
    int secondsRemaining = 30 - (now % 30);
    int barWidth = map(secondsRemaining, 0, 30, 0, 128);
    u8g2.drawBox(0, 60, barWidth, 4);
  }

  u8g2.sendBuffer();
}

// ================================================================
//  MQTT RECONNECT
// ================================================================
void reconnect() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    digitalWrite(LED_PIN, HIGH); delay(250);
    digitalWrite(LED_PIN, LOW);  delay(250);

    String clientId = "ESP32-" + String(random(0xffff), HEX);
    if (mqtt.connect(clientId.c_str())) {
      Serial.println("Connected!");
    } else {
      Serial.print("Failed (rc=");
      Serial.print(mqtt.state());
      Serial.println("), retrying in 5s");
      delay(5000);
    }
  }
  digitalWrite(LED_PIN, HIGH); // Solid = connected
}

// ================================================================
//  SETUP
// ================================================================
void setup() {
  Serial.begin(115200);
   pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // ---- OLED boot splash ----
  Wire.begin(OLED_SDA, OLED_SCL);
  u8g2.begin();
  u8g2.setI2CAddress(0x3C * 2);
  u8g2.clearBuffer();
  u8g2.setPowerSave(0);
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(20, 30, "Booting...");
  u8g2.sendBuffer();

  // ---- Load saved license plate ----
  preferences.begin("tracker", false);
  licensePlate = preferences.getString("plate", DEFAULT_PLATE);
  Serial.print("Loaded plate: ");
  Serial.println(licensePlate);

  // ---- Power on modem ----
  Serial.print("Started Modem");
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, LOW);
  delay(100);
  digitalWrite(MODEM_PWRKEY, HIGH);
  delay(1000);
  digitalWrite(MODEM_PWRKEY, LOW);
  
  SerialAT.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);

  Serial.println("Initializing modem...");
 modem.init(); 
  delay(5000);

Serial.print("Modem Info: ");
Serial.println(modem.getModemInfo());

Serial.print("SIM Status: ");
Serial.println(modem.getSimStatus());

Serial.print("Signal Quality: ");
Serial.println(modem.getSignalQuality());

Serial.print("Operator: ");
Serial.println(modem.getOperator());

// Wait until operator is registered
Serial.print("Waiting for operator...");
String op = "";
while (op == "" || op == "0") {
  op = modem.getOperator();
  Serial.print(".");
  delay(1000);
}
Serial.println(" Got: " + op);

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

  modem.sendAT("+CGPS=1,1"); // Set Stand-alone mode
  modem.waitResponse();
  modem.enableGPS(); 

  modem.sendAT("+CMGF=1");
  modem.waitResponse(1000);
  modem.sendAT("+CPMS=\"ME\",\"ME\",\"ME\"");
  modem.waitResponse(1000);

  // Sync soft clock from network time
  int ny, nm, nd, nh, nmin, nsec;
  float ntz;
  if (modem.getNetworkTime(&ny, &nm, &nd, &nh, &nmin, &nsec, &ntz)) {
    rtHour   = nh;
    rtMinute = nmin;
    rtSec    = nsec;
    Serial.printf("Network time: %02d:%02d:%02d\n", rtHour, rtMinute, rtSec);
  }

  mqtt.setServer(broker, port);
  stateStartTime = millis();
  lastSecTick    = millis();
}

// ================================================================
//  LOOP
// ================================================================
void loop() {
  // Button
  ButtonEvent e = checkButton();
  if (e != NONE) handle_event(e);

// Auto-sleep after 20 s of inactivity (ONLY if not in CONFIG_MODE)
if (current_state != SLEEP && current_state != CONFIG_MODE) {
  if (millis() - stateStartTime > 20000) {
    current_state = SLEEP;
  }
}

  tickClock();

if(current_state == MAINMENU || current_state == SLEEP){

   // Soft clock

  // MQTT keep-alive
  if (!mqtt.connected()) reconnect();
  else                   digitalWrite(LED_PIN, HIGH);
  mqtt.loop();

  // GPS poll + MQTT publish every 5 s
  static unsigned long lastMsg = 0;
  if (millis() - lastMsg > 5000) {
    lastMsg = millis();

    if (modem.getGPS(&lat, &lon, &gpsSpeed, &alt, &vsat, &usat, &accuracy,
                     &gYear, &gMonth, &gDay, &gHour, &gMinute, &gSec)) {
      gpsValid = (lat != 0 && lon != 0);

      if (gpsValid) {
        // Re-sync soft clock from GPS fix
        rtHour   = gHour;
        rtMinute = gMinute;
        rtSec    = gSec;
        lastSecTick = millis();

        String payload = String(licensePlate) + "," +
                         String(lat, 6)       + "," +
                         String(lon, 6)       + "," +
                         String(gpsSpeed)     + "," +
                         String(alt)          + "," +
                         String(vsat)         + "," +
                         String(usat)         + "," +
                         String(accuracy)     + "," +
                         String(gYear)        + "," +
                         String(gMonth)       + "," +
                         String(gDay)         + "," +
                         String(gHour)        + "," +
                         String(gMinute)      + "," +
                         String(gSec);

        Serial.print("Publishing: ");
        Serial.println(payload);
        mqtt.publish(topic, payload.c_str());
      } else {
        Serial.println("Searching for satellites...");
      }
    }
  }

}
 
// 1. Manage MQTT Connection (Only run if NOT in Config Mode)
if (current_state != CONFIG_MODE) {
  if (!mqtt.connected()) {
    reconnect();
  }
  mqtt.loop();
} else {
  // If we just entered CONFIG_MODE, kill the MQTT connection to clear the line
  if (mqtt.connected()) {
    mqtt.disconnect();
    Serial.println("MQTT Disconnected for SMS stability");
  }
}

// 2. Periodic SMS Check (While in Config Mode)
static unsigned long lastSmsCheck = 0;
if (current_state == CONFIG_MODE && (millis() - lastSmsCheck > 10000)) {
  lastSmsCheck = millis();
  
  Serial.println("Checking for SMS...");
  checkIncomingSMS(); 
}

  updateDisplay();
}
