import { all, type Destroy, imageGL, loop, pointer, prefersReducedMotion } from '../lib'

export interface ChromaticHoverOptions {
  /** How far the colors pull apart. */
  split?: number
  /** How much the image wobbles while the pointer moves. */
  wobble?: number
  /** Reach of the distortion around the pointer, as a fraction of the image height. */
  radius?: number
  /** Pixels rendered per CSS pixel, up to the screen's density. */
  resolution?: number
}

const FRAG = `uniform vec2 p,v;uniform float k,t,s,w,q;
void main(){vec2 uv=UV,a=vec2(r.x/r.y,1.),d=(uv-p)*a;
float f=exp(-dot(d,d)/(q*q)),e=k*(.3+.7*f);
vec2 x=uv-v*f*1.4+e*w*.007*vec2(sin(uv.y*26.+t*9.),cos(uv.x*21.+t*7.));
vec2 o=(v*4.+d/a*k*f*.25)*s*(.35+f);
vec3 c=vec3(0),n=vec3(0),m;
for(int i=0;i<10;i++){float z=float(i)/9.;m=max(vec3(0),1.-abs(z*2.-vec3(0,1,2)));c+=img(x+o*(z-.5)).rgb*m;n+=m;}
gl_FragColor=vec4(c/n*(1.+e*.25),1);}`

export function chromaticHover(el: HTMLElement, options: ChromaticHoverOptions = {}): Destroy {
  const { split = 1, wobble = 1, radius = 0.45, resolution = 2 } = options
  if (prefersReducedMotion()) return () => {}
  return imageGL(el, FRAG, resolution, (ctx) => {
    let at: number[] | null = null
    let p = [0.5, 0.5]
    let last = p
    let v = [0, 0]
    let a = [0, 0]
    let idle = true
    const frame = (time: number) => {
      if (idle) return
      const d = at
        ? [(at[0] as number) - (last[0] as number), (at[1] as number) - (last[1] as number)]
        : [0, 0]
      if (at) p = last = at
      a = a.map((n, i) => n * 0.8 + ((d[i] as number) - (v[i] as number)) * 0.14)
      v = v.map((n, i) => n + (a[i] as number))
      const speed = Math.hypot(v[0] as number, v[1] as number)
      idle = speed + Math.hypot(a[0] as number, a[1] as number) < 1e-4
      if (idle) v = [0, 0]
      const cap = Math.min(1, 0.018 / (speed || 1))
      ctx.draw({
        p,
        v: [(v[0] as number) * cap, (v[1] as number) * cap],
        k: Math.min(speed * 30, 1),
        t: time / 1000,
        s: split,
        w: wobble,
        q: radius,
      })
    }
    ctx.onResize = () => {
      idle = false
    }
    return all(
      pointer(
        el,
        (x, y) => {
          if (!at) last = [x, y]
          at = [x, y]
          idle = false
        },
        () => {
          at = null
        },
      ),
      loop(el, frame),
    )
  })
}
