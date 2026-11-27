import { all, type Destroy, hexToRgb, imageGL, loop, pointer, prefersReducedMotion } from '../lib'

export interface HalftoneImageOptions {
  /** Distance between dots in CSS pixels. */
  size?: number
  /** Angle of the dot screen in degrees. */
  angle?: number
  /** Radius of the clear lens around the pointer, in CSS pixels. */
  radius?: number
  /** Color between the dots. */
  background?: string
  /** Let the lens wander on its own while no pointer is over the image. */
  roam?: boolean
  /** Pixels rendered per CSS pixel, up to the screen's density. */
  resolution?: number
}

const FRAG = `uniform vec2 p;uniform float t,s,a,q,k;uniform vec3 b;
void main(){vec2 f=vec2(gl_FragCoord.x,r.y-gl_FragCoord.y);
float c=cos(a),n=sin(a);mat2 R=mat2(c,-n,n,c);
vec2 g=R*f/s,i=floor(g)+.5,o=i*R*s;
vec3 x=img(o/r).rgb;
float l=1.-smoothstep(.55,1.,length(o-p)/q);
float w=.5+.5*sin(t*1.4-dot(o,vec2(.6,.8))/s*.22);
float d=(.1+.56*sqrt(dot(x,vec3(.3,.59,.11))))*(.86+.14*w)+k*(l*.9+.12*exp(-pow(length(o-p)/q-1.,2.)*9.));
float m=smoothstep(d+1.2/s,d-1.2/s,length(g-i));
gl_FragColor=vec4(mix(b,mix(x*1.25,img(f/r).rgb,smoothstep(.45,.72,d)),m),1);}`

export function halftoneImage(el: HTMLElement, options: HalftoneImageOptions = {}): Destroy {
  const {
    size = 9,
    angle = 30,
    radius = 130,
    background = '#07080d',
    roam = true,
    resolution = 2,
  } = options
  const still = prefersReducedMotion()
  const paper = hexToRgb(background)
  return imageGL(el, FRAG, resolution, (ctx) => {
    let at: number[] | null = null
    let x = 0.5
    let y = 0.5
    let k = 0
    const frame = (time: number) => {
      const t = time / 1000
      const to = at ?? [0.5 + 0.34 * Math.sin(t * 0.5), 0.5 + 0.3 * Math.sin(t * 0.8 + 1)]
      x += ((to[0] as number) - x) * (at ? 0.2 : 0.05)
      y += ((to[1] as number) - y) * (at ? 0.2 : 0.05)
      k += ((still || !(at || roam) ? 0 : 1) - k) * 0.07
      const dpr = ctx.gl.drawingBufferWidth / ctx.w
      ctx.draw({
        p: [x * ctx.w * dpr, y * ctx.h * dpr],
        t,
        s: size * dpr,
        a: (angle * Math.PI) / 180,
        q: Math.min(radius, Math.min(ctx.w, ctx.h) * 0.4) * dpr,
        k,
        b: paper,
      })
    }
    ctx.onResize = () => frame(0)
    if (still) return () => {}
    return all(
      pointer(
        el,
        (px, py) => {
          at = [px, py]
        },
        () => {
          at = null
        },
      ),
      loop(el, frame),
    )
  })
}
