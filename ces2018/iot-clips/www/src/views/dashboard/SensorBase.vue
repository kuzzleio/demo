<template lang="pug">
</template>



<script>

import Vue from 'vue';
import { EventBus } from '../../event-bus.js';
import config from '../../config/config.json';

export default {
    name: 'SensorBase',
    data() {
        var eventHandlers = {},
            previousState = false,
            currentState = {};

        return {
            eventHandlers: eventHandlers,
            previousState: previousState,
            currentState: currentState,
            config: config
        }
    },
    mounted: function() {
        var self= this;

        this.$nextTick(function() {
            self.eventHandlers = {}

            self.eventHandlers['newState_'+self.sensorType()] = self.newState;

            // Register Events
            for (var key in self.eventHandlers) {
              EventBus.$on(key, self.eventHandlers[key]);
            }
        });
    },
    methods : {
        sensorType() {
            return 'RFID_reader';
        },
        newState(state) {
            var self = this;
            self.previousState = Object.assign({},self.currentState);
            self.currentState = state;
        }
    },
    destroyed: function(){
        var self = this;
        //remove event listener
        for (var key in self.eventHandlers) {
            EventBus.$off(key, self.eventHandlers[key]);
        }
    }
}

</script>