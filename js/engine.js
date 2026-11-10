/* Draws a rendered viewpoint with light flicker and rain, a soft glow at the cursor, and gentle fades between viewpoints. */
const Engine = (() => {
  const VS = `#version 300 es
out vec2 v;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);v=p;gl_Position=vec4(p*2.-1.,0,1);}`;
  const FS = `#version 300 es
precision highp float;in vec2 v;out vec4 o;
uniform sampler2D B,M,S;uniform float t,flash,alpha,zoom,rain,LAll;uniform vec2 sc,zc;uniform vec4 LP[9];uniform vec3 LC[9];uniform vec3 beam;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+7.1;a*=.5;}return s;}
float n1(float x){return n(vec2(x,3.7));}
vec3 beads(vec2 st,float sz,float seed){vec2 g=st*sz+seed;vec2 id=floor(g),f=fract(g)-.5;vec2 c=vec2(h(id+seed),h(id+seed+3.1))-.5;float r=.07+.2*h(id+seed+9.);if(h(id+seed+5.)<.35)return vec3(0);vec2 d=(f-c*.6)*vec2(1.,.82);float l=length(d);float m=smoothstep(r,r*.72,l);return vec3(d/r*m,m);}
vec3 runner(vec2 st,float cols,float sp,float seed,inout float tr){vec2 q=st*vec2(cols,cols*.3);float cx=floor(q.x);float r=h(vec2(cx,seed));if(r<.4)return vec3(0);q.y+=t*sp*(.5+r)+r*9.;float cy=floor(q.y);float rr=h(vec2(cx,cy+seed));vec2 f=fract(q)-.5;float dx=f.x-(rr-.5)*.45-sin(q.y*7.+rr*6.)*.05;float yy=f.y-(rr-.5)*.2;float d=length(vec2(dx,yy*.34));float m=smoothstep(.12,.07,d);tr+=smoothstep(.07,.015,abs(dx))*smoothstep(0.,.5,yy)*(1.-smoothstep(.3,.5,yy))*.9;return vec3(vec2(dx,yy*.34)/.12*m,m);}
void main(){
  vec2 uv=(v-.5)*sc+.5; uv=zc+(uv-zc)/zoom; vec2 p=uv;
  vec3 mk=texture(M,p).rgb;float W=smoothstep(.2,.8,mk.r);
  float flick=fbm(vec2(t*5.,1.))*.5+n1(t*17.)*.25;float f1=.86+.34*flick;float f2=.8+.45*fbm(vec2(t*1.7,9.));
  p.x+=mk.g*sin(t*11.)*.0006*flick;
  vec3 c;
  if(W>.001){
    float tr=0.;vec2 st=uv*vec2(16./9.,1.);
    vec3 a1=beads(st,44.,1.3),a2=beads(st,92.,4.7),a3=runner(st,26.,.42,2.,tr),a4=runner(st,40.,.6,7.,tr);
    vec3 r=a3+a4;r=r.z>.01?r:(a1.z>.01?a1:a2*.8);
    vec2 q=p-r.xy*vec2(.0105,.019)*W;
    float ok=step(.4,texture(M,q).r);vec3 wet=texture(B,p,2.2).rgb;vec3 sharp=texture(B,mix(p,q,ok),.5).rgb;
    c=mix(wet,sharp,r.z);c=mix(c,texture(B,p+vec2(0.,.006),1.5).rgb,clamp(tr,0.,1.)*.75*(1.-r.z));
    float cl=fbm(st*5.+vec2(t*.05,-t*.02));c*=mix(1.,.72+.75*cl,W);
    c+=W*r.z*smoothstep(.4,1.,dot(normalize(r.xy+1e-4),normalize(vec2(-.3,-.9))))*length(r.xy)*vec3(.07,.09,.12);
    c+=W*clamp(tr,0.,1.)*vec3(.008,.011,.016);
    c=mix(c,c+flash*vec3(.2,.26,.38)*(.3+cl),W);
  }else c=texture(B,p).rgb;
  for(int i=0;i<9;i++){if(LP[i].z>.001){vec2 dl=(uv-LP[i].xy)*vec2(16./9.,1.);float gg=exp(-dot(dl,dl)/(LP[i].w*LP[i].w));c+=LC[i]*gg*LP[i].z*max(LAll,W);}}
  vec3 s=texture(S,p).rgb;
  c*=1.+s.r*(f1-1.)+s.g*(f2-1.)+s.b*flash*2.;
  c+=flash*.02*vec3(.5,.6,1.);
  if(mk.b>.01){float y=p.y*70.-t*2.6;float fl=fbm(vec2(p.x*160.,y));c*=mix(1.,.45+1.5*fl*f2,mk.b);c+=mk.b*fl*fl*vec3(.45,.13,.0)*f2;}
  c*=1.+mk.g*(f1-1.)*2.;
  if(beam.x>=0.){vec2 bd=(uv-beam.xy)*vec2(16./9.,1.);float ba=atan(bd.y,bd.x);float da=abs(mod(ba-beam.z+3.14159,6.28318)-3.14159);c+=exp(-da*da/.012)*smoothstep(1.5,.02,length(bd))*vec3(1.,.92,.68)*.55;}
  if(rain>0.){vec2 r_=vec2(uv.x*420.+uv.y*90.,uv.y*11.+t*2.6);float a=n(r_)*n(r_*vec2(1.7,.6)+3.);c+=rain*smoothstep(.42,.72,a)*vec3(.05,.06,.08);}
  o=vec4(c,alpha);}`;
  const canvas = document.getElementById("c");
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true });
  if (!gl) { document.body.innerHTML = '<p style="color:#ddd;padding:40px;font:18px Georgia">This game needs a browser with WebGL 2.</p>'; throw new Error("no webgl2"); }
  function sh(k, s) { const x = gl.createShader(k); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(x); return x; }
  const P = gl.createProgram(); gl.attachShader(P, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(P, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(P); gl.useProgram(P); gl.bindVertexArray(gl.createVertexArray());
  const U = {}; for (const n of ["t", "flash", "alpha", "zoom", "rain", "sc", "zc", "LP", "LC", "LAll", "beam", "B", "M", "S"]) U[n] = gl.getUniformLocation(P, n);
  gl.uniform1i(U.B, 0); gl.uniform1i(U.M, 1); gl.uniform1i(U.S, 2); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const cache = new Map(), rooms = {};
  const img = u => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("image failed: " + u)); i.src = u; });
  function tex(im) {
    const T = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return T;
  }
  async function room(name) { if (!rooms[name]) rooms[name] = await (await fetch(`rooms/${name}.json`)).json(); return rooms[name]; }
  async function load(roomName, view) {
    const key = roomName + "/" + view; if (cache.has(key)) { const hit = cache.get(key); cache.delete(key); cache.set(key, hit); return hit; }
    const pr = (async () => {
      const meta = (await room(roomName))[view], base = `rooms/${roomName}/${view}/`;
      const [b, m, s] = await Promise.all(["b.jpg", "m.png", "s.jpg"].map(f => img(base + f)));
      const ov = {}; await Promise.all(Object.keys(meta.overlays || {}).map(async n => { ov[n] = await img(base + `o_${n}.webp`); }));
      const cv = document.createElement("canvas"); cv.width = b.width; cv.height = b.height; const c2 = cv.getContext("2d");
      return { key, meta, b, ov, cv, c2, T: { b: tex(b), m: tex(m), s: tex(s) }, opts: {} };
    })(); cache.set(key, pr); pr.catch(() => cache.delete(key)); return pr;
  }
  /* keep graphics memory in check: forget the views used longest ago, never the ones on screen or next door */
  function trim(keep, max) { if (cache.size <= max) return; for (const [k, pr] of [...cache]) { if (cache.size <= max) break; if (keep.has(k) || (cur && cur.key === k) || (trans && (trans.from.key === k || trans.to.key === k))) continue; cache.delete(k); pr.then(r => { gl.deleteTexture(r.T.b); gl.deleteTexture(r.T.m); gl.deleteTexture(r.T.s); }).catch(() => {}); } }
  function compose(rec, overlays, draw) {
    const { c2, b, meta, ov } = rec, W = b.width, H = b.height; c2.drawImage(b, 0, 0);
    for (const n of overlays || []) { const r = meta.overlays[n]; if (r && ov[n]) c2.drawImage(ov[n], r[0] * W, r[1] * H, (r[2] - r[0]) * W, (r[3] - r[1]) * H); }
    if (draw) draw(c2, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rec.T.b); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rec.cv); gl.generateMipmap(gl.TEXTURE_2D);
  }
  const lp = new Float32Array(36), lc = new Float32Array(27);
  let cur = null, trans = null, fl = 0, nextF = 5;
  const scale = () => { const a = innerWidth / innerHeight, ia = 16 / 9; return [a > ia ? 1 : a / ia, a > ia ? ia / a : 1]; };
  function toScreen(x, y) { const [sx, sy] = scale(); return [((x - .5) / sx + .5) * innerWidth, ((y - .5) / sy + .5) * innerHeight]; }
  function toImage(cx, cy) { const [sx, sy] = scale(), x = cx / innerWidth, y = 1 - cy / innerHeight; return [(x - .5) * sx + .5, 1 - ((y - .5) * sy + .5)]; }
  function draw(rec, alpha, zoom, zc, t, fv) {
    const T = rec.T; [T.b, T.m, T.s].forEach((x, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, x); });
    gl.uniform1f(U.alpha, alpha); gl.uniform1f(U.zoom, zoom); gl.uniform2f(U.zc, zc[0], zc[1]); gl.uniform1f(U.rain, rec.opts.rain ? 1 : 0); gl.uniform1f(U.t, t); gl.uniform1f(U.flash, fv);
    const ls = rec.opts.lights ? rec.opts.lights(t) : []; lp.fill(0); lc.fill(0); ls.slice(0, 9).forEach((l, i) => { lp.set([l.x, l.y, l.i, l.r || .011], i * 4); lc.set(l.c, i * 3); }); gl.uniform4fv(U.LP, lp); gl.uniform3fv(U.LC, lc); gl.uniform1f(U.LAll, rec.opts.allLights ? 1 : 0); const bm = rec.opts.beam; gl.uniform3f(U.beam, bm ? bm[0] : -1, bm ? bm[1] : -1, t * .7);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  let dpCap = Math.min(devicePixelRatio, 1.5), lastMs = 0, slow = 0, fcount = 0;
  function frame(ms) {
    if (paused) { requestAnimationFrame(frame); return; }
    if (ms - lastMs < 200) { slow += ms - lastMs; if (++fcount >= 45) { if (slow / fcount > 27 && dpCap > .75) dpCap -= .25; slow = 0; fcount = 0; } } lastMs = ms;
    const t = ms / 1000, dp = dpCap, w = innerWidth * dp | 0, h = innerHeight * dp | 0; if (canvas.width != w || canvas.height != h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    if (t > nextF) { nextF = t + 8 + Math.random() * 14; fl = 1 + Math.random() * .5; } fl *= .9; const fv = fl * (.5 + .5 * Math.sin(t * 38));
    const [sx, sy] = scale(); gl.uniform2f(U.sc, sx, sy);
    if (trans) {
      const k = Math.min((t - (trans.t0 ?? (trans.t0 = t))) / trans.dur, 1), e = k * k * (3 - 2 * k);
      gl.disable(gl.BLEND); draw(trans.from, 1, 1 + (trans.dir > 0 ? .04 : -.02) * e, trans.zc, t, fv);
      gl.enable(gl.BLEND); draw(trans.to, e, (trans.dir > 0 ? .98 : 1.04) + (trans.dir > 0 ? .02 : -.04) * e, trans.zc, t, fv); gl.disable(gl.BLEND);
      if (k >= 1) { cur = trans.to; const d = trans.done; trans = null; d && d(); }
    } else if (cur) { gl.disable(gl.BLEND); draw(cur, 1, 1, [.5, .5], t, fv); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  /* full-screen film as a plain video, hardware decoded; rain is a cheap CSS layer on top. */
  let paused = false, rainUrl = null;
  function rainTile() { if (rainUrl) return rainUrl; const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d"); x.strokeStyle = "rgba(190,210,240,.34)"; x.lineWidth = 1.1; for (let i = 0; i < 170; i++) { const a = Math.random() * 512, b = Math.random() * 512, l = 20 + Math.random() * 46; x.globalAlpha = .25 + Math.random() * .75; for (const [dx, dy] of [[0, 0], [512, 0], [0, 512], [-512, 0], [0, -512]]) { x.beginPath(); x.moveTo(a + dx, b + dy); x.lineTo(a + dx - l * .13, b + dy + l); x.stroke(); } } rainUrl = c.toDataURL(); return rainUrl; }
  function playVideo(src, cap, sub, max) { return new Promise(res => {
    paused = true; const v = document.createElement("video"); v.src = src; v.muted = true; v.playsInline = true; v.preload = "auto"; v.className = "film";
    const rain = document.createElement("div"); rain.className = "rainfx"; rain.style.backgroundImage = `url(${rainTile()})`; const r2 = rain.cloneNode(); r2.className = "rainfx two";
    const capEl = document.createElement("div"); capEl.id = "vidCap"; capEl.innerHTML = cap ? `<b>${cap}</b><i>${sub}</i>` : ""; const skip = document.createElement("button"); skip.id = "vidSkip"; skip.textContent = "Skip"; document.body.append(v, rain, r2, capEl, skip); setTimeout(() => capEl.style.opacity = 0, 3500);
    let done = false; const finish = () => { if (done) return; done = true; v.pause(); [v, rain, r2, capEl, skip].forEach(e => e.remove()); paused = false; res(); }; skip.onclick = finish; v.onended = finish; v.onerror = finish; setTimeout(finish, (max || 15) * 1000);
    const go = () => v.play().catch(finish); v.oncanplaythrough = go; setTimeout(go, 1500);
  }); }
  function show(rec) { cur = rec; }
  function go(rec, dir, zc, done) { if (!cur) { cur = rec; done && done(); return; } trans = { from: cur, to: rec, dir, zc: zc || [.5, .5], dur: .3, done }; }
  return { load, trim, compose, show, go, playVideo, toImage, toScreen, busy: () => !!trans, current: () => cur, canvas };
})();
