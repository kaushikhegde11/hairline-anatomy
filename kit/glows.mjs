// WebGL light recipes for figures on a host page, in the figure's own iso camera
// (references/webgl.md). Dark theme: emitted light, screen-blended.
// Light theme: ink solved from the colour the paper should show.

const COMMON = `
uniform float uLight;
uniform vec3 uBlue;
uniform float uLevel;
vec4 inkFor(vec3 seen,float cover){vec3 ab=1.-seen;float a=max(max(ab.r,max(ab.g,ab.b)),cover);return vec4(vec3(a)-ab,a);}
vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
float sdRound(vec2 p,vec2 c,vec2 h,float r){vec2 q=abs(p-c)-h+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
vec4 finish(vec4 c){
  c.rgb=min(c.rgb,vec3(c.a));
  float n=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;
  float g=smoothstep(0.,1.5/255.,c.a);
  c=max(c+vec4(n,n,n,n)*g,0.);
  c.rgb=min(c.rgb,vec3(c.a));
  return c*uLevel;
}
`;

// Camera: a small blue status LED on the grip's front face.
export const led = {
  uniforms: ["uLevel"],
  fixed: (data, theme) => ({ uLight: theme.light, uBlue: theme.blue, uLed: data.led, uLedR: data.ledR, uFace: data.face, uFaceR: data.faceR }),
  fragment: COMMON + `
uniform vec3 uLed;
uniform float uLedR;
uniform vec4 uFace;
uniform float uFaceR;
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  float px=pixelOf()/uCam.w;
  vec3 lens=onWallY(vb,uLed.y+1.1);
  float d=length(lens.xz-uLed.xz);
  float core=1.-smoothstep(uLedR-.9*px,uLedR+.3*px,d);
  vec3 f=onWallY(vb,uLed.y);
  float df=length(f.xz-uLed.xz);
  vec2 c=vec2(uFace.x+uFace.y,uFace.z+uFace.w)*.5,h=vec2(uFace.y-uFace.x,uFace.w-uFace.z)*.5;
  float seam=.45/uK;
  float onFace=1.-smoothstep(-seam-.7*px,-seam+.7*px,sdRound(f.xz,c,h,uFaceR));
  float ring=1.-smoothstep(uLedR+.6,uLedR+1.6,df);          // the housing ring stays dark
  float spill=onFace*(1.-ring)*(exp(-pow(df/4.5,2.))*.9+exp(-df/12.)*.22);
  vec3 pale=mix(uBlue,vec3(1.),.62);
  if(uLight<.5){
    float rim=smoothstep(.2,1.,d/uLedR);
    vec3 e=core*mix(pale*1.6,uBlue*1.4,rim)+uBlue*spill*.75+uBlue*exp(-pow(d/3.,2.))*.35*(1.-core);
    vec3 col=1.-exp(-e*1.3);
    float a=max(col.r,max(col.g,col.b));
    gl_FragColor=finish(vec4(col,a));
  } else {
    float rim=smoothstep(.15,.95,d/uLedR);
    vec4 body=inkFor(mix(mix(uBlue,vec3(1.),.72),uBlue,rim),.0)*core;
    vec3 tintSeen=mix(vec3(1.),mix(uBlue,vec3(1.),.35),min(spill*1.1,1.));
    vec4 tint=inkFor(tintSeen,0.);
    tint*=.85;
    gl_FragColor=finish(over(body,tint));
  }
}`,
};

// Laptop: the screen emits a dim blue light; it spills onto the keyboard deck.
// The lid turns about the hinge (x axis at y = hinge.y, z = hinge.z) by uOpen
// radians from closed; the screen is a rounded rectangle on its inner face.
export const screen = {
  uniforms: ["uLevel", "uOpen", "uBright"],
  fixed: (data, theme) => ({ uLight: theme.light, uBlue: theme.blue, uHinge: data.hinge, uScreen: data.screen, uDeck: data.deck, uLidT: data.lidT }),
  fragment: COMMON + `
uniform float uOpen;
uniform float uBright;
uniform vec3 uHinge;     // (x centre, y, z) of the hinge line
uniform vec4 uScreen;    // half width, near edge, far edge (along the lid from the hinge), corner radius
uniform vec4 uDeck;      // deck half width, y front, y back, z top
uniform float uLidT;     // lid thickness: the inner face sits this far inside the lid frame
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 V=towardViewer();
  vec3 p0=rayOf(vb);
  float px=pixelOf();
  // lid inner face plane: through the hinge, spanned by x and the lid direction
  vec3 dir=vec3(0.,cos(uOpen),sin(uOpen));
  vec3 n=vec3(0.,sin(uOpen),-cos(uOpen));
  vec3 o=uHinge;
  float denom=dot(V,n);
  float tl=dot(o-p0,n)/(abs(denom)<1e-4?1e-4:denom);
  vec3 q=p0+tl*V-o;
  vec2 lid=vec2(q.x,dot(q,dir));
  float facing=smoothstep(.02,.18,denom);
  vec2 sc=vec2(0.,(uScreen.y+uScreen.z)*.5),sh=vec2(uScreen.x,(uScreen.z-uScreen.y)*.5);
  float seam=.45/uK;
  float sd=sdRound(lid,sc,sh,uScreen.w);
  float onScreen=(1.-smoothstep(-seam-.8*px,-seam+.6*px,sd))*facing;
  float onLid=1.-smoothstep(-.2,.6*px,sdRound(lid,vec2(0.,(uScreen.z+uScreen.y)*.5),vec2(uScreen.x+3.,(uScreen.z-uScreen.y)*.5+3.),2.));
  // screen face: dim, a little brighter at the centre
  vec2 rel=(lid-sc)/sh;
  float face=onScreen*(.62+.38*exp(-dot(rel,rel)*.9));
  // deck under the screen: light only where the screen can see it, and not behind the lid
  float td=(uDeck.w-p0.z)/V.z;
  vec3 g=p0+td*V;
  float onDeck=(1.-smoothstep(-.6*px,.6*px,abs(g.x)-uDeck.x))*(1.-smoothstep(-.6*px,.6*px,g.y-uDeck.y))*smoothstep(-.6*px,.6*px,g.y-uDeck.z);
  float hidden=onLid*step(td,tl);
  vec3 sCentre=o+dir*((uScreen.y+uScreen.z)*.5);
  vec3 toS=sCentre-g;
  float dist=length(toS);
  float sees=max(dot(-normalize(toS),n),0.)*max(dot(normalize(toS),vec3(0.,0.,1.)),0.);
  float spill=onDeck*(1.-hidden)*sees*exp(-dist/22.)*1.4;
  if(uLight<.5){
    vec3 e=uBlue*(face*.55+spill*.32)*uBright;
    vec3 col=1.-exp(-e*1.4);
    float a=max(col.r,max(col.g,col.b));
    gl_FragColor=finish(vec4(col,a));
  } else {
    vec3 screenSeen=mix(vec3(1.),mix(uBlue,vec3(1.),.58),clamp(face*uBright*1.05,0.,1.));
    vec4 scr=inkFor(screenSeen,0.);
    vec3 deckSeen=mix(vec3(1.),mix(uBlue,vec3(1.),.45),clamp(spill*uBright,0.,1.));
    vec4 dk=inkFor(deckSeen,0.)*.7;
    gl_FragColor=finish(over(scr,dk));
  }
}`,
};
