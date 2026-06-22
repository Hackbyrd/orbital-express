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
// core = bright nucleus colour, disk = bulge/inner disk, arms = outer star-forming regions
const GALAXY_PALETTES = [
  { core: [255,252,225], disk: [215,175, 82], arms: [155,200,255] },  // classic golden spiral, blue arms
  { core: [255,248,215], disk: [200,155, 72], arms: [195,222,255] },  // warm barred spiral
  { core: [238,248,255], disk: [148,178,218], arms: [205,232,255] },  // blue elliptical
  { core: [255,245,205], disk: [225,148, 58], arms: [255,192,138] },  // starburst/irregular, reddish arms
  { core: [255,252,238], disk: [198,188,148], arms: [175,212,255] },  // dusty barred spiral
]

function mkGalaxy() {
  // Random inclination: 0=face-on (circle), π/2=edge-on (thin lens)
  const incl   = Math.random() * Math.PI / 2
  const yScale = Math.max(0.06, Math.cos(incl))   // how squished vertically
  const edgeOn = incl > Math.PI * 0.38            // roughly 40% nearly edge-on
  // Spiral arms wind in the +theta direction (counter-clockwise in math coords,
  // which is clockwise on canvas). Positive rotSpeed spins in that same direction.
  // Edge-on galaxies (thin ellipse) don't visibly spin — only face-on/tilted ones do
  const rotSpeed = edgeOn ? 0 : (Math.PI * 2 / 300) * (Math.random() < 0.5 ? 1 : -1)
  return {
    x:        80 + Math.random() * (w - 160),
    y:        80 + Math.random() * (h - 160),
    size:     44 + Math.random() * 44,
    rot:      Math.random() * Math.PI * 2,         // current screen rotation (updated each frame)
    rotSpeed,
    yScale,
    edgeOn,
    palette:  GALAXY_PALETTES[Math.floor(Math.random() * GALAXY_PALETTES.length)],
    armBase:  Math.random() * Math.PI * 2,         // first arm start angle
    numArms:  Math.random() < 0.35 ? 4 : 2,
    alpha:    0.58 + Math.random() * 0.38,
    offscreen: null,   // filled by buildGalaxyOffscreens()
    offR:      0,
  }
}

function renderGalaxy(ctx, g) {
  // rot is applied externally (at draw time) so rotation animates without re-rendering
  const { size, yScale, palette, armBase, numArms, alpha, edgeOn } = g
  const [cr, cg, cb] = palette.core
  const [dr, dg, db] = palette.disk
  const [ar, ag, ab] = palette.arms

  ctx.save()
  ctx.scale(1, yScale)   // apply inclination squish

  if (edgeOn) {
    // ── Edge-on: elongated lens + bright bulge + dust lane ──────────────
    const lens = ctx.createRadialGradient(0, 0, size * 0.02, 0, 0, size * 0.92)
    lens.addColorStop(0,   `rgba(${cr},${cg},${cb},${(alpha*0.88).toFixed(3)})`)
    lens.addColorStop(0.18,`rgba(${dr},${dg},${db},${(alpha*0.65).toFixed(3)})`)
    lens.addColorStop(0.55,`rgba(${dr},${dg},${db},${(alpha*0.28).toFixed(3)})`)
    lens.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.beginPath(); ctx.arc(0, 0, size*0.92, 0, Math.PI*2)
    ctx.fillStyle = lens; ctx.fill()

    // Subtle dust lane through middle
    ctx.fillStyle = 'rgba(0,0,0,0.20)'
    ctx.fillRect(-size*0.88, -size*0.05, size*1.76, size*0.10)

  } else {
    // ── Face-on / tilted: disk + spiral arms ────────────────────────────

    // Outer disk / halo
    const disk = ctx.createRadialGradient(0, 0, size*0.06, 0, 0, size)
    disk.addColorStop(0,   `rgba(${dr},${dg},${db},${(alpha*0.52).toFixed(3)})`)
    disk.addColorStop(0.38,`rgba(${dr},${dg},${db},${(alpha*0.30).toFixed(3)})`)
    disk.addColorStop(0.72,`rgba(${ar},${ag},${ab},${(alpha*0.10).toFixed(3)})`)
    disk.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI*2); ctx.fillStyle = disk; ctx.fill()

    // Spiral arms — logarithmic spiral particle clouds
    // r = size * 0.10 * e^(b*θ), wound ~1.3 turns
    const B          = 0.26   // tightness (higher = tighter)
    const maxTheta   = Math.PI * 2.6
    const numClouds  = 68

    for (let arm = 0; arm < numArms; arm++) {
      const base = armBase + (arm / numArms) * Math.PI * 2
      for (let i = 0; i < numClouds; i++) {
        const t     = i / numClouds
        const theta = t * maxTheta
        const rr2   = size * 0.10 * Math.exp(B * theta)
        if (rr2 > size * 0.88) break
        const px    = rr2 * Math.cos(base + theta)
        const py    = rr2 * Math.sin(base + theta)

        // Blend from warm disk colour (inner) to blue-white arms (outer)
        const pR = Math.round(dr + t * (ar - dr))
        const pG = Math.round(dg + t * (ag - dg))
        const pB = Math.round(db + t * (ab - db))
        const cloudR = Math.max(1.5, size * (0.115 - t * 0.048))
        const cloudA = (alpha * (0.30 - t * 0.13)).toFixed(3)
        if (parseFloat(cloudA) <= 0.01) continue

        ctx.beginPath()
        ctx.arc(px, py, cloudR, 0, Math.PI*2)
        ctx.fillStyle = `rgba(${pR},${pG},${pB},${cloudA})`
        ctx.fill()
      }
    }
  }

  // ── Core bulge — always on top ──────────────────────────────────────────
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size*0.26)
  core.addColorStop(0,    `rgba(${cr},${cg},${cb},${(alpha*0.96).toFixed(3)})`)
  core.addColorStop(0.30, `rgba(${cr},${cg},${cb},${(alpha*0.68).toFixed(3)})`)
  core.addColorStop(0.70, `rgba(${dr},${dg},${db},${(alpha*0.35).toFixed(3)})`)
  core.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.beginPath(); ctx.arc(0, 0, size*0.26, 0, Math.PI*2); ctx.fillStyle = core; ctx.fill()

  // Nuclear point — tiny brilliant star-like centre
  ctx.beginPath(); ctx.arc(0, 0, size*0.028, 0, Math.PI*2)
  ctx.fillStyle = `rgba(${cr},${cg},${cb},${(alpha*0.98).toFixed(3)})`; ctx.fill()

  ctx.restore()
}

function buildGalaxyOffscreens() {
  // Render each galaxy's shape once to its own small canvas.
  // Rotation is applied at draw time (ctx.rotate) so spinning is free.
  for (const g of galaxies) {
    const pad = Math.ceil(g.size * 1.18)
    const dim = pad * 2
    const c   = document.createElement('canvas')
    c.width = c.height = dim
    const gctx = c.getContext('2d')
    gctx.translate(pad, pad)   // centre
    renderGalaxy(gctx, g)
    g.offscreen = c
    g.offR      = pad           // half-dimension for centering when drawing
  }
}

// ── Black Hole ─────────────────────────────────────────────────────────────
function mkBlackHole() {
  const margin = 170
  const r = 28 + Math.random() * 18
  return {
    x:          margin + Math.random() * (w - margin * 2),
    y:          margin + Math.random() * (h - margin * 2),
    r,
    diskTilt:   Math.random() * Math.PI,   // random orientation each page load
    haloPhase:  Math.random() * Math.PI * 2,
  }
}

function drawBlackHole(ctx, bh, mx = 0, my = 0) {
  const { x, y, r } = bh
  bh.haloPhase += 0.008
  const pulse  = 0.88 + 0.12 * Math.sin(bh.haloPhase)
  const diskRx = r * 3.5

  ctx.save()
  ctx.translate(x + mx * 12, y + my * 12)
  ctx.rotate(bh.diskTilt)

  // ── 1. Outer diffuse glow ──────────────────────────────────────────────
  const og = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 5.8)
  og.addColorStop(0,    `rgba(255,75,0,${(0.22*pulse).toFixed(3)})`)
  og.addColorStop(0.38, `rgba(155,18,0,${(0.07*pulse).toFixed(3)})`)
  og.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.beginPath(); ctx.arc(0, 0, r * 5.8, 0, Math.PI * 2)
  ctx.fillStyle = og; ctx.fill()

  // ── 2. Far-side lensed dome — behind shadow ────────────────────────────
  // Top-half ellipse arcs. Height ah = √(hw²−r²)×0.42 gives correct lensing
  // geometry: inner arcs barely rise above the shadow; outer arcs dome high.
  const N_TOP = 55
  for (let i = 0; i < N_TOP; i++) {
    const t  = i / (N_TOP - 1)
    const hw = r * (1.055 + t * 2.70)
    const ah = Math.sqrt(Math.max(0, hw * hw - r * r)) * 0.42
    const br = 1 - t * 0.82
    const cr = Math.round(82  + br * 173)
    const cg = Math.round(2   + br * 80)
    const ca = (0.07 + br * 0.58) * pulse
    ctx.beginPath()
    ctx.ellipse(0, 0, hw, ah, 0, Math.PI, 0, true)
    ctx.strokeStyle = `rgba(${cr},${cg},0,${ca.toFixed(3)})`
    ctx.lineWidth   = 0.55 + br * 1.30
    ctx.stroke()
  }

  // ── 3. Event horizon — clean circle, no distortion ────────────────────
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = '#000000'
  ctx.fill()

  // ── 4. Near-side disk — gradient fill, drawn ON TOP of shadow ─────────
  // Physically in front of the event horizon so drawn after it.
  // Rendered as a soft gradient-filled flat ellipse so it reads as a smooth
  // glowing disc crossing through the shadow, not harsh stroked lines.
  // The ellipse spans the full disk width; the linear vertical gradient peaks
  // near the equatorial plane (y ≈ 0) and fades to transparent at the edges.
  const dg = ctx.createLinearGradient(0, -r * 0.55, 0, r * 0.65)
  dg.addColorStop(0,    'rgba(0,0,0,0)')
  dg.addColorStop(0.18, `rgba(105,20,0,${(0.16*pulse).toFixed(3)})`)
  dg.addColorStop(0.40, `rgba(238,98,4,${(0.60*pulse).toFixed(3)})`)
  dg.addColorStop(0.54, `rgba(255,158,10,${(0.88*pulse).toFixed(3)})`)
  dg.addColorStop(0.68, `rgba(215,70,2,${(0.55*pulse).toFixed(3)})`)
  dg.addColorStop(0.86, `rgba(88,16,0,${(0.16*pulse).toFixed(3)})`)
  dg.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.ellipse(0, r * 0.05, diskRx, r * 0.60, 0, 0, Math.PI * 2)
  ctx.fillStyle = dg
  ctx.fill()

  // ── 5. Photon ring — clean circle just outside shadow ─────────────────
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.058, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255,120,8,${(0.72*pulse).toFixed(3)})`
  ctx.lineWidth   = r * 0.026
  ctx.stroke()

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
  buildGalaxyOffscreens()
}

// ── drawDark ───────────────────────────────────────────────────────────────
function drawDark(ctx, frame) {
  ctx.clearRect(0, 0, w, h)
  currentMx += (targetMx - currentMx) * 0.06
  currentMy += (targetMy - currentMy) * 0.06

  // Galaxies — pre-rendered shapes, rotated each frame + mouse parallax
  for (const g of galaxies) {
    if (!g.offscreen) continue
    g.rot += g.rotSpeed
    ctx.save()
    ctx.translate(g.x + currentMx * 4, g.y + currentMy * 4)
    ctx.rotate(g.rot)
    ctx.drawImage(g.offscreen, -g.offR, -g.offR)
    ctx.restore()
  }

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

  // Black hole — parallax between galaxies and stars
  drawBlackHole(ctx, blackHole, currentMx, currentMy)

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
