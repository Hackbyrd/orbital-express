<template>
  <canvas v-if="isHome" ref="canvasRef" class="home-bg-canvas" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useData } from 'vitepress'

const { page, isDark } = useData()
const canvasRef = ref(null)
const isHome = computed(() => page.value.frontmatter.layout === 'home')

let animId = null
let w = 0, h = 0
let cleanupFns = []

// ═══════════════════════════════════════════════════════════════════════════
//  DARK MODE — Space (stars + galaxies + black hole + asteroids + comets)
// ═══════════════════════════════════════════════════════════════════════════
const STAR_COUNT     = 260
const ASTEROID_COUNT = 5
const MAX_COMETS     = 3
const GALAXY_COUNT   = 3
const PARALLAX       = [8, 20, 38]

let targetMx = 0,  targetMy = 0
let currentMx = 0, currentMy = 0
let stars = [], asteroids = [], comets = [], nextCometAt = 200
let blackHole = null
let galaxies  = []

// ── Stars ──────────────────────────────────────────────────────────────────
function mkStar() {
  const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2
  const baseR = [0.35, 0.75, 1.4][layer]
  return {
    x: Math.random() * w, y: Math.random() * h,
    r: baseR + Math.random() * baseR * 0.6,
    layer,
    phase:      Math.random() * Math.PI * 2,
    twinkleSpd: 0.012 + Math.random() * 0.025,
    baseAlpha:  0.45 + Math.random() * 0.55,
  }
}

// ── Asteroids ──────────────────────────────────────────────────────────────
function mkAsteroid() {
  const size  = 7 + Math.random() * 18
  const sides = 6 + Math.floor(Math.random() * 4)
  const verts = Array.from({ length: sides }, (_, i) => ({
    a: (i / sides) * Math.PI * 2,
    r: size * (0.7 + Math.random() * 0.3),
  }))
  const speed = 0.12 + Math.random() * 0.22
  const angle = Math.random() * Math.PI * 2
  return {
    x: Math.random() * w, y: Math.random() * h,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.004,
    verts, size,
    alpha: 0.25 + Math.random() * 0.35,
  }
}

// ── Comets ─────────────────────────────────────────────────────────────────
function mkComet() {
  const fromTop = Math.random() < 0.65
  const speed   = 5 + Math.random() * 5
  const spread  = 0.35
  let x, y, angle
  if (fromTop) { x = Math.random() * w * 0.8; y = -8; angle = Math.PI / 4 + (Math.random() - 0.5) * spread }
  else         { x = -8; y = Math.random() * h * 0.6; angle = (Math.random() - 0.5) * spread }
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, tail: [], maxTail: 28 + Math.floor(Math.random() * 18), done: false }
}

// ── Galaxies ───────────────────────────────────────────────────────────────
const GALAXY_PALETTES = [
  { core: [200, 185, 255], mid: [120,  90, 220], outer: [55, 35, 140] },  // blue-purple spiral
  { core: [255, 195, 210], mid: [205, 100, 140], outer: [95, 38, 75]  },  // rose-pink
  { core: [255, 235, 170], mid: [200, 160,  75], outer: [95, 65, 28]  },  // golden elliptical
  { core: [175, 240, 255], mid: [ 75, 185, 220], outer: [28, 75, 130] },  // cyan-blue
  { core: [255, 200, 255], mid: [180, 100, 205], outer: [75, 38, 115] },  // violet-rose
]

function mkGalaxy() {
  return {
    x:       80 + Math.random() * (w - 160),
    y:       80 + Math.random() * (h - 160),
    size:    40 + Math.random() * 35,
    rot:     Math.random() * Math.PI,
    tilt:    0.28 + Math.random() * 0.44,
    palette: GALAXY_PALETTES[Math.floor(Math.random() * GALAXY_PALETTES.length)],
    twist:   Math.random() * Math.PI * 0.6,
    alpha:   0.55 + Math.random() * 0.35,
  }
}

function drawGalaxy(ctx, g) {
  const { x, y, size, rot, tilt, palette, alpha, twist } = g
  const [cr, cg, cb] = palette.core
  const [mr, mg, mb] = palette.mid
  const [or, og, ob] = palette.outer

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)

  // Outer diffuse halo
  ctx.save()
  ctx.scale(1, tilt * 0.55)
  const halo = ctx.createRadialGradient(0, 0, size * 0.15, 0, 0, size * 1.7)
  halo.addColorStop(0,   `rgba(${mr},${mg},${mb},${(alpha * 0.22).toFixed(3)})`)
  halo.addColorStop(0.5, `rgba(${or},${og},${ob},${(alpha * 0.08).toFixed(3)})`)
  halo.addColorStop(1,   `rgba(${or},${og},${ob},0)`)
  ctx.beginPath()
  ctx.arc(0, 0, size * 1.7, 0, Math.PI * 2)
  ctx.fillStyle = halo
  ctx.fill()
  ctx.restore()

  // Spiral arm layers — 3 rotated flat ellipses for multicolour dust bands
  for (let i = 0; i < 3; i++) {
    ctx.save()
    ctx.rotate(twist + i * (Math.PI * 2 / 3))
    ctx.scale(1, tilt * (0.22 + i * 0.07))
    const arm = ctx.createRadialGradient(0, 0, size * 0.04, 0, 0, size * 0.92)
    arm.addColorStop(0,   `rgba(${cr},${cg},${cb},${(alpha * (0.32 - i * 0.07)).toFixed(3)})`)
    arm.addColorStop(0.4, `rgba(${mr},${mg},${mb},${(alpha * (0.18 - i * 0.04)).toFixed(3)})`)
    arm.addColorStop(1,   `rgba(${or},${og},${ob},0)`)
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.92, 0, Math.PI * 2)
    ctx.fillStyle = arm
    ctx.fill()
    ctx.restore()
  }

  // Bright core
  ctx.save()
  ctx.scale(1, tilt * 0.65)
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.28)
  core.addColorStop(0,   `rgba(${cr},${cg},${cb},${(alpha * 0.90).toFixed(3)})`)
  core.addColorStop(0.45,`rgba(${cr},${cg},${cb},${(alpha * 0.50).toFixed(3)})`)
  core.addColorStop(1,   `rgba(${mr},${mg},${mb},0)`)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = core
  ctx.fill()
  ctx.restore()

  ctx.restore()
}

// ── Black Hole ─────────────────────────────────────────────────────────────
function mkBlackHole() {
  const margin = 170
  const r = 52 + Math.random() * 38
  return {
    x: margin + Math.random() * (w - margin * 2),
    y: margin + Math.random() * (h - margin * 2),
    r,
    haloPhase:    Math.random() * Math.PI * 2,
    hotAngle:     Math.random() * Math.PI * 2,  // Doppler hotspot orbit angle
  }
}

// Draw the accretion disk rings (called twice: once clipped to back, once to front)
function drawDisk(ctx, diskRx, diskRy, bh) {
  // Rings from outer (cool, dim) to inner (hot, bright)
  const rings = [
    { f: 0.97, lw: 0.14, col: [138, 36,  5],  a: 0.28 },
    { f: 0.86, lw: 0.12, col: [195, 65, 11],  a: 0.46 },
    { f: 0.76, lw: 0.10, col: [248,112, 20],  a: 0.61 },
    { f: 0.67, lw: 0.09, col: [255,152, 36],  a: 0.72 },
    { f: 0.58, lw: 0.08, col: [255,190, 62],  a: 0.80 },
    { f: 0.50, lw: 0.07, col: [255,222,106],  a: 0.86 },
    { f: 0.43, lw: 0.06, col: [255,242,172],  a: 0.91 },
    { f: 0.37, lw: 0.05, col: [255,252,222],  a: 0.95 },
  ]
  for (const rg of rings) {
    ctx.beginPath()
    ctx.ellipse(0, 0, diskRx * rg.f, diskRy * rg.f, 0, 0, Math.PI * 2)
    const [r, g, b] = rg.col
    ctx.strokeStyle = `rgba(${r},${g},${b},${rg.a})`
    ctx.lineWidth   = diskRx * rg.lw
    ctx.stroke()
  }

  // Relativistic Doppler hotspot — bright blob orbiting slowly
  const hx = diskRx * 0.60 * Math.cos(bh.hotAngle)
  const hy = diskRy * 0.60 * Math.sin(bh.hotAngle)
  ctx.save()
  ctx.scale(1, diskRy / diskRx)
  const hot = ctx.createRadialGradient(hx, hx * (diskRy / diskRx), 0, hx, hx * (diskRy / diskRx), diskRx * 0.50)
  hot.addColorStop(0,    'rgba(255,255,238,0.62)')
  hot.addColorStop(0.28, 'rgba(255,230,155,0.36)')
  hot.addColorStop(0.65, 'rgba(255,175, 55,0.14)')
  hot.addColorStop(1,    'rgba(255,115, 18,0.00)')
  ctx.beginPath()
  ctx.arc(0, 0, diskRx, 0, Math.PI * 2)
  ctx.fillStyle = hot
  ctx.fill()
  ctx.restore()
}

function drawBlackHole(ctx, bh) {
  const { x, y, r } = bh

  // Advance animations
  bh.hotAngle   += 0.0007   // very slow hotspot orbit
  bh.haloPhase  += 0.009

  const diskRx    = r * 2.65
  const diskRy    = r * 0.40
  const pulse     = 0.85 + 0.15 * Math.sin(bh.haloPhase)

  ctx.save()
  ctx.translate(x, y)

  // 1. Outer diffuse glow — pulsing orange halo
  const outerGlow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 6.2)
  outerGlow.addColorStop(0,    `rgba(255,145,30,${(0.20 * pulse).toFixed(3)})`)
  outerGlow.addColorStop(0.30, `rgba(210, 88,14,${(0.08 * pulse).toFixed(3)})`)
  outerGlow.addColorStop(0.65, `rgba(140, 48, 5,${(0.03 * pulse).toFixed(3)})`)
  outerGlow.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(0, 0, r * 6.2, 0, Math.PI * 2)
  ctx.fillStyle = outerGlow
  ctx.fill()

  // 2. Far side of disk — top half (behind the event horizon)
  ctx.save()
  ctx.beginPath()
  ctx.rect(-diskRx * 1.6, -diskRy * 7, diskRx * 3.2, diskRy * 7)
  ctx.clip()
  drawDisk(ctx, diskRx, diskRy, bh)
  ctx.restore()

  // 3. Event horizon — perfectly black
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = '#000000'
  ctx.fill()

  // 4. Near side of disk — bottom half (in front of event horizon)
  ctx.save()
  ctx.beginPath()
  ctx.rect(-diskRx * 1.6, 0, diskRx * 3.2, diskRy * 7)
  ctx.clip()
  drawDisk(ctx, diskRx, diskRy, bh)
  ctx.restore()

  // 5. Photon ring — thin bright ring at innermost stable orbit
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.09, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255,218,108,${(0.68 * pulse).toFixed(3)})`
  ctx.lineWidth   = r * 0.055
  ctx.stroke()

  // 6. Einstein lensing arc — bent light from back of disk arching over the top
  ctx.save()
  ctx.beginPath()
  ctx.rect(-diskRx * 1.6, -diskRy * 7, diskRx * 3.2, 0)  // top half only
  ctx.clip()
  ctx.beginPath()
  ctx.ellipse(0, 0, diskRx * 0.80, diskRy * 1.05, 0, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255,192,65,${(0.30 * pulse).toFixed(3)})`
  ctx.lineWidth   = r * 0.075
  ctx.stroke()
  ctx.restore()

  ctx.restore()
}

// ── initDark ───────────────────────────────────────────────────────────────
function initDark() {
  targetMx = 0; targetMy = 0; currentMx = 0; currentMy = 0
  stars     = Array.from({ length: STAR_COUNT },     () => mkStar())
  asteroids = Array.from({ length: ASTEROID_COUNT }, () => mkAsteroid())
  comets    = []; nextCometAt = 200
  blackHole = mkBlackHole()
  galaxies  = Array.from({ length: GALAXY_COUNT },   () => mkGalaxy())
}

// ── drawDark ───────────────────────────────────────────────────────────────
function drawDark(ctx, frame) {
  ctx.clearRect(0, 0, w, h)
  currentMx += (targetMx - currentMx) * 0.06
  currentMy += (targetMy - currentMy) * 0.06

  // Galaxies — deepest background
  for (const g of galaxies) drawGalaxy(ctx, g)

  // Stars — with mouse parallax
  for (const s of stars) {
    const px = s.x + currentMx * PARALLAX[s.layer]
    const py = s.y + currentMy * PARALLAX[s.layer]
    const twinkle = 0.5 + 0.5 * Math.sin(frame * s.twinkleSpd + s.phase)
    const alpha   = s.baseAlpha * (0.45 + 0.55 * twinkle)
    ctx.beginPath()
    ctx.arc(px, py, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
    ctx.fill()
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

  // Black hole — sits in the scene, occluding stars behind it
  drawBlackHole(ctx, blackHole)

  // Asteroids
  for (const a of asteroids) {
    a.x += a.vx; a.y += a.vy; a.rot += a.rotSpeed
    if (a.x < -a.size * 3) a.x = w + a.size * 2
    if (a.x > w + a.size * 3) a.x = -a.size * 2
    if (a.y < -a.size * 3) a.y = h + a.size * 2
    if (a.y > h + a.size * 3) a.y = -a.size * 2
    ctx.save()
    ctx.translate(a.x, a.y); ctx.rotate(a.rot)
    ctx.beginPath()
    for (let i = 0; i < a.verts.length; i++) {
      const v = a.verts[i]
      i === 0 ? ctx.moveTo(Math.cos(v.a) * v.r, Math.sin(v.a) * v.r)
              : ctx.lineTo(Math.cos(v.a) * v.r, Math.sin(v.a) * v.r)
    }
    ctx.closePath()
    ctx.fillStyle   = `rgba(88,78,68,${(a.alpha * 0.35).toFixed(3)})`
    ctx.strokeStyle = `rgba(170,150,130,${a.alpha.toFixed(3)})`
    ctx.lineWidth = 1; ctx.fill(); ctx.stroke()
    ctx.restore()
  }

  // Comets
  if (frame >= nextCometAt && comets.filter(c => !c.done).length < MAX_COMETS) {
    comets.push(mkComet())
    nextCometAt = frame + 240 + Math.floor(Math.random() * 360)
  }
  comets = comets.filter(c => !c.done)
  for (const c of comets) {
    c.tail.push({ x: c.x, y: c.y })
    if (c.tail.length > c.maxTail) c.tail.shift()
    c.x += c.vx; c.y += c.vy
    if (c.x > w + 120 || c.y > h + 120 || c.x < -120 || c.y < -120) c.done = true
    if (c.tail.length < 2) continue
    for (let i = 1; i < c.tail.length; i++) {
      const p = i / c.tail.length
      ctx.beginPath()
      ctx.moveTo(c.tail[i - 1].x, c.tail[i - 1].y)
      ctx.lineTo(c.tail[i].x, c.tail[i].y)
      ctx.strokeStyle = `rgba(190,215,255,${(p * 0.75).toFixed(3)})`
      ctx.lineWidth   = p * 2.2; ctx.stroke()
    }
    const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 10)
    grd.addColorStop(0, 'rgba(220,235,255,0.7)'); grd.addColorStop(1, 'rgba(100,160,255,0)')
    ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
    ctx.beginPath(); ctx.arc(c.x, c.y, 1.8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill()
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIGHT MODE — Warp speed (streaks + bloom + solar wind particles)
// ═══════════════════════════════════════════════════════════════════════════
const STREAK_COUNT   = 130
const PARTICLE_COUNT = 85
const WARP_COLORS = [
  [215, 170,  45],
  [ 80, 190, 210],
  [150, 130, 215],
  [235, 150,  65],
  [180, 215, 235],
]

let targetVpX  = 0.44, targetVpY  = 0.42
let currentVpX = 0.44, currentVpY = 0.42
let streaks = [], particles = []

function mkStreak(spread = false) {
  const maxDist = Math.sqrt(w * w + h * h) * 0.6
  return {
    angle:  Math.random() * Math.PI * 2,
    dist:   spread ? Math.random() * maxDist * 0.55 : Math.random() * maxDist * 0.04,
    speed:  1.8 + Math.random() * 4.5,
    color:  WARP_COLORS[Math.floor(Math.random() * WARP_COLORS.length)],
    alpha:  0.13 + Math.random() * 0.27,
    maxLen: 18 + Math.random() * 55,
  }
}

function mkParticle() {
  return {
    x: Math.random() * w, y: Math.random() * h,
    size: 0.7 + Math.random() * 1.6,
    vx: 0.25 + Math.random() * 0.45, vy: 0.1 + Math.random() * 0.25,
    alpha: 0.08 + Math.random() * 0.22,
    r: 205 + Math.floor(Math.random() * 35),
    g: 135 + Math.floor(Math.random() * 45),
    b:  25 + Math.floor(Math.random() * 30),
  }
}

function initLight() {
  targetVpX = 0.44; targetVpY = 0.42; currentVpX = 0.44; currentVpY = 0.42
  streaks   = Array.from({ length: STREAK_COUNT },   () => mkStreak(true))
  particles = Array.from({ length: PARTICLE_COUNT }, () => mkParticle())
}

function drawLight(ctx) {
  ctx.clearRect(0, 0, w, h)
  currentVpX += (targetVpX - currentVpX) * 0.05
  currentVpY += (targetVpY - currentVpY) * 0.05
  const vpx = currentVpX * w
  const vpy = currentVpY * h
  const maxDist = Math.sqrt(w * w + h * h) * 0.6

  let grd = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, 160)
  grd.addColorStop(0, 'rgba(255,235,140,0.20)'); grd.addColorStop(0.45, 'rgba(255,210,80,0.07)'); grd.addColorStop(1, 'rgba(255,190,40,0.00)')
  ctx.beginPath(); ctx.arc(vpx, vpy, 160, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()

  grd = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, 36)
  grd.addColorStop(0, 'rgba(255,255,230,0.50)'); grd.addColorStop(1, 'rgba(255,240,160,0.00)')
  ctx.beginPath(); ctx.arc(vpx, vpy, 36, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()

  for (const s of streaks) {
    s.dist += s.speed
    if (s.dist > maxDist) {
      s.dist = Math.random() * maxDist * 0.03; s.angle = Math.random() * Math.PI * 2
      s.speed = 1.8 + Math.random() * 4.5; s.alpha = 0.13 + Math.random() * 0.27
      s.maxLen = 18 + Math.random() * 55; s.color = WARP_COLORS[Math.floor(Math.random() * WARP_COLORS.length)]
    }
    const len = Math.min(s.dist * 0.28, s.maxLen), tailDist = Math.max(0, s.dist - len)
    const hx = vpx + Math.cos(s.angle) * s.dist, hy = vpy + Math.sin(s.angle) * s.dist
    const tx = vpx + Math.cos(s.angle) * tailDist, ty = vpy + Math.sin(s.angle) * tailDist
    const alpha = s.alpha * Math.min(1, (maxDist - s.dist) / (maxDist * 0.18)) * Math.min(1, s.dist / (maxDist * 0.06))
    if (alpha <= 0.005) continue
    const [r, g, b] = s.color
    grd = ctx.createLinearGradient(tx, ty, hx, hy)
    grd.addColorStop(0, `rgba(${r},${g},${b},0)`); grd.addColorStop(1, `rgba(${r},${g},${b},${alpha.toFixed(3)})`)
    ctx.lineWidth = 0.8 + (s.dist / maxDist) * 1.8; ctx.strokeStyle = grd
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke()
  }

  for (const p of particles) {
    p.x += p.vx; p.y += p.vy
    if (p.x > w + 4) p.x = -4; if (p.y > h + 4) p.y = -4
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.alpha})`; ctx.fill()
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Mouse handlers
// ═══════════════════════════════════════════════════════════════════════════
function onMouseDark(e) {
  targetMx = e.clientX / window.innerWidth  - 0.5
  targetMy = e.clientY / window.innerHeight - 0.5
}
function onMouseLight(e) {
  const nx = e.clientX / window.innerWidth, ny = e.clientY / window.innerHeight
  targetVpX = 0.37 + nx * 0.15; targetVpY = 0.33 + ny * 0.16
}

// ═══════════════════════════════════════════════════════════════════════════
//  Start / restart
// ═══════════════════════════════════════════════════════════════════════════
function startAnimation(canvas, dark) {
  if (animId) { cancelAnimationFrame(animId); animId = null }
  cleanupFns.forEach(fn => fn()); cleanupFns = []

  w = canvas.width  = window.innerWidth
  h = canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)

  let frame = 0
  if (dark) {
    initDark()
    const loop = () => { drawDark(ctx, frame++); animId = requestAnimationFrame(loop) }
    loop()
    window.addEventListener('mousemove', onMouseDark)
    cleanupFns.push(() => window.removeEventListener('mousemove', onMouseDark))
  } else {
    initLight()
    const loop = () => { drawLight(ctx); animId = requestAnimationFrame(loop) }
    loop()
    window.addEventListener('mousemove', onMouseLight)
    cleanupFns.push(() => window.removeEventListener('mousemove', onMouseLight))
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Lifecycle
// ═══════════════════════════════════════════════════════════════════════════
let resizeHandler = null

onMounted(() => {
  if (!isHome.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  resizeHandler = () => startAnimation(canvas, isDark.value)
  window.addEventListener('resize', resizeHandler)
  startAnimation(canvas, isDark.value)
  watch(isDark, dark => startAnimation(canvas, dark))
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  cleanupFns.forEach(fn => fn())
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<style scoped>
.home-bg-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}
</style>
