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

export interface GradientMeshOptions {
  /** Four colors that drift around and blend into each other. */
  colors?: [string, string, string, string]
  /** Animation speed. 1 is a slow drift. */
  speed?: number
  /** Amount of film grain, 0 to 0.2. Hides banding on large screens. */
  grain?: number
}

const FRAG = `
uniform vec2 r;uniform float t,g;uniform vec3 c0,c1,c2,c3;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec2 pt(float a,float b,float s){return vec2(.5+.42*sin(s*a+b),.5+.38*cos(s*(a*.8)+b*1.7));}
void main(){
  vec2 uv=gl_FragCoord.xy/r;float k=r.x/r.y;vec2 p=vec2(uv.x*k,uv.y);
  float s=t*.00012;
  p+=.09*vec2(sin(p.y*3.1+s*2.3),cos(p.x*2.7-s*1.9));
  vec2 a=pt(1.1,0.,s)*vec2(k,1.),b=pt(.9,2.1,s)*vec2(k,1.),c=pt(1.3,4.2,s)*vec2(k,1.),d=pt(.7,5.3,s)*vec2(k,1.);
  float w0=exp(-4.*dot(p-a,p-a)),w1=exp(-4.*dot(p-b,p-b)),w2=exp(-4.*dot(p-c,p-c)),w3=exp(-4.*dot(p-d,p-d));
  vec3 col=(c0*w0+c1*w1+c2*w2+c3*w3)/(w0+w1+w2+w3+1e-4);
  col+=(h(gl_FragCoord.xy+fract(t*.001))-.5)*g;
  gl_FragColor=vec4(col,1.);
}`

export function gradientMesh(el: HTMLElement, options: GradientMeshOptions = {}): Destroy {
  const { colors = ['#0b1026', '#3b2bff', '#00c2ff', '#ff4fd8'], speed = 1, grain = 0.06 } = options
  const canvas = document.createElement('canvas')
  const removeLayer = backdrop(el, canvas)
  const ctx = createGL(canvas, FRAG)
  if (!ctx) {
    canvas.style.background = `radial-gradient(at 20% 30%, ${colors[1]}, transparent 60%), radial-gradient(at 80% 20%, ${colors[2]}, transparent 55%), radial-gradient(at 60% 90%, ${colors[3]}, transparent 60%), ${colors[0]}`
    return removeLayer
  }
  const { gl, uniform } = ctx
  colors.forEach((c, i) => {
    gl.uniform3fv(uniform(`c${i}`), hexToRgb(c))
  })
  gl.uniform1f(uniform('g'), grain)
  const draw = (time: number) => {
    gl.uniform1f(uniform('t'), time * speed)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  const stopFit = fitCanvas(canvas, () => {
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(uniform('r'), canvas.width, canvas.height)
    draw(8000)
  })
  const stop = prefersReducedMotion() ? () => {} : loop(el, (time) => draw(time + 8000))
  return all(removeLayer, stopFit, stop, () => releaseGL(gl))
}
