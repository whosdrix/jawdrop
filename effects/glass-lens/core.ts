import { all, type Destroy, imageGL, loop, pointer, prefersReducedMotion } from '../lib'

export interface GlassLensOptions {
  /** Lens radius in CSS pixels. */
  radius?: number
  /** How strongly the glass magnifies and bends the image. */
  power?: number
  /** Rainbow fringing toward the rim, 0 to 2. */
  dispersion?: number
  /** Hide the lens while the pointer is away, instead of leaving it resting on the image. */
  hide?: boolean
  /** Pixels rendered per CSS pixel, up to the screen's density. */
  resolution?: number
}

const FRAG = `uniform vec2 p;uniform float q,k,z,c;
vec3 at(vec2 f,vec2 d,float l,float h,float i){float e=1./i;return img((f-d*q*(sqrt(1.-e*e*l*l)-e*h)*z*(.3+.7*h))/r).rgb;}
void main(){vec2 f=vec2(gl_FragCoord.x,r.y-gl_FragCoord.y),d=(f-p)/q;float l=length(d);
vec3 o=img(f/r).rgb*(1.-.5*k*smoothstep(1.5,.6,length(d-vec2(.05,.16))));
if(l<1.){float h=sqrt(1.-l*l),i=1.5,j=c*.09*(1.-h);vec3 n=vec3(d,h);
vec3 g=vec3(at(f,d,l,h,i-j).r,at(f,d,l,h,i).g,at(f,d,l,h,i+j).b);
g*=mix(.5,1.06,smoothstep(0.,.3,h));
g+=pow(max(dot(n,normalize(vec3(-.5,-.62,.6))),0.),70.)*.95
+pow(max(dot(n,normalize(vec3(-.3,-.8,.5))),0.),5.)*.14
+pow(1.-h,3.)*(.12+.5*max(dot(d,vec2(.55,.75)),0.));
o=mix(o,g,smoothstep(1.,1.-2./q,l)*k);}
gl_FragColor=vec4(o,1);}`

export function glassLens(el: HTMLElement, options: GlassLensOptions = {}): Destroy {
  const { radius = 110, power = 1, dispersion = 1, hide = false, resolution = 2 } = options
  const still = prefersReducedMotion()
  return imageGL(el, FRAG, resolution, (ctx) => {
    let to = [0.66, 0.44]
    let at = to
    let v = [0, 0]
    let here = false
    let k = hide ? 0 : 1
    let idle = false
    const frame = () => {
      if (idle) return
      const goal = here || !hide ? 1 : 0
      v = v.map((n, i) => n * 0.72 + ((to[i] as number) - (at[i] as number)) * 0.09)
      at = at.map((n, i) => n + (v[i] as number))
      k += (goal - k) * 0.14
      idle = Math.abs(goal - k) + Math.hypot(v[0] as number, v[1] as number) * 400 < 0.004
      const dpr = ctx.gl.drawingBufferWidth / ctx.w
      const stretch =
        1 + Math.min(Math.hypot((v[0] as number) * ctx.w, (v[1] as number) * ctx.h) * 0.004, 0.12)
      ctx.draw({
        p: [(at[0] as number) * ctx.w * dpr, (at[1] as number) * ctx.h * dpr],
        q: Math.max(
          Math.min(radius, Math.min(ctx.w, ctx.h) * 0.32) * dpr * (0.4 + 0.6 * k) * stretch,
          1,
        ),
        k,
        z: power,
        c: dispersion,
      })
    }
    ctx.onResize = () => {
      idle = false
      frame()
    }
    if (still) return () => {}
    return all(
      pointer(
        el,
        (x, y) => {
          if (!here && hide) at = [x, y]
          to = [x, y]
          here = true
          idle = false
        },
        () => {
          here = false
          idle = false
        },
      ),
      loop(el, frame),
    )
  })
}
