#include <utilities.h>
#define TINY_GSM_MODEM_SIM7600
#include <TinyGsmClient.h>
//#include <PubSubClient.h>

// Set your Serial ports
#define SerialMon Serial
#define SerialAT  Serial1

// LilyGo SIM7600 Pin Definitions
#define UART_BAUD   115200
#define PIN_DTR     25
#define PIN_TX      27
#define PIN_RX      26
#define PWR_PIN     4  // Power Key

const char apn[]      = "internet.one.net";
const char gprsUser[] = "";
const char gprsPass[] = "";


TinyGsm modem(SerialAT);

void setup() {
  SerialMon.begin(115200);
  
  // 1. Power on the modem hardware
  pinMode(PWR_PIN, OUTPUT);
  digitalWrite(PWR_PIN, LOW);
  delay(100);
  digitalWrite(PWR_PIN, HIGH);
  delay(1000); // Pulse the power key
  digitalWrite(PWR_PIN, LOW);

  // 2. Start Serial communication
  SerialAT.begin(UART_BAUD, SERIAL_8N1, PIN_RX, PIN_TX);
  
  SerialMon.println("Initializing modem...");
  if (!modem.restart()) {
    SerialMon.println("Failed to restart modem");
    return;
  }

  String modemInfo = modem.getModemInfo();
  SerialMon.print("Modem Info: ");
  SerialMon.println(modemInfo);

  SerialMon.print("Waiting for network...");
  if (!modem.waitForNetwork()) {
    SerialMon.println(" fail");
    return;
  }
  SerialMon.println(" success");

  SerialMon.print("Connecting to APN: ");
  SerialMon.print(apn);
  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
    SerialMon.println(" fail");
    return;
  }
  SerialMon.println(" success");



}

void loop() {
  // Use a passthrough to test AT commands manually
  while (SerialAT.available()) SerialMon.write(SerialAT.read());
  while (SerialMon.available()) SerialAT.write(SerialMon.read());

  /*if (!mqtt.connected()) {
    mqttConnect();
  }
  mqtt.loop();
  
  // Example: Publish every 10 seconds
  static unsigned long lastMsg = 0;
  if (millis() - lastMsg > 10000) {
    lastMsg = millis();
    mqtt.publish("test/topic", "Heartbeat");
  }*/
}