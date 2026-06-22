<template>
  <canvas v-if="isHome && !isDark" ref="canvasRef" class="warp-canvas" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useData } from 'vitepress'

const { page, isDark } = useData()
const canvasRef = ref(null)
const isHome = computed(() => page.value.frontmatter.layout === 'home')

// ── Config ─────────────────────────────────────────────────────────────────
const STREAK_COUNT   = 130
const PARTICLE_COUNT = 85

// Warp streak colors — pale enough to feel luminous on white
const COLORS = [
  [215, 170,  45],   // warm gold
  [ 80, 190, 210],   // pale cyan
  [150, 130, 215],   // soft lavender
  [235, 150,  65],   // amber
  [180, 215, 235],   // icy blue
]

let animId   = null
let w = 0, h = 0

// Vanishing point — follows mouse smoothly
let targetVpX  = 0.44, targetVpY  = 0.42
let currentVpX = 0.44, currentVpY = 0.42

let streaks   = []
let particles = []

// ── Warp streaks ───────────────────────────────────────────────────────────
function mkStreak(initialSpread = false) {
  const maxDist = Math.sqrt(w * w + h * h) * 0.6
  return {
    angle:  Math.random() * Math.PI * 2,
    dist:   initialSpread ? Math.random() * maxDist * 0.55 : Math.random() * maxDist * 0.04,
    speed:  1.8 + Math.random() * 4.5,
    color:  COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha:  0.13 + Math.random() * 0.27,
    maxLen: 18 + Math.random() * 55,
  }
}

// ── Solar wind particles ───────────────────────────────────────────────────
function mkParticle() {
  return {
    x:     Math.random() * w,
    y:     Math.random() * h,
    size:  0.7 + Math.random() * 1.6,
    vx:    0.25 + Math.random() * 0.45,
    vy:    0.1  + Math.random() * 0.25,
    alpha: 0.08 + Math.random() * 0.22,
    r: 205 + Math.floor(Math.random() * 35),
    g: 135 + Math.floor(Math.random() * 45),
    b:  25 + Math.floor(Math.random() * 30),
  }
}

// ── Bloom glow at vanishing point ─────────────────────────────────────────
function drawBloom(ctx, vpx, vpy) {
  // Outer warm halo
  let grd = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, 160)
  grd.addColorStop(0,    'rgba(255,235,140,0.20)')
  grd.addColorStop(0.45, 'rgba(255,210, 80,0.07)')
  grd.addColorStop(1,    'rgba(255,190, 40,0.00)')
  ctx.beginPath()
  ctx.arc(vpx, vpy, 160, 0, Math.PI * 2)
  ctx.fillStyle = grd
  ctx.fill()

  // Bright inner core
  grd = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, 36)
  grd.addColorStop(0, 'rgba(255,255,230,0.50)')
  grd.addColorStop(1, 'rgba(255,240,160,0.00)')
  ctx.beginPath()
  ctx.arc(vpx, vpy, 36, 0, Math.PI * 2)
  ctx.fillStyle = grd
  ctx.fill()
}

// ── Main draw ──────────────────────────────────────────────────────────────
function draw(ctx) {
  ctx.clearRect(0, 0, w, h)

  // Smooth lerp VP toward mouse
  currentVpX += (targetVpX - currentVpX) * 0.05
  currentVpY += (targetVpY - currentVpY) * 0.05

  const vpx     = currentVpX * w
  const vpy     = currentVpY * h
  const maxDist = Math.sqrt(w * w + h * h) * 0.6

  drawBloom(ctx, vpx, vpy)

  // Warp streaks
  for (const s of streaks) {
    s.dist += s.speed

    if (s.dist > maxDist) {
      // Reset near center with fresh params
      s.dist   = Math.random() * maxDist * 0.03
      s.angle  = Math.random() * Math.PI * 2
      s.speed  = 1.8 + Math.random() * 4.5
      s.alpha  = 0.13 + Math.random() * 0.27
      s.maxLen = 18 + Math.random() * 55
      s.color  = COLORS[Math.floor(Math.random() * COLORS.length)]
    }

    // Streak length grows with distance (perspective — things stretch as you accelerate)
    const len      = Math.min(s.dist * 0.28, s.maxLen)
    const tailDist = Math.max(0, s.dist - len)

    const hx = vpx + Math.cos(s.angle) * s.dist
    const hy = vpy + Math.sin(s.angle) * s.dist
    const tx = vpx + Math.cos(s.angle) * tailDist
    const ty = vpy + Math.sin(s.angle) * tailDist

    // Fade in from center, fade out at screen edge
    const edgeFade   = Math.min(1, (maxDist - s.dist) / (maxDist * 0.18))
    const centerFade = Math.min(1, s.dist / (maxDist * 0.06))
    const alpha      = s.alpha * edgeFade * centerFade
    if (alpha <= 0.005) continue

    const [r, g, b] = s.color
    const grd = ctx.createLinearGradient(tx, ty, hx, hy)
    grd.addColorStop(0, `rgba(${r},${g},${b},0)`)
    grd.addColorStop(1, `rgba(${r},${g},${b},${alpha.toFixed(3)})`)

    // Thicker streaks further from center (depth cue)
    ctx.lineWidth   = 0.8 + (s.dist / maxDist) * 1.8
    ctx.strokeStyle = grd
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(hx, hy)
    ctx.stroke()
  }

  // Solar wind particles
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.x > w + 4) p.x = -4
    if (p.y > h + 4) p.y = -4

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.alpha})`
    ctx.fill()
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
let cleanupFns = []

onMounted(() => {
  if (!isHome.value || isDark.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  function resize() {
    w = canvas.width  = window.innerWidth
    h = canvas.height = window.innerHeight
    streaks   = Array.from({ length: STREAK_COUNT },   () => mkStreak(true))
    particles = Array.from({ length: PARTICLE_COUNT }, () => mkParticle())
  }

  resize()

  function loop() {
    draw(ctx)
    animId = requestAnimationFrame(loop)
  }
  loop()

  function onMouse(e) {
    // VP drifts toward cursor but stays near center (subtle steering)
    const nx  = e.clientX / window.innerWidth
    const ny  = e.clientY / window.innerHeight
    targetVpX = 0.37 + nx * 0.15   // 0.37–0.52
    targetVpY = 0.33 + ny * 0.16   // 0.33–0.49
  }

  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMouse)
  cleanupFns = [
    () => window.removeEventListener('resize', resize),
    () => window.removeEventListener('mousemove', onMouse),
  ]
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  cleanupFns.forEach(fn => fn())
})
</script>

<style scoped>
.warp-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}
</style>
