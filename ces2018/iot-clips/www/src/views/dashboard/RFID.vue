<template lang="pug">
  .card
    .card-body.p-3.clearfix
          i.icons.icon-shield.p-3.font-2xl.mr-3.float-left(v-bind:class="classObject")
          .h5.text-info.mb-0.mt-2 RFID
          .text-muted.text-uppercase.font-weight-bold.font-xs(v-if="currentState.in_field") {{ currentState.card_id }}
          .text-muted.text-uppercase.font-weight-bold.font-xs(v-else) No card
</template>

<script>
import SensorBase from './SensorBase';

export default {
    extends : SensorBase,
    name: 'RFID',
    computed : {
        classObject : function() {
            if (this.currentState.in_field) {
                if (this.config.sensors.nfc.cards[this.currentState.card_id] && this.config.sensors.nfc.cards[this.currentState.card_id].valid) {
                    return {'bg-success':true};
                } 
                return {'bg-danger':true};
            }
            return {'bg-secondary':true};
        }
    },
    methods : {
        sensorType() {
            return 'RFID_reader';
        }
    }
}

</script>