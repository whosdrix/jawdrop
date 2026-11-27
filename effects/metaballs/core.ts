import {
  all,
  backdrop,
  createGL,
  type Destroy,
  fitCanvas,
  hexToRgb,
  loop,
  pass,
  pointer,
  prefersReducedMotion,
  releaseGL,
} from '../lib'

export interface MetaballsOptions {
  /** Three colors the blobs shift between. */
  colors?: [string, string, string]
  /** Number of blobs, 2 to 8. One of them follows the cursor. */
  count?: number
  /** Blob size. */
  size?: number
  /** Drift speed. */
  speed?: number
  /** Strength of the halo around the blobs, 0 to 1. */
  glow?: number
  /** A CSS background for the canvas. Leave empty to keep it see-through. */
  background?: string
  /** Pixels rendered per CSS pixel, up to the screen's density. Edges stay sharp at any value. */
  resolution?: number
}

const FRAG = `
uniform vec2 r;uniform float t,g;uniform vec3 b[8],c0,c1,c2;
void main(){
  float u=min(r.x,r.y),L=1.386,f=0.,R=0.,s;vec2 p=(gl_FragCoord.xy-.5*r)/u,d,gr=vec2(0);
  for(int i=0;i<8;i++){d=p-b[i].xy;s=exp(-dot(d,d)/(b[i].z*b[i].z)*L);f+=s;R+=s*b[i].z;gr-=2.*L*d/(b[i].z*b[i].z)*s;}
  float w=length(gr)*1.2/u,a=smoothstep(-w,w,f-.25);
  vec3 n=normalize(vec3(-gr*R/(2.*f*f*L),sqrt(max(1.+log(f)/L,0.))+.02));
  float fr=pow(1.-n.z,2.);
  vec3 l=normalize(vec3(-.45,.6,.66));
  vec3 base=mix(mix(c0,c1,.5+.5*sin(n.x*2.+n.y*1.1+t*.4+p.x*1.6)),c2,.75*smoothstep(-.6,.8,n.y*1.2-p.y+.4*sin(t*.3)));
  vec3 col=base*(.3+.75*smoothstep(-.5,1.,dot(n,l)));
  col=mix(col,.5+.5*cos(6.283*(fr*1.1+n.x*.3+t*.08)+vec3(0,2.1,4.2)),fr*.5);
  col+=pow(max(dot(n,normalize(l+vec3(0,0,1))),0.),120.)*1.3+pow(max(dot(n,normalize(vec3(.5,-.6,.5))),0.),6.)*.25*c2+fr*.2;
  float h=pow(clamp(f*4.,0.,1.),1.6)*g*(1.-a);
  vec3 halo=mix(c0,c1,.5+.5*sin(t*.4+p.x*3.));
  gl_FragColor=vec4((col*a+halo*h)/max(a+h,1e-3),a+h);
}`

export function metaballs(el: HTMLElement, options: MetaballsOptions = {}): Destroy {
  const {
    colors = ['#ff3d77', '#6d5cff', '#18e0c8'],
    count = 6,
    size = 1,
    speed = 1,
    glow = 0.5,
    background = '',
    resolution = 1,
  } = options
  const canvas = document.createElement('canvas')
  const remove = backdrop(el, canvas)
  canvas.style.background = background
  const made = createGL(canvas, FRAG)
  const draw = made && pass(made.gl, made.program)
  if (!made || !draw) {
    canvas.style.background ||= `radial-gradient(40% 50% at 40% 45%, ${colors[0]}, transparent 70%), radial-gradient(40% 50% at 62% 55%, ${colors[1]}, transparent 70%)`
    return remove
  }
  const { gl } = made
  const balls = new Float32Array(24)
  const palette = colors.map(hexToRgb)
  let aspect = 1
  let target: number[] | null = null
  let held = 0
  const frame = (time: number) => {
    const t = (time / 1000) * speed + 40
    const sx = Math.max(aspect, 1) * 0.5
    const sy = Math.max(1 / aspect, 1) * 0.5
    for (let i = 0; i < 8; i++) {
      const k = i * 2.399
      let x = sx * 0.78 * Math.sin(t * (0.21 + 0.07 * Math.sin(k)) + k * 1.7)
      let y = sy * 0.7 * Math.cos(t * (0.17 + 0.06 * Math.cos(k * 1.3)) + k)
      if (!i) {
        held += ((target ? 1 : 0) - held) * 0.06
        const ox = balls[0] as number
        const oy = balls[1] as number
        x = ox + ((target ? (target[0] as number) : x) - ox) * (0.04 + held * 0.12)
        y = oy + ((target ? (target[1] as number) : y) - oy) * (0.04 + held * 0.12)
      }
      balls[i * 3] = i < count ? x : 99
      balls[i * 3 + 1] = y
      balls[i * 3 + 2] = size * (i ? 0.1 + 0.07 * Math.abs(Math.sin(k * 3.1)) : 0.13)
    }
    draw({
      r: [canvas.width, canvas.height],
      t,
      g: glow,
      b: balls,
      c0: palette[0] as number[],
      c1: palette[1] as number[],
      c2: palette[2] as number[],
    })
  }
  const stopFit = fitCanvas(
    canvas,
    (w, h) => {
      aspect = w / h
      frame(0)
    },
    resolution,
  )
  if (prefersReducedMotion()) return all(remove, stopFit, () => releaseGL(gl))
  return all(
    remove,
    stopFit,
    pointer(
      el,
      (x, y) => {
        const u = Math.min(aspect, 1)
        const v = Math.min(1 / aspect, 1)
        target = [(x - 0.5) / v, (0.5 - y) / u]
      },
      () => {
        target = null
      },
    ),
    loop(el, frame),
    () => releaseGL(gl),
  )
}
