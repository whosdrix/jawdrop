import {
  all,
  backdrop,
  createGL,
  type Destroy,
  fitCanvas,
  hexToRgb,
  loop,
  prefersReducedMotion,
  releaseGL,
} from '../lib'

export interface AuroraOptions {
  /** Three colors for the curtains of light, from back to front. */
  colors?: [string, string, string]
  /** Animation speed. */
  speed?: number
  /** Brightness of the light, 0.2 to 2. */
  intensity?: number
  /**
   * Pixels rendered per CSS pixel, up to the screen's density. The light is soft, so the default
   * of 0.5 looks the same as full resolution for a fraction of the GPU work.
   */
  resolution?: number
}

const FRAG = `
uniform vec2 r;uniform float t,k;uniform vec3 c0,c1,c2;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
vec3 band(vec2 uv,float s,float o,vec3 c){
  float y=.38+o*.09+.22*(fbm(vec2(uv.x*1.6+o*3.1,s*.6+o))-.5);
  float d=uv.y-y;
  float glow=exp(-d*d*900.)*.9+smoothstep(.0,.02,d)*exp(-d*3.5)*.8;
  float rays=.35+.65*fbm(vec2(uv.x*14.+o*7.,s*1.4+uv.y*1.5));
  return c*glow*rays;
}
void main(){
  vec2 uv=gl_FragCoord.xy/r;float s=t*.0001;
  vec3 col=band(uv,s,0.,c0)+band(uv,s*1.3,1.,c1)+band(uv,s*.8,2.,c2);
  col*=k*smoothstep(1.,.55,uv.y)*.9;
  float a=clamp(max(col.r,max(col.g,col.b)),0.,1.);
  gl_FragColor=vec4(col/max(a,1e-3),a);
}`

export function aurora(el: HTMLElement, options: AuroraOptions = {}): Destroy {
  const {
    colors = ['#3b82f6', '#22d3a6', '#a855f7'],
    speed = 1,
    intensity = 1,
    resolution = 0.5,
  } = options
  const canvas = document.createElement('canvas')
  const removeLayer = backdrop(el, canvas)
  const ctx = createGL(canvas, FRAG)
  if (!ctx) {
    canvas.style.background = `linear-gradient(170deg, transparent 30%, ${colors[1]}55 50%, ${colors[2]}33 65%, transparent 80%)`
    return removeLayer
  }
  const { gl, uniform } = ctx
  colors.forEach((c, i) => {
    gl.uniform3fv(uniform(`c${i}`), hexToRgb(c))
  })
  gl.uniform1f(uniform('k'), intensity)
  const draw = (time: number) => {
    gl.uniform1f(uniform('t'), time * speed)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  const stopFit = fitCanvas(
    canvas,
    () => {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uniform('r'), canvas.width, canvas.height)
      draw(20000)
    },
    resolution,
  )
  const stop = prefersReducedMotion() ? () => {} : loop(el, (time) => draw(time + 20000))
  return all(removeLayer, stopFit, stop, () => releaseGL(gl))
}
