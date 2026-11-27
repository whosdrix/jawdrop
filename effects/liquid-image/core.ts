import {
  addProgram,
  all,
  createSwap,
  type Destroy,
  floatType,
  imageGL,
  loop,
  pass,
  pointer,
  prefersReducedMotion,
} from '../lib'

export interface LiquidImageOptions {
  /** How far the ripples bend the image. */
  strength?: number
  /** Color fringing on the wave fronts, 0 to 1. */
  chroma?: number
  /** Size of the dent the pointer makes. */
  radius?: number
  /** Random drops per second, for a surface that never rests. 0 turns them off. */
  rain?: number
  /** Pixels rendered per CSS pixel, up to the screen's density. */
  resolution?: number
}

const SIM = `uniform sampler2D a;uniform vec2 px,m,n;uniform float k,f;
void main(){vec2 uv=gl_FragCoord.xy*px,x=vec2(px.x,0),y=vec2(0,px.y);vec4 c=texture2D(a,uv);
float s=(texture2D(a,uv+x).r+texture2D(a,uv-x).r+texture2D(a,uv+y).r+texture2D(a,uv-y).r)*.5-c.g;
vec2 e=vec2(px.y/px.x,1.),p=(uv-m)*e,d=(n-m)*e;p-=d*clamp(dot(p,d)/max(dot(d,d),1e-6),0.,1.);
gl_FragColor=vec4(s*.986+f*exp(-dot(p,p)/k),c.r,0,1);}`

const FRAG = `uniform sampler2D a;uniform vec2 px;uniform float k,c;
void main(){vec2 uv=UV,x=vec2(px.x,0),y=vec2(0,px.y);
vec2 g=vec2(texture2D(a,uv+x).r-texture2D(a,uv-x).r,texture2D(a,uv+y).r-texture2D(a,uv-y).r)*22.;
float s=length(g),e=min(s*c,1.);vec2 d=-g*px*k;
vec3 o=vec3(img(uv+d*(1.+e)).r,img(uv+d).g,img(uv+d*(1.-e)).b);
float l=dot(g,vec2(-.6,-.8));
o*=1.+l*.45;
o+=vec3(.75,.85,1.)*(pow(max(dot(normalize(vec3(-g,1.)),normalize(vec3(-.45,-.6,.66))),0.),18.)*min(s*1.5,1.)*.5+max(l,0.)*.06);
gl_FragColor=vec4(o,1);}`

export function liquidImage(el: HTMLElement, options: LiquidImageOptions = {}): Destroy {
  const { strength = 1, chroma = 0.5, radius = 1, rain = 0, resolution = 2 } = options
  if (prefersReducedMotion()) return () => {}
  return imageGL(el, FRAG, resolution, (ctx) => {
    const { gl } = ctx
    const float = floatType(gl)
    const sim = pass(gl, addProgram(gl, SIM))
    let wave: ReturnType<typeof createSwap> | undefined
    let px = [1, 1]
    let from: number[] | null = null
    let to: number[] | null = null
    let last = -1
    let idle = false
    let extra = 0
    let wet = 0
    const show = () => ctx.draw({ a: wave?.read.tex ?? null, px, k: 4 * strength, c: chroma })
    const step = (m: number[], n: number[], f: number) => {
      if (!wave || !sim) return
      sim({ a: wave.read.tex, px, m, n, f, k: 0.0005 * radius * radius }, wave.write)
      wave.swap()
    }
    ctx.onResize = () => {
      const k = 256 / Math.max(ctx.w, ctx.h)
      const w = Math.max(2, Math.round(ctx.w * k))
      const h = Math.max(2, Math.round(ctx.h * k))
      wave?.free()
      wave = createSwap(gl, w, h, float?.[0], float?.[1])
      px = [1 / w, 1 / h]
      idle = false
    }
    if (!float || !sim) {
      ctx.onResize = () => {
        wave ??= createSwap(gl, 2, 2)
        show()
      }
      return () => {}
    }
    const frame = (time: number, delta: number) => {
      if (last < 0) {
        last = time
        step([0.5, 0.5], [0.5, 0.5], 0.5)
      }
      wet += (rain * delta) / 1000
      if (wet > 1) {
        wet = 0
        last = time
        idle = false
        const at = [Math.random(), Math.random()]
        step(at, at, 0.35)
      }
      const moved = from && to && (from[0] !== to[0] || from[1] !== to[1])
      if (moved) {
        last = time
        idle = false
      }
      if (idle) return
      extra = Math.min(extra + delta, 34)
      for (; extra >= 8; extra -= 8) {
        if (moved && from && to) step(from, to, extra >= 16 ? 0 : 0.07)
        else step([0, 0], [0, 0], 0)
      }
      if (moved) from = to
      show()
      idle = time - last > 6000
    }
    return all(
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
    )
  })
}
