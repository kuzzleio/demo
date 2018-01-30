<script>
import { Line, mixins } from 'vue-chartjs'
import Vue from 'vue'

export default {
  extends: Line,
  props: ['height','alerts'],
  data() {
    var dataset =   {
        label: '',
        backgroundColor: 'red',
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
  watch : {
      alerts : function(val) {
        var self=this;

        if (!self.$data._chart) return;
        self.$data._chart.data.labels.push('')
        self.$data._chart.data.datasets[0].data.push(val);

        if (self.$data._chart.data.datasets[0].data.length>10) {
            self.$data._chart.data.labels.shift();
            self.$data._chart.data.datasets[0].data.shift();
        }

        self.$data._chart.update();
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
          gridLines: {
            color: 'transparent',
            zeroLineColor: 'transparent'
          },
          ticks: {
            fontSize: 2,
            fontColor: 'transparent'
          }
        }],
        yAxes: [{
          display: false,
          ticks: {
            display: false,
            min: 0,
            max: 6
          }
        }]
      },
      elements: {
        line: {
          borderWidth: 1
        },
        point: {
          radius: 4,
          hitRadius: 10,
          hoverRadius: 4
        }
      }
    });      

    });


  }
}
</script>