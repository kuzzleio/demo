# RPi Multi-Sensor

The multi sensor device based on a raspberry pi to demonstrate Kuzzle usage as IoT backend

See http://kuzzle.io for more info about Kuzzle

## Sensors

Each sensor connected to the RPi will publish its own state to act as they were really independent sensors.
Thus, each sensor will have its own **device_id** built as "the_sensor_base_id" + "the_RPi_UID"

The RPi UID is taken from the *serial number* found in `/proc/cpuinfo`

For example if RPi serial is "00000000c9591b74", then le light sensor will have the following device_id: "light_lvl_00000000c9591b74"

### Light sensor Tept5700

Light level is measured using TEPT5700 ambient light sensor, datasheet is available here: http://www.vishay.com/docs/81321/tept5700.pdf

The light level acquisition is done using a 12bits DAC (MCP3208) through SPI bus

Device ID: "light_lvl_" + RPi base ID 

State published in Kuzzle:
``` 
{ 
    "level": light_level
}
```
*light_level* is the measured light level in *almost* Lux.  
*light_level* in a **float**

### NFC

An PN532 NFC/RFID module is used to read RFID cards, connected to UART '/dev/serial0'

Device ID: "NFC_" + RPi base ID 

State published in Kuzzle:
```javascript 
{
    "card_id": "12AADDCCD",  // The hexadecimal ID of the RFID sensed tag/card 
    "in_field": True/False   // True if the card is entering the field, False if leaving
}
```

### Buttons

4 buttons are connected to GPIOS [6, 13, 19, 26]

Device ID: "buttons_" + RPi base ID 

State published in Kuzzle:
```javascript 
{
    "button_0": "BTN_STATE",
    "button_1": "BTN_STATE",
    "button_2": "BTN_STATE",
    "button_3": "BTN_STATE",
}
```
With **BTN_STATE** in \["PRESSED", "RELEASED"]

### Motion sensor

A motion sensor is connected to GPIO 5

Device ID: "motion_" + RPi base ID 

State published in Kuzzle:
```javascript 
{
    "motion": True/False   // True when mouvment is detect, False when no more
}
```

## Configure

There is a webserver that allow configuring the multi-sensor, for now allow configure the host and port where to find Kuzzle.
The webserver is accessible through [http://kuzzle-sensor.local](http://kuzzle-sensor.local/)

There is also a dashboard that allow visualising the state of the sensor. 
The dashboard is using Kuzzle JS SDK available here: 
https://github.com/kuzzleio/sdk-javascript and uses the data recorded on Kuzzle to display the dashboard