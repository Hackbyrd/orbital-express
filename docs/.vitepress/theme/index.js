import DefaultTheme from 'vitepress/theme'
import SpaceBackground from './SpaceBackground.vue'
import WarpBackground from './WarpBackground.vue'
import './custom.css'
import { h } from 'vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => [h(SpaceBackground), h(WarpBackground)],
    })
  },
}
