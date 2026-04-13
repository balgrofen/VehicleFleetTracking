#!/bin/bash
set -e

echo "================================================"
echo "  JárműŐr - Indítás"
echo "================================================"

# Ellenőrizzük, hogy létezik-e a .env fájl
if [ ! -f .env ]; then
    echo "HIBA: A .env fájl nem található!"
    echo "Másold át a .env.example fájlt .env névvel és töltsd ki az értékeket:"
    echo "  cp .env.example .env"
    exit 1
fi

# Ellenőrizzük, hogy létezik-e a Firebase hitelesítési fájl
if [ ! -f config/firebase-auth.json ]; then
    echo "HIBA: A config/firebase-auth.json fájl nem található!"
    echo "Helyezd el a Firebase szolgáltatásfiók JSON fájlját oda."
    exit 1
fi

# Futásidejű könyvtárak létrehozása, ha hiányoznak
mkdir -p mosquitto/data mosquitto/log

# MQTT jelszófájl létrehozása, ha még nem létezik
if [ ! -f mosquitto/config/pwfile ]; then
    echo ""
    echo ">> Első indítás - MQTT felhasználó beállítása..."
    echo "   Adj meg egy felhasználónevet az MQTT brókerhez:"
    read -r MQTT_USER
    echo "   Adj meg egy jelszót:"
    read -rs MQTT_PASSWORD
    echo ""

    # Jelszófájl generálása a mosquitto konténer segítségével
    docker run --rm \
        -v "$(pwd)/mosquitto/config:/mosquitto/config" \
        eclipse-mosquitto:latest \
        mosquitto_passwd -b -c /mosquitto/config/pwfile "$MQTT_USER" "$MQTT_PASSWORD"

    # Hitelesítési adatok mentése a .env fájlba
    echo "" >> .env
    echo "# MQTT hitelesítés" >> .env
    echo "MQTT_USER=$MQTT_USER" >> .env
    echo "MQTT_PASSWORD=$MQTT_PASSWORD" >> .env

    echo "   MQTT felhasználó sikeresen létrehozva!"
fi


# Képfájlok betöltése, ha még nem töltötték be
echo ""
echo ">> Docker képfájlok ellenőrzése..."

if ! docker image inspect mqtt-parser:latest &>/dev/null; then
    echo "   parsingmqtt.tar betöltése..."
    docker load -i images/parsingmqtt.tar
else
    echo "   mqtt-parser már be van töltve, kihagyás."
fi

if ! docker image inspect vehicle-webapp:latest &>/dev/null; then
    echo "   vehicle-fleet-dash.tar betöltése..."
    docker load -i images/vehicle-fleet-dash.tar
else
    echo "   vehicle-fleet-dash.tar már be van töltve, kihagyás."
fi

# Minden szolgáltatás indítása
echo ""
echo ">> Szolgáltatások indítása..."
docker compose up -d

echo ""
echo "================================================"
echo "  JárműŐr fut!"
echo "  Műszerfal: http://localhost"
echo "  MQTT:      localhost:1883"
echo "================================================"
