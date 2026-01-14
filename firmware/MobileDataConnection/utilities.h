// utilities.h is needed for setting up the LilyGo module once then incude this header file

// Select your modem:
#define TINY_GSM_MODEM_SIM7600

// Define the serial pins for ESP32 <-> SIM7600 communication
#define MODEM_RX             26
#define MODEM_TX             27
#define MODEM_PWRKEY         4
#define MODEM_DTR            32
#define MODEM_RI             33
#define MODEM_FLIGHT         25
#define MODEM_STATUS         34

// Serial baud rate for the modem
#define MODEM_BAUDRATE       115200

// Macro to power on the modem (specific to LilyGo hardware)
#define BOARD_PWRKEY_PIN     4
#define BOARD_ADC_PIN        35