<template lang="pug">
  .card
    .card-body.p-3.clearfix
          i.icons.icon-grid.p-3.font-2xl.mr-3.float-left(v-bind:class="{'bg-secondary':(pressed=='none'),'bg-success':(pressed!='none')}")
          .h5.text-info.mb-0.mt-2 Buttons
          .text-muted.text-uppercase.font-weight-bold.font-xs {{ pressed }}
</template>

<script>
import SensorBase from './SensorBase';

export default {
    extends : SensorBase,
    name: 'Buttons',
    computed: {
        pressed : function() {
            for (var i=0,max=4;i<max;i++) {
                if (this.currentState["button_"+i]=="PRESSED") {
                    return 'Button '+(i+1);
                }
            }
            return 'none';
        }
    },
    methods : {
        sensorType() {
            return 'button';
        }
    }
}

</script>