<template>
  <div class="app">
    <AppHeader/>
    <div class="app-body">
      <Sidebar :navItems="nav"/>
      <main class="main">
        <div class="container-fluid">
          <router-view></router-view>
        </div>
      </main>
      <aside class="aside-menu">
        <Remote/>
      </aside>
    </div>
    <AppFooter/>
  </div>
</template>

<script>
import nav from '../_nav'
import { Header as AppHeader, Sidebar, Remote, Footer as AppFooter, Breadcrumb } from '../components/'

export default {
  name: 'full',
  components: {
    AppHeader,
    Sidebar,
    Remote,
    AppFooter,
    Breadcrumb
  },
  data () {
    return {
      nav: nav.items
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
