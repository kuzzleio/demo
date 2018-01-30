<template>
  <Remote/>
</template>

<script>
import nav from '../_nav'
import { Remote } from '../components/'

export default {
  name: 'light',
  components: {
    Remote
  },
  data () {
    return {
      
    }
  },
  computed: {
    name () {
      return this.$route.name
    },
    list () {
      return this.$route.matched
    }
  }
}
</script>
