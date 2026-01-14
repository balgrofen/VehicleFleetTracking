#define TINY_GSM_MODEM_SIM7600
#include <TinyGsmClient.h> 

const int pwr_pin = 4;
#define MODEM_RX 26
#define MODEM_TX 27

HardwareSerial SerialAT(1);

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Power sequence
  pinMode(pwr_pin, OUTPUT);
  digitalWrite(pwr_pin, LOW);
  delay(100);
  digitalWrite(pwr_pin, HIGH);
  delay(500);
  digitalWrite(pwr_pin, LOW);

  SerialAT.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);

  Serial.println("Wait for 'OK' response from modem...");
  
  // Keep sending AT until the modem responds
  bool modemReady = false;
  while (!modemReady) {
    SerialAT.println("AT");
    delay(500);
    while (SerialAT.available()) {
      String res = SerialAT.readString();
      if (res.indexOf("OK") != -1) {
        modemReady = true;
        Serial.println("Modem is responding!");
      }
    }
    Serial.print("."); // Progress dots
  }


  // 2. Set GPS to "Stand-alone" mode (Mode 1)
  Serial.println("Setting GPS to Stand-alone mode");
  SerialAT.println("AT+CGPS=1,1"); 
  delay(1000);

  // Now that we know it's awake, start GPS
  Serial.println("\nStarting GPS Engine...");
  SerialAT.println("AT+CGPS=1");
  delay(500);
  
 /* Serial.println("\nResetting GPS settings...");
  
  // 1. Stop GPS first (in case it's already running)
  SerialAT.println("AT+CGPS=0"); 
  delay(1000);
  */
  // 2. Set GPS to "Stand-alone" mode (Mode 1)
  SerialAT.println("AT+CGPS=1,1"); 
  delay(1000);

  // 3. Try to query the location directly to see if it works
  SerialAT.println("AT+CGPSINFO"); 
  delay(500);

  Serial.println("Enabling NMEA Stream...");
  SerialAT.println("AT+CGPSOUT=255");
  delay(500);
}

void loop() {
  SerialAT.println("AT+CGPSINFO"); 
  delay(10000);

  //Serial read
  while (SerialAT.available()) {
    String line = SerialAT.readStringUntil('\n');
    Serial.println("MODEM: " + line);
  }

//serial send
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    SerialAT.println(cmd);
    Serial.println("SENT: " + cmd);
  }
}