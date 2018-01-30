<template lang="pug">
  .card
    .card-body.p-3.clearfix
          i.fa.fa-sun-o.p-3.font-2xl.mr-3.float-left(v-bind:class="{'bg-secondary':(currentState.level<lightThreshold),'bg-warning':(currentState.level>=lightThreshold)}" v-on:click="newLightSensorThreshold()")
          .h5.text-info.mb-0.mt-2 Luminosity
          .text-muted.text-uppercase.font-weight-bold.font-xs {{ Math.round(currentState.level) }} Lux
          .progress.progress-xs.my-3
            .progress-bar(v-bind:style="{width: progress+'%'}" v-bind:class="{'bg-secondary':(currentState.level<lightThreshold),'bg-warning':(currentState.level>=lightThreshold)}")
</template>

<script>
import SensorBase from './SensorBase';
import { EventBus } from '../../event-bus.js';
import config from '../../config/config.json';

export default {
    extends : SensorBase,
    name: 'Light',
    data() {
        var lightThreshold = config.sensors.light.threshold;

        return {
            lightThreshold: lightThreshold
        }
    },
    computed: {
        progress : function() {
            return Math.floor(Math.min(this.currentState.level/300,1)*100);
        }
    },
    methods : {
        sensorType() {
            return 'light_sensor';
        },
        newLightSensorThreshold() {
            this.lightThreshold = parseInt(prompt("Set light sensor threshold",this.lightThreshold));
            EventBus.$emit("newLightSensorThreshold",this.lightThreshold);
        }
    }
}

</script>