<template lang="pug">
  .card
    .card-body.p-3.clearfix
          i.icons.icon-energy.p-3.font-2xl.mr-3.float-left(v-bind:class="{'bg-secondary':!currentState.motion,'bg-success':currentState.motion}")
          .h5.text-info.mb-0.mt-2 Motion
          .text-muted.text-uppercase.font-weight-bold.font-xs {{currentState.motion?'Yes':'No'}}
</template>

<script>
import SensorBase from './SensorBase';

export default {
    extends : SensorBase,
    name: 'Motion',
    methods : {
        sensorType() {
            return 'motion-sensor';
        }
    }
}

</script>