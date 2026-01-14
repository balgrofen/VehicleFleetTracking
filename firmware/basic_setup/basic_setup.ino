#include <utilities.h>

// Your phone number (Use international format: +CountryCodePhoneNumber)
const char target_phone[] = "+36707777800"; 
const char sms_message[]  = "Hello from LilyGo SIM7600!";

#define SerialMon Serial
#define SerialAT  Serial1

#include <TinyGsmClient.h>

TinyGsm modem(SerialAT);

void setup() {
    SerialMon.begin(115200);
    
    //Hardware Power On
    pinMode(MODEM_PWRKEY, OUTPUT);
    digitalWrite(MODEM_PWRKEY, LOW);
    delay(100);
    digitalWrite(MODEM_PWRKEY, HIGH);
    delay(2000); // Pulse for SIM7600
    digitalWrite(MODEM_PWRKEY, LOW);

    //Initialize Serial
    SerialAT.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);

    //Wait for the modem to say "RDY"
    SerialMon.println("Waiting for modem to boot up...");
    
    unsigned long start = millis();
    bool modemReady = false;
    while (millis() - start < 15000) { // Wait up to 15 seconds
        if (SerialAT.available()) {
            String line = SerialAT.readStringUntil('\n');
            SerialMon.println(line); // Print what the modem says
            if (line.indexOf("RDY") != -1) {
                modemReady = true;
                break;
            }
        }
        delay(10);
    }

    //start TinyGSM
    SerialMon.println("Initializing TinyGSM...");
    while(modem.begin()){
        if (!modem.begin()) {
        SerialMon.println("Failed to init modem. Attempting again...");
        }else{
            SerialMon.println("Modem init done");
            return;
        }
    }

    
    
    
    SerialMon.println("Modem is ONLINE and READY!");

    //Wait for Network 
    SerialMon.print("Connecting to network...");
    if (!modem.waitForNetwork(60000L)) {
        SerialMon.println(" fail. Check antenna!");
        return;
    }
    SerialMon.println(" success!");

   
}

void loop() {
    // Basic passthrough so you can manually type AT commands
    if (SerialAT.available()) {
        SerialMon.write(SerialAT.read());
    }
    if (SerialMon.available()) {
        SerialAT.write(SerialMon.read());
    }
}