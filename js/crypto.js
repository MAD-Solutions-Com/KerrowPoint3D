/* SHA-256, HMAC, PBKDF2 and a simple stream cipher, in plain JavaScript so the game also runs over a local network link,
   where browsers switch off their built-in crypto. Used in the browser and by the Node tests. */
(function (root) {
  const K = new Int32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const IV = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const W = new Int32Array(64);
  function block(h, w0) {               // h: Int32Array(8), w0: Int32Array(16); updates h
    W.set(w0);
    for (let t = 16; t < 64; t++) { const a = W[t - 15], b = W[t - 2];
      W[t] = (((a >>> 7 | a << 25) ^ (a >>> 18 | a << 14) ^ (a >>> 3)) + W[t - 7] + ((b >>> 17 | b << 15) ^ (b >>> 19 | b << 13) ^ (b >>> 10)) + W[t - 16]) | 0; }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], i = h[7];
    for (let t = 0; t < 64; t++) {
      const T1 = (i + ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) | 0;
      const T2 = (((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      i = g; g = f; f = e; e = (d + T1) | 0; d = c; c = b; b = a; a = (T1 + T2) | 0; }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + i) | 0;
  }
  function sha256(msg) {
    const n = msg.length, tot = ((n + 9 + 63) >> 6) << 6, b = new Uint8Array(tot); b.set(msg); b[n] = 0x80;
    const dv = new DataView(b.buffer); dv.setUint32(tot - 4, n * 8); dv.setUint32(tot - 8, Math.floor(n / 536870912));
    const h = new Int32Array(IV), w = new Int32Array(16);
    for (let o = 0; o < tot; o += 64) { for (let i = 0; i < 16; i++) w[i] = dv.getInt32(o + i * 4); block(h, w); }
    return out(h);
  }
  function out(h) { const r = new Uint8Array(32), d = new DataView(r.buffer); for (let i = 0; i < 8; i++) d.setInt32(i * 4, h[i]); return r; }
  function pads(key) {
    if (key.length > 64) key = sha256(key);
    const k = new Uint8Array(64); k.set(key); const ip = k.map(x => x ^ 0x36), op = k.map(x => x ^ 0x5c);
    const toW = a => { const d = new DataView(a.buffer), w = new Int32Array(16); for (let i = 0; i < 16; i++) w[i] = d.getInt32(i * 4); return w; };
    const hi = new Int32Array(IV), ho = new Int32Array(IV); block(hi, toW(ip)); block(ho, toW(op)); return { hi, ho, ip, op };
  }
  function concat(...a) { const n = a.reduce((s, x) => s + x.length, 0), r = new Uint8Array(n); let o = 0; for (const x of a) { r.set(x, o); o += x.length; } return r; }
  function hmac(key, msg) { const p = pads(key); return sha256(concat(p.op, sha256(concat(p.ip, msg)))); }
  function pbkdf2(pass, salt, iter) {   // one 32-byte block; the two fixed compressions per round are precomputed
    const p = pads(pass); let u = hmac(pass, concat(salt, new Uint8Array([0, 0, 0, 1]))); const t = u.slice();
    const w = new Int32Array(16), h = new Int32Array(8), d = new DataView(u.buffer);
    w[8] = 0x80000000; w[15] = 768;
    for (let i = 1; i < iter; i++) {
      for (let k = 0; k < 8; k++) w[k] = d.getInt32(k * 4);
      h.set(p.hi); block(h, w); for (let k = 0; k < 8; k++) w[k] = h[k];
      h.set(p.ho); block(h, w); for (let k = 0; k < 8; k++) { d.setInt32(k * 4, h[k]); w[k] = h[k]; }
      for (let k = 0; k < 32; k++) t[k] ^= u[k];
    }
    return t;
  }
  function stream(key, nonce, data) {   // XOR with HMAC(key, nonce || counter)
    const r = new Uint8Array(data.length), c = new Uint8Array(4), cd = new DataView(c.buffer), p = pads(key), m = concat(nonce, c);
    for (let i = 0, ctr = 0; i < data.length; ctr++) {
      cd.setUint32(0, ctr); m.set(c, nonce.length); const b = sha256(concat(p.op, sha256(concat(p.ip, m))));
      for (let j = 0; j < 32 && i < data.length; j++, i++) r[i] = data[i] ^ b[j]; }
    return r;
  }
  const enc = s => new TextEncoder().encode(s), dec = b => new TextDecoder().decode(b);
  const b64d = s => (typeof atob === "function") ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, "base64"));
  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  function norm(s) { return String(s).toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  /* Returns the part's key if the answer is right, otherwise null. Slow on purpose. */
  function check(part, answer) {
    const dk = pbkdf2(enc(norm(answer)), b64d(part.salt), part.iter);
    return eq(hmac(dk, enc("check")), b64d(part.check)) ? hmac(dk, enc("enc")) : null;
  }
  function openBox(key, box) { return stream(key, b64d(box.n), b64d(box.c)); }
  function openJson(key, box) { return JSON.parse(dec(openBox(key, box))); }
  root.KCrypto = { sha256, hmac, pbkdf2, stream, check, openBox, openJson, enc, dec, b64d, norm };
})(typeof window !== "undefined" ? window : globalThis);
