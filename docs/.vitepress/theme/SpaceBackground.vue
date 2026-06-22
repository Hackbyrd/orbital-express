<template>
  <canvas v-if="isHome && isDark" ref="canvasRef" class="space-canvas" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useData } from 'vitepress'

const { page, isDark } = useData()
const canvasRef = ref(null)
const isHome = computed(() => page.value.frontmatter.layout === 'home')

// ── Config ─────────────────────────────────────────────────────────────────
const STAR_COUNT    = 280
const ASTEROID_COUNT = 5
const MAX_COMETS    = 3

// Parallax strength per layer (px shift at max mouse offset)
const PARALLAX = [8, 20, 38]

let animId = null
let w = 0, h = 0

// Smooth mouse target (normalized -0.5 to 0.5)
let targetMx = 0, targetMy = 0
let currentMx = 0, currentMy = 0

let stars     = []
let asteroids = []
let comets    = []
let nextCometAt = 200 // frame number for next comet spawn

// ── Stars ──────────────────────────────────────────────────────────────────
function mkStar() {
  const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2
  const baseR = [0.35, 0.75, 1.4][layer]
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: baseR + Math.random() * baseR * 0.6,
    layer,
    phase:      Math.random() * Math.PI * 2,
    twinkleSpd: 0.012 + Math.random() * 0.025,
    baseAlpha:  0.45 + Math.random() * 0.55,
  }
}

// ── Asteroids ──────────────────────────────────────────────────────────────
function mkAsteroid(offscreen = false) {
  const size  = 7 + Math.random() * 18
  const sides = 6 + Math.floor(Math.random() * 4)
  // Irregular vertices: vary radius by ±30%
  const verts = Array.from({ length: sides }, (_, i) => ({
    a: (i / sides) * Math.PI * 2,
    r: size * (0.7 + Math.random() * 0.3),
  }))

  const speed = 0.12 + Math.random() * 0.22
  const angle = Math.random() * Math.PI * 2

  let x, y
  if (offscreen) {
    const edge = Math.floor(Math.random() * 4)
    if (edge === 0) { x = -size * 2;    y = Math.random() * h }
    else if (edge === 1) { x = w + size * 2; y = Math.random() * h }
    else if (edge === 2) { x = Math.random() * w; y = -size * 2 }
    else                 { x = Math.random() * w; y = h + size * 2 }
  } else {
    x = Math.random() * w
    y = Math.random() * h
  }

  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot:      Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.004,
    verts, size,
    alpha: 0.25 + Math.random() * 0.35,
  }
}

// ── Comets ─────────────────────────────────────────────────────────────────
function mkComet() {
  // Come from top or left edge, travel roughly toward bottom-right
  const fromTop = Math.random() < 0.65
  const speed   = 5 + Math.random() * 5
  const spread  = 0.35

  let x, y, angle
  if (fromTop) {
    x     = Math.random() * w * 0.8
    y     = -8
    angle = Math.PI / 4 + (Math.random() - 0.5) * spread
  } else {
    x     = -8
    y     = Math.random() * h * 0.6
    angle = (Math.random() - 0.5) * spread
  }

  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    tail:    [],
    maxTail: 28 + Math.floor(Math.random() * 18),
    done:    false,
  }
}

// ── Draw ───────────────────────────────────────────────────────────────────
function draw(ctx, frame) {
  ctx.clearRect(0, 0, w, h)

  // Smooth lerp mouse toward target
  currentMx += (targetMx - currentMx) * 0.06
  currentMy += (targetMy - currentMy) * 0.06

  // ── Stars ────────────────────────────────────────────────────────────────
  for (const s of stars) {
    const px = s.x + currentMx * PARALLAX[s.layer]
    const py = s.y + currentMy * PARALLAX[s.layer]

    const twinkle = 0.5 + 0.5 * Math.sin(frame * s.twinkleSpd + s.phase)
    const alpha   = s.baseAlpha * (0.45 + 0.55 * twinkle)

    ctx.beginPath()
    ctx.arc(px, py, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
    ctx.fill()

    // Cross sparkle on the larger stars when they peak
    if (s.layer === 2 && twinkle > 0.82) {
      const arm = s.r * 2.8
      ctx.strokeStyle = `rgba(180,210,255,${(alpha * 0.45).toFixed(3)})`
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(px - arm, py); ctx.lineTo(px + arm, py)
      ctx.moveTo(px, py - arm); ctx.lineTo(px, py + arm)
      ctx.stroke()
    }
  }

  // ── Asteroids ────────────────────────────────────────────────────────────
  for (const a of asteroids) {
    a.x += a.vx
    a.y += a.vy
    a.rot += a.rotSpeed

    // Wrap
    if (a.x < -a.size * 3) a.x = w + a.size * 2
    if (a.x > w + a.size * 3) a.x = -a.size * 2
    if (a.y < -a.size * 3) a.y = h + a.size * 2
    if (a.y > h + a.size * 3) a.y = -a.size * 2

    ctx.save()
    ctx.translate(a.x, a.y)
    ctx.rotate(a.rot)

    ctx.beginPath()
    for (let i = 0; i < a.verts.length; i++) {
      const v = a.verts[i]
      const x = Math.cos(v.a) * v.r
      const y = Math.sin(v.a) * v.r
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()

    ctx.fillStyle   = `rgba(88,78,68,${(a.alpha * 0.35).toFixed(3)})`
    ctx.strokeStyle = `rgba(170,150,130,${a.alpha.toFixed(3)})`
    ctx.lineWidth   = 1
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // ── Comets ───────────────────────────────────────────────────────────────
  for (const c of comets) {
    c.tail.push({ x: c.x, y: c.y })
    if (c.tail.length > c.maxTail) c.tail.shift()

    c.x += c.vx
    c.y += c.vy

    if (c.x > w + 120 || c.y > h + 120 || c.x < -120 || c.y < -120) {
      c.done = true
    }

    if (c.tail.length < 2) continue

    // Tail — drawn segment by segment, fading toward start
    for (let i = 1; i < c.tail.length; i++) {
      const p = i / c.tail.length
      ctx.beginPath()
      ctx.moveTo(c.tail[i - 1].x, c.tail[i - 1].y)
      ctx.lineTo(c.tail[i].x, c.tail[i].y)
      ctx.strokeStyle = `rgba(190,215,255,${(p * 0.75).toFixed(3)})`
      ctx.lineWidth   = p * 2.2
      ctx.stroke()
    }

    // Head glow
    const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 10)
    grd.addColorStop(0, 'rgba(220,235,255,0.7)')
    grd.addColorStop(1, 'rgba(100,160,255,0)')
    ctx.beginPath()
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()

    ctx.beginPath()
    ctx.arc(c.x, c.y, 1.8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fill()
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
let cleanupFns = []

onMounted(() => {
  if (!isHome.value || !isDark.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  function resize() {
    w = canvas.width  = window.innerWidth
    h = canvas.height = window.innerHeight
    stars     = Array.from({ length: STAR_COUNT },    () => mkStar())
    asteroids = Array.from({ length: ASTEROID_COUNT }, () => mkAsteroid(false))
    comets    = []
    nextCometAt = 200
  }

  resize()

  let frame = 0
  function loop() {
    frame++

    // Spawn comet
    if (frame >= nextCometAt && comets.filter(c => !c.done).length < MAX_COMETS) {
      comets.push(mkComet())
      nextCometAt = frame + 240 + Math.floor(Math.random() * 360) // 4-10s at 60fps
    }
    comets = comets.filter(c => !c.done)

    draw(ctx, frame)
    animId = requestAnimationFrame(loop)
  }
  loop()

  function onMouse(e) {
    targetMx = e.clientX / window.innerWidth  - 0.5
    targetMy = e.clientY / window.innerHeight - 0.5
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
.space-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}
</style>
