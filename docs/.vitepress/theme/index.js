import DefaultTheme from 'vitepress/theme'
import HomeBackground from './HomeBackground.vue'
import './custom.css'
import { h } from 'vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(HomeBackground),
    })
  },
}
