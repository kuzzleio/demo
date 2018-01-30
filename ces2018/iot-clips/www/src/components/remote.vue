<template lang="pug">
  
  #remote
      //i.material-icons(v-if="autoplay" v-on:click="startAutoplay()") play_arrow
      //i.material-icons(v-else v-on:click="stopAutoplay()") pause

      

      button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('restart')")
        i.fa.fa-history

      template(v-if="!autoplay")
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('card_ko')")
          i.fa.fa-shield.text-danger
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('card_ok')")
          i.fa.fa-shield.text-success
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('light_low')")
          i.fa.fa-moon-o
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('light_high')")
          i.fa.fa-sun-o
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('go_outside')")
          i.fa.fa-sign-out
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('motion')")
          i.icons.icon-energy
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('bike_alert')")
          i.fa.fa-bicycle
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="publishEvent('bank_demo')")
          i.fa.fa-credit-card
        button.btn.btn-lg.btn-block.btn-outline-secondary(v-on:click="startStopAutoplay" v-if="$route.name!='Remote'")
          i.fa.fa-play

</template>

<script>

import { EventBus } from '../event-bus.js';

export default {
  name: 'remote',
  data() {
    var autoplay=false;
    return {autoplay:autoplay}
  },
  mounted: function() {
      var self= this;

      this.$nextTick(function() {

          self.eventHandlers = {
            'autoplay_started': ()=> {self.autoplay=true},
            'autoplay_stopped': ()=> {self.autoplay=false}
          }

          // Register Events
          for (var key in self.eventHandlers) {
            EventBus.$on(key, self.eventHandlers[key]);
          }
           
      });
  },
  methods : {
    publishEvent(event) {
      EventBus.$emit('publishEvent',event);
    },
    startStopAutoplay() {
      EventBus.$emit('autoPlayStartStop');
    }
  }
}
</script>
