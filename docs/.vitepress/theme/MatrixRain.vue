<template>
  <canvas v-if="isHome && isDark" ref="canvasRef" class="matrix-canvas" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useData } from 'vitepress'

const { page, isDark } = useData()
const canvasRef = ref(null)

const isHome = computed(() => page.value.frontmatter.layout === 'home')

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const FONT_SIZE = 14
const COLOR = '#42d392'
const DIM_COLOR = 'rgba(0,0,0,0.05)'

let animId = null
let cols = []

function initCanvas(canvas) {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const count = Math.floor(canvas.width / FONT_SIZE)
  cols = Array.from({ length: count }, () => Math.random() * -100)
}

function draw(canvas, ctx) {
  ctx.fillStyle = DIM_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = COLOR
  ctx.font = `${FONT_SIZE}px monospace`

  for (let i = 0; i < cols.length; i++) {
    const char = CHARS[Math.floor(Math.random() * CHARS.length)]
    const x = i * FONT_SIZE
    const y = cols[i] * FONT_SIZE

    // Brightest (head) character
    ctx.fillStyle = '#ffffff'
    ctx.fillText(char, x, y)

    // Trail
    ctx.fillStyle = COLOR
    ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y - FONT_SIZE)

    if (y > canvas.height && Math.random() > 0.975) {
      cols[i] = 0
    }
    cols[i] += 0.5
  }
}

let resizeObserver = null

onMounted(() => {
  if (!isHome.value || !isDark.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  initCanvas(canvas)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  function loop() {
    draw(canvas, ctx)
    animId = requestAnimationFrame(loop)
  }
  loop()

  function onResize() {
    if (!canvas) return
    initCanvas(canvas)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  window.addEventListener('resize', onResize)
  resizeObserver = { destroy: () => window.removeEventListener('resize', onResize) }
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  resizeObserver?.destroy()
})
</script>

<style scoped>
.matrix-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 0.18;
}
</style>
