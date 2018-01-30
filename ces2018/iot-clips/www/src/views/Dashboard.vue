<template lang="pug">
  .animated.fadeIn

    .row
      .col-md-2
        RFID
        Light
        Motion
        Buttons
        ColorRamp
      .col-md-10
        IotVideo
            

</template>

<script>
import Vue from 'vue';
import Kuzzle from 'kuzzle-sdk';
import { EventBus } from '../event-bus.js';
import config from '../config/config.json';
import CardBarChartDitances from './dashboard/CardBarChartDitances'
import CardLineChartAlerts from './dashboard/CardLineChartAlerts'
import IotVideo from './dashboard/IotVideo'
import RFID from './dashboard/RFID'
import Light from './dashboard/Light'
import Motion from './dashboard/Motion'
import Buttons from './dashboard/Buttons'
import ColorRamp from './dashboard/ColorRamp'

export default {
  name: 'dashboard',
  components: {CardBarChartDitances,CardLineChartAlerts,IotVideo,RFID,Motion,Light,Buttons,ColorRamp},
  data() {
    return {}
  },
  mounted: function() {
        var self= this;
        this.$nextTick(function() {
        });
  },
  methods: {
  },
  destroyed: function(){
  }
}
</script>
