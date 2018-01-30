<template>
    <router-view></router-view>
</template>

<script>

import Vue from 'vue';
import Kuzzle from 'kuzzle-sdk';
import { EventBus } from './event-bus.js';
import config from './config/config.json';


export default {
  name: 'app',
   data() {
        var kuzzle = new Kuzzle(config.kuzzle.server?config.kuzzle.server:location.hostname),
            collections = {},
            subscribeRooms = {},
            eventHandlers = {},
            latestEvent = null,
            currentScene = false,
            autoPlay = false,
            autoPlayStep = 0,
            deviceStates = {},
            board = null,
            colorRampMode = "cycle",//or color-ramp
            lightSensorThreshold = config.sensors.light.threshold;

        Object.keys(config.kuzzle.collections).forEach( key => {
            collections[key] = kuzzle.collection(config.kuzzle.collections[key],config.kuzzle.index);
        });

        return {
            config: config,
            kuzzle: kuzzle,
            collections: collections,
            subscribeRooms: subscribeRooms,
            eventHandlers: eventHandlers,
            latestEvent: latestEvent,
            currentScene: currentScene,
            autoPlay: autoPlay,
            autoPlayStep: autoPlayStep,
            deviceStates: deviceStates,
            board: board,
            colorRampMode: colorRampMode,
            lightSensorThreshold: lightSensorThreshold
        }
    },
    mounted: function() {
        var self= this;

        this.$nextTick(function() {

            self.eventHandlers = {
                //Device Events
                ready : (board) => {self.board = board;self.loadData();self.subscribeToEvents()},
                publishEvent: self.publishEvent,
                playscene: self.setCurrentScene,
                autoPlayStartStop : self.startStopAutoplay,
                newLightSensorThreshold : self.newLightSensorThreshold,
                changeColorRampMode : self.changeColorRampDefaultMode
            }

            // Register Events
            for (var key in self.eventHandlers) {
              EventBus.$on(key, self.eventHandlers[key]);
            }
            
            //Prompt for 
            EventBus.$emit('ready',prompt("Please provide board ID", config.defaultBoardID));            
        });
    },
    created: function() {
    },
    methods : {

        /**
         * loadData
         * load deviced & positions
         */
        loadData() {

        },

        subscribeToEvents() {
            var self=this;

            //Remote
            if (self.$route.name=="Remote") return;//no subscribe for remote

            //unsubscribe if needed
            if (self.subscribeRooms.events) self.subscribeRooms.events.unsubscribe();

            self.collections.state.subscribe({regexp:{device_id:'.*'+self.board+'$'}},{subscribeToSelf:true,scope:'in'},(err,result)=> {
                if (result.document) {
                    //if in autoplay mode we ignore inputs from physical device or buttons
                    //TODO : except button_0 that stops autoplay
                    if (self.autoPlay && !result.document.content.autoplay){
                        if (result.document.content.device_type=="button" && result.document.content.state.button_0=="PRESSED") {
                            //manual reset : we stop autoplay
                            self.autoPlay = false;
                            EventBus.$emit('autoplay_stopped');
                        } else {
                            //if event does not come from auto play then ignore
                            return;
                        }
                    } else if (result.document.content.autoplay) {
                        //do know yet what to do....
                    }

                    

                    var doc = result.document,
                        deviceId = doc.content.device_id,
                        previousState = (self.deviceStates[deviceId])?self.deviceStates[deviceId]:false,
                        newState = self.deviceStates[deviceId] =  doc.content.state;

                    EventBus.$emit('newState_'+doc.content.device_type,newState);


                    // -- CLIPS --
                    switch(doc.content.device_type) {
                        case "RFID_reader":
                            var cardConfig = config.sensors.nfc.cards[newState.card_id];
                            if (!cardConfig) break;
                            if (self.currentScene=="outdoor_waiting" && newState.in_field) {
                                if (cardConfig.previousScene) {
                                    if (cardConfig.previousScene == self.currentScene) {
                                        if (cardConfig.scene) EventBus.$emit('playscene',cardConfig.scene);
                                    
                                    }
                                }
                            }

                            if (cardConfig.color) {
                                EventBus.$emit("videoBackgroundColor",cardConfig.color);
                                self.changeLightsColor(cardConfig.color);
                            }

                        break;
                        case "motion-sensor":
                            if (self.currentScene=="outdoor_night_light_on" && !newState.motion) {
                                EventBus.$emit('playscene','outdoor_night_light_off');
                            } else if (self.currentScene=="outdoor_night_light_off" && newState.motion) {
                                EventBus.$emit('playscene','outdoor_night_light_on');
                            }
                        break;
                        case "button":
                            for (var i=0,max=4;i<max;i++) {
                                if (newState["button_"+i]=="PRESSED") {
                                    EventBus.$emit('playscene',config.sensors.buttons["button_"+i]);
                                    break;
                                }
                            }
                        break;
                        case "light_sensor":
                            if (self.currentScene && self.currentScene.indexOf('inside')==0) {
                                if (self.currentScene=="inside_close_shutter" && newState.level >= self.lightSensorThreshold) {
                                    EventBus.$emit('playscene','inside_open_shutter');
                                } else if (self.currentScene=="inside" && newState.level < self.lightSensorThreshold) {
                                    EventBus.$emit('playscene','inside_close_shutter');
                                }
                            }
                        break;
                    }                 
                }
            }).onDone((err,room)=> {
                self.subscribeRooms['events'] = room;
                //Restart scene
                EventBus.$emit('publishEvent','restart');
                self.setLightsToDefault();
            });
        },


        newLightSensorThreshold(value) {
            var self=this;
            self.lightSensorThreshold = value;
            console.debug("new light thresold "+self.lightSensorThreshold);
        },


        /**
         * an event is composed of multiple messages to Kuzzle
         * a next_in parameters allow to wait before next message is sent
         * see config.json events
         */
        publishEvent(event,step) {
            var self=this,
                currentStep = step?step:0,
                messages = config.events[event]?config.events[event]:false;
            
            if (!messages) return;

            //if autoplay, check current autoplay status and loop if needed
            if (event=='autoplay') {
                if (!self.autoPlay) return;
                if (currentStep>=messages.length) currentStep=0;
            } else if (currentStep>=messages.length) {
                 return;
            }

            //add autoplay = true if autoplay mode
            var message = Vue.util.extend({}, config.messages[messages[currentStep].message]);
            if (event=='autoplay') message.autoplay = true;
            if (message.device_id) message.device_id = message.device_id+self.board;

            self.collections.state.publishMessage(message);

            //if next_in set timeout otherwise continue
            if (messages[currentStep].next_in) {
                setTimeout(() => { self.publishEvent(event,currentStep+1) },messages[currentStep].next_in);
            } else {
                self.publishEvent(event,currentStep+1);
            }
        },

        startStopAutoplay() {
            var self = this;
            if (self.autoPlay) {
                self.autoPlay = false;
                EventBus.$emit('publishEvent','restart');
            } else {
                self.autoPlay = true;
                EventBus.$emit('autoplay_started');
                EventBus.$emit('publishEvent','autoplay');
            }
        },

        changeLightsColor(color) {
            //nothing yet
            var self=this;
            self.collections.state.createDocument({
                device_id: 'rgb_light_'+self.board,
                partial_state: false,
                state : {
                    on: true,
                    mode: "single-color",
                    color: color
                },
                device_type: 'neopixel-linear'
            });

            setTimeout(self.setLightsToDefault,1000);
        },

        setLightsToDefault() {
            let self=this;


            if (self.colorRampMode=="off") {
                self.collections.state.createDocument({
                    device_id: 'rgb_light_'+self.board,
                    partial_state: false,
                    state : {
                        on: false,
                    },
                    device_type: 'neopixel-linear'
                })
            } else {
                self.collections.state.createDocument({
                    device_id: 'rgb_light_'+self.board,
                    partial_state: false,
                    state : {
                        on: true,
                        mode: self.colorRampMode,
                        ramp: config.colorRamp.defaultColors
                    },
                    device_type: 'neopixel-linear'
                })
                console.log({
                    device_id: 'rgb_light_'+self.board,
                    partial_state: false,
                    state : {
                        on: true,
                        mode: self.colorRampMode,
                        ramp: config.colorRamp.defaultColors
                    },
                    device_type: 'neopixel-linear'
                });
            }
        },


        setCurrentScene(scene) {
            this.currentScene = scene;
        },

        changeColorRampDefaultMode() {
            let self=this,
                modes=["off","color-ramp","cycle"];

                

            this.colorRampMode = modes[(modes.indexOf(this.colorRampMode)+1)%modes.length];
            this.setLightsToDefault();
            console.log(this.colorRampMode)
        }
        
    },
    destroyed: function(){
        var self = this;
        //remove event listener
        /*$.each(self.eventHandlers, (key,handler) => {
            EventBus.$off(key, handler);
        });
    
        //Unscubscribe
        $.each(Object.keys(self.subscribeRooms), key => {
            if (self.subscribeRooms[key]) self.subscribeRooms[key].unsubscribe();
        });*/
        
    }

}
</script>

<style>
  /* Import Font Awesome Icons Set */
  $fa-font-path: '~font-awesome/fonts/';
  @import '~font-awesome/css/font-awesome.min.css';
  /* Import Simple Line Icons Set */
  $simple-line-font-path: '~simple-line-icons/fonts/';
  @import '~simple-line-icons/css/simple-line-icons.css';
  /* Import Bootstrap Vue Styles */
  @import '~bootstrap-vue/dist/bootstrap-vue.css';
</style>
<style lang="scss">
  // Import Main styles for this application
  @import './scss/style';
</style>
