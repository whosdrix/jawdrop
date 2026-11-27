import {
  addProgram,
  all,
  backdrop,
  createGL,
  createSwap,
  createTarget,
  type Destroy,
  fitCanvas,
  floatType,
  hexToRgb,
  loop,
  type Pass,
  pass,
  pointer,
  prefersReducedMotion,
  releaseGL,
  type Target,
} from '../lib'

export interface FluidCursorOptions {
  /** Dye colors. The stream blends from one to the next as the pointer travels. */
  colors?: string[]
  /** Width of the stream. */
  radius?: number
  /** How hard the pointer pushes the fluid. */
  force?: number
  /** How eagerly the fluid curls into vortices. */
  swirl?: number
  /** Seconds the dye takes to fade away. */
  fade?: number
  /** Splash a few swirls of dye when the element first appears. */
  burst?: boolean
  /** Draw above the content instead of behind it. */
  overlay?: boolean
  /** Longest side of the dye texture in pixels. Lower is softer and faster. */
  detail?: number
}

const HEAD = `uniform sampler2D a,b;uniform vec2 px,q,m,n;uniform vec3 c;uniform float k,dt;
#define T(s,x,y) texture2D(s,uv+vec2(x,y)*px)
void main(){vec2 uv=gl_FragCoord.xy*px;`

const SHOW = `${HEAD.replace('*px;', '*q;')}
vec3 o=T(a,0,0).rgb;
float x=length(T(a,1,0).rgb-T(a,-1,0).rgb),y=length(T(a,0,1).rgb-T(a,0,-1).rgb);
vec3 nn=normalize(vec3(x,y,.35));
o*=.72+.28*nn.z;
o+=pow(max(dot(nn,normalize(vec3(-.5,.6,.62))),0.),24.)*min(1.,(x+y)*3.)*.5;
float al=max(o.r,max(o.g,o.b));
gl_FragColor=vec4(o/max(al,1e-4),1.-exp(-al*2.2));}`

const PASSES = [
  'gl_FragColor=texture2D(b,uv-dt*texture2D(a,uv).xy*q)*k;}',
  `vec2 l=T(a,-1,0).xy,r=T(a,1,0).xy,d=T(a,0,-1).xy,u=T(a,0,1).xy;
gl_FragColor=vec4(.5*(r.x-l.x+u.y-d.y),r.y-l.y-u.x+d.x,0,1);}`,
  `vec2 f=vec2(abs(T(b,0,1).y)-abs(T(b,0,-1).y),abs(T(b,-1,0).y)-abs(T(b,1,0).y));
f=f/(length(f)+1e-4)*k*T(b,0,0).y;
gl_FragColor=vec4(clamp(T(a,0,0).xy+f*dt,-1e3,1e3),0,1);}`,
  'gl_FragColor=vec4((T(a,-1,0).x+T(a,1,0).x+T(a,0,-1).x+T(a,0,1).x-T(b,0,0).x)*.25);}',
  `vec2 e=min(uv,1.-uv)/px;
gl_FragColor=vec4((T(a,0,0).xy-vec2(T(b,1,0).x-T(b,-1,0).x,T(b,0,1).x-T(b,0,-1).x))*min(1.,min(e.x,e.y)*.4),0,1);}`,
  `vec2 e=vec2(px.y/px.x,1.),p=(uv-m)*e,s=(n-m)*e;
p-=s*clamp(dot(p,s)/max(dot(s,s),1e-6),0.,1.);
gl_FragColor=vec4(T(a,0,0).xyz+c*exp(-dot(p,p)/k),1);}`,
]

export function fluidCursor(el: HTMLElement, options: FluidCursorOptions = {}): Destroy {
  const {
    colors = ['#ff2e63', '#ff9a3c', '#f9f871', '#21e6c1', '#3d7bff', '#b53dff'],
    radius = 1,
    force = 1,
    swirl = 1,
    fade = 2.5,
    burst = true,
    overlay = false,
    detail = 512,
  } = options
  if (prefersReducedMotion()) return () => {}
  const canvas = document.createElement('canvas')
  const remove = backdrop(el, canvas)
  if (overlay) canvas.style.zIndex = '1'
  const made = createGL(canvas, SHOW)
  if (!made) return remove
  const { gl } = made
  const float = floatType(gl)
  const passes = PASSES.map((f) => pass(gl, addProgram(gl, HEAD + f)))
  const show = pass(gl, made.program)
  if (!float || !show || passes.includes(null)) {
    releaseGL(gl)
    return remove
  }
  const [advect, curlDiv, vorticity, pressure, gradient, splat] = passes as [
    Pass,
    Pass,
    Pass,
    Pass,
    Pass,
    Pass,
  ]
  const palette = colors.map(hexToRgb)

  type Swap = ReturnType<typeof createSwap>
  let vel: Swap | undefined
  let prs: Swap | undefined
  let dye: Swap | undefined
  let tmp: Target | undefined
  let spx = [1, 1]
  let dpx = [1, 1]
  const stopFit = fitCanvas(
    canvas,
    (w, h) => {
      const size = (long: number) => {
        const k = long / Math.max(w, h, 1)
        return [Math.max(2, Math.round(w * k)), Math.max(2, Math.round(h * k))] as const
      }
      const [sw, sh] = size(128)
      const [dw, dh] = size(detail)
      vel?.free()
      prs?.free()
      dye?.free()
      if (tmp) gl.deleteTexture(tmp.tex)
      if (tmp) gl.deleteFramebuffer(tmp.fbo)
      vel = createSwap(gl, sw, sh, ...float)
      prs = createSwap(gl, sw, sh, float[0], gl.NEAREST)
      dye = createSwap(gl, dw, dh, ...float)
      tmp = createTarget(gl, sw, sh, float[0], gl.NEAREST)
      spx = [1 / sw, 1 / sh]
      dpx = [1 / dw, 1 / dh]
    },
    1,
  )

  let hue = 0
  const ink = (gain: number) => {
    const i = Math.floor(hue) % palette.length
    const a = palette[i] as number[]
    const b = palette[(i + 1) % palette.length] as number[]
    const f = hue % 1
    return a.map((v, j) => (v + ((b[j] as number) - v) * f) * gain)
  }
  const drop = (x0: number, y0: number, x1: number, y1: number, gain: number) => {
    if (!vel || !dye) return
    const m = [x0, 1 - y0]
    const n = [x1, 1 - y1]
    const push = [(x1 - x0) * 3200 * force, (y0 - y1) * 3200 * force, 0]
    const k = 0.0016 * radius
    splat({ a: vel.read.tex, px: spx, m, n, c: push, k }, vel.write)
    vel.swap()
    splat({ a: dye.read.tex, px: dpx, m, n, c: ink(gain), k }, dye.write)
    dye.swap()
  }

  let idle = !burst
  let last = 0
  let started = false
  let from: number[] | null = null
  let to: number[] | null = null

  const frame = (time: number, delta: number) => {
    if (!vel || !prs || !dye || !tmp) return
    if (burst && !started) {
      started = true
      last = time
      for (let i = 0; i < 5; i++) {
        const x = 0.2 + Math.random() * 0.6
        const y = 0.25 + Math.random() * 0.5
        const a = Math.random() * 6.28
        hue += 1.3
        drop(x, y, x + Math.cos(a) * 0.03, y + Math.sin(a) * 0.03, 0.9)
      }
    }
    if (from && to && (from[0] !== to[0] || from[1] !== to[1])) {
      const d = Math.hypot(
        (to[0] as number) - (from[0] as number),
        (to[1] as number) - (from[1] as number),
      )
      hue += d * 2.5
      drop(from[0] as number, from[1] as number, to[0] as number, to[1] as number, 0.45)
      from = to
      idle = false
      last = time
    }
    if (idle) return
    const dt = delta / 1000
    curlDiv({ a: vel.read.tex, px: spx }, tmp)
    vorticity({ a: vel.read.tex, b: tmp.tex, px: spx, k: 13 * swirl, dt }, vel.write)
    vel.swap()
    curlDiv({ a: vel.read.tex, px: spx }, tmp)
    for (let i = 0; i < 16; i++) {
      pressure({ a: prs.read.tex, b: tmp.tex, px: spx }, prs.write)
      prs.swap()
    }
    gradient({ a: vel.read.tex, b: prs.read.tex, px: spx }, vel.write)
    vel.swap()
    advect(
      { a: vel.read.tex, b: vel.read.tex, px: spx, q: spx, dt, k: 1 / (1 + 0.6 * dt) },
      vel.write,
    )
    vel.swap()
    advect(
      { a: vel.read.tex, b: dye.read.tex, px: dpx, q: spx, dt, k: 1 / (1 + (3 * dt) / fade) },
      dye.write,
    )
    dye.swap()
    if (time - last > fade * 2600) {
      idle = true
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.clear(gl.COLOR_BUFFER_BIT)
    } else show({ a: dye.read.tex, px: dpx, q: [1 / canvas.width, 1 / canvas.height] })
  }

  return all(
    remove,
    stopFit,
    pointer(
      el,
      (x, y) => {
        to = [x, y]
        from ??= to
      },
      () => {
        from = to = null
      },
    ),
    loop(el, frame),
    () => releaseGL(gl),
  )
}
