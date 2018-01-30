<template lang="pug">
  .card
    .card-body.p-3.clearfix
          i.icons.icon-bulb.p-3.font-2xl.mr-3.float-left(v-bind:class="{'bg-secondary':(!currentState.on),'bg-warning':(currentState.on)}" v-on:click="changeDefaultMode()")
          .h5.text-info.mb-0.mt-2 Color ramp
          .text-muted.text-uppercase.font-weight-bold.font-xs {{currentState.on?'On':'Off'}}
            span(v-if="currentState.on && currentState.mode")  - {{currentState.mode}}
          .progress.progress-xs.my-3
            .progress-bar(v-for="color in colors" v-bind:style="{width: color[0]+'%','background-color':color[1]}")
</template>

<script>
import SensorBase from './SensorBase';
import { EventBus } from '../../event-bus.js';
import config from '../../config/config.json';

export default {
    extends : SensorBase,
    name: 'ColorRamp',
    data() {
        var lightThreshold = config.sensors.light.threshold;

        return {
            lightThreshold: lightThreshold
        }
    },
    computed: {
        colors : function() {
            if (!this.currentState.on) return [];
            if (!this.currentState.mode) return [];
            if (this.currentState.mode=="single-color") return [[100,this.currentState.color]];

            //array
            var percent = (100/this.currentState.ramp.length).toFixed(2);
            var result = [];
            for (var i=0,l=this.currentState.ramp.length;i<l;i++) {
                result.push([percent,"rgb("+this.currentState.ramp[i][0]+","+this.currentState.ramp[i][1]+","+this.currentState.ramp[i][2]+")"]);
            }
            return result;
        }
    },
    methods : {
        sensorType() {
            return 'neopixel-linear';
        },
        changeDefaultMode() {
            console.log('click')
            EventBus.$emit("changeColorRampMode");
        }
    }
}

</script>