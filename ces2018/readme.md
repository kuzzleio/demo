# CES 2018 IoT Demo Apps 

Kuzzle's CES IoT Demo is composed of 4 components :

* 1 Web App devloped using VueJS
* 1 ReactNative iOS App (should work on Android too but we focused on iOS for the CES)
* The IoT physical board running on a Raspberry Pi
* Kuzzle server (see iot-clips)

## IoT Board Raspeberry code (rpi-kuzzle-multi-sensor)

Unfortunately, you won't be able to run this code unless you build the IoT Board using the same sensors and actuators. However this can help you building your own.

see rpi-kuzzle-multi-sensor/readme.md

## Webb App (iot-clips) + Kuzzle

Kuzzle configuration is included in iot-clips folder. You can start Kuzzle and web application using the included docker-compose file (will run the latest build).

IoT Clips web app is working without the Board. It is able to "simulate" board events uning a remote feature : http://localhost/#/remote.

## React Native App (kuzzle-multi-sensor-app)

This is a basic react native app after eject. You will need X Code to build the iOS version of it.





