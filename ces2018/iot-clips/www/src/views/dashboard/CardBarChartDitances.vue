<script>
import { Bar, mixins } from 'vue-chartjs'
import Vue from 'vue'

export default {
  extends: Bar,
  props: ['height','distance'],
  data() {
    var dataset =   {
        label: 'Distance during 30 sec',
        backgroundColor: 'rgba(255,255,255,.3)',
        borderColor: 'transparent',
        data: [0]
    },
    chartData = {labels:[''],datasets: [dataset]},
    latestDistance = 0;
    return {
        chartData: chartData,
        latestDistance: latestDistance
    }
  },
  mounted () {
    var self=this;

    self.$nextTick(() => {
        self.renderChart(self.chartData, {
        maintainAspectRatio: false,
        legend: {
            display: false
        },
        scales: {
            xAxes: [{
            display: false,
            categoryPercentage: 1,
            barPercentage: 0.5
            }],
            yAxes: [{
            display: false
            }]
        }
        });      

            //Update distance chart every 30s
            setInterval(function() {

                var diff = self.distance -  self.latestDistance;
                self.latestDistance = self.distance;

                self.$data._chart.data.labels.push('')
                self.$data._chart.data.datasets[0].data.push(diff);

                if (self.$data._chart.data.datasets[0].data.length>10) {
                    self.$data._chart.data.labels.shift();
                    self.$data._chart.data.datasets[0].data.shift();
                }

                self.$data._chart.update();
            },10000);

    });


  }
}
</script>