import DefaultTheme from 'vitepress/theme'
import MatrixRain from './MatrixRain.vue'
import './custom.css'
import { h } from 'vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(MatrixRain),
    })
  },
}
