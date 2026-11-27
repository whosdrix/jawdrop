import { all, type Destroy, imageGL, loop, pointer, prefersReducedMotion } from '../lib'

export interface RippleClickOptions {
  /** How far the shockwave bends what is under it, in CSS pixels. */
  strength?: number
  /** How fast the ring travels, in CSS pixels per second. */
  speed?: number
  /** Thickness of the ring, in CSS pixels. */
  width?: number
  /** Color fringing on the ring, 0 to 1. */
  chroma?: number
  /** Send a softer ripple when the pointer enters, not only on click. */
  hover?: boolean
  /**
   * URL of the picture to bend, such as the element's own background image. Without it the first
   * `<img>` inside the element is used, and without that the ring is drawn as light on top.
   */
  image?: string
  /** Pixels rendered per CSS pixel, up to the screen's density. */
  resolution?: number
}

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

const FRAG = `uniform vec3 w[6];uniform float k,c,s,z;
void main(){vec2 f=vec2(gl_FragCoord.x,r.y-gl_FragCoord.y),o=vec2(0);float h=0.;
for(int i=0;i<6;i++){vec2 d=f-w[i].xy;float a=mod(w[i].z,50.),l=length(d)+1e-3,x=(l-a*s)/(z*(1.+a*.8)),
p=exp(-x*x-a*.9)*(w[i].z<50.?1.:.4)*smoothstep(0.,.08,a);
o-=d/l*x*p*2.33;h+=p*(.25-x);}
o*=k;vec4 g=img((f+o)/r);
vec3 t=vec3(img((f+o*(1.+c))/r).r,g.g,img((f+o*(1.-c))/r).b)*(1.+h*.35)+max(h,0.)*.12;
gl_FragColor=vec4(mix(vec3(step(0.,h)),t,g.a),max(g.a,min(abs(h)*(h>0.?.5:.28),1.)));}`

export function rippleClick(el: HTMLElement, options: RippleClickOptions = {}): Destroy {
  const {
    strength = 20,
    speed = 520,
    width = 26,
    chroma = 0.4,
    hover = true,
    image,
    resolution = 2,
  } = options
  if (prefersReducedMotion()) return () => {}
  const overlay = !image && !el.querySelector('img')
  return imageGL(
    el,
    FRAG,
    resolution,
    (ctx) => {
      const canvas = ctx.gl.canvas as HTMLCanvasElement
      if (overlay) canvas.style.zIndex = '1'
      const rings = new Float32Array(18).fill(-1)
      const born: number[] = []
      let next = 0
      let now = 0
      let inside = false
      let idle = false
      const ring = (x: number, y: number, soft: boolean) => {
        const dpr = canvas.width / ctx.w
        rings[next * 3] = x * ctx.w * dpr
        rings[next * 3 + 1] = y * ctx.h * dpr
        born[next] = now - (soft ? 50000 : 0)
        next = (next + 1) % 6
        idle = false
      }
      const frame = (time: number) => {
        now = time
        if (idle) return
        idle = true
        for (let i = 0; i < 6; i++) {
          const age = (time - (born[i] ?? -1e6)) / 1000
          const live = age % 50 < 3.2 && age < 100
          rings[i * 3 + 2] = live ? age : -1
          if (live) idle = false
        }
        const dpr = canvas.width / ctx.w
        ctx.draw({ w: rings, k: strength * dpr, c: chroma, s: speed * dpr, z: width * dpr })
      }
      ctx.onResize = () => {
        if (!born.length) ring(0.5, 0.5, true)
        idle = false
      }
      return all(
        pointer(
          el,
          (x, y, e) => {
            if (e.type === 'pointerdown') ring(x, y, false)
            else if (hover && !inside) ring(x, y, true)
            inside = true
          },
          () => {
            inside = false
          },
        ),
        loop(el, frame),
      )
    },
    image ?? (overlay ? BLANK : undefined),
  )
}
