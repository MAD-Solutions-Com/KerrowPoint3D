/* Linking two players. Local network: our own server. Static hosting (GitHub Pages): a direct peer-to-peer link via PeerJS, with the host's browser keeping the game state. */
const Net = (() => {
  const peerMode = location.hostname.endsWith("github.io") || location.hash.includes("peer"), PFX = "kerrow-digital-", SK = c => "kerrow-host-" + c;
  let cb = null, es = null, peer = null, conn = null, conns = new Set(), isHost = false, state = null, code_ = null, q = [], retryT = null;
  const fresh = () => ({ solved: {}, answers: {}, rkeys: {}, cleared: {}, hints: {}, roles: {}, started: null });
  function merge(r, p) { for (const k of ["solved", "answers", "rkeys", "cleared", "names", "jots", "letters", "bearings"]) if (p[k]) Object.assign(r[k] = r[k] || {}, p[k]); if (p.hints) for (const [k, v] of Object.entries(p.hints)) r.hints[k] = Math.max(r.hints[k] || 0, v); if (p.role) { for (const k of Object.keys(r.roles)) if (r.roles[k] === p.id) delete r.roles[k]; if (!r.roles[p.role]) r.roles[p.role] = p.id; } if (p.call) { const o_ = id => id === "open" ? 0 : +id; if (!r.call || o_(p.call.id) > o_(r.call.id)) r.call = { id: p.call.id, i: p.call.i }; else if (r.call.id === p.call.id) r.call.i = Math.max(r.call.i, p.call.i); } if (p.start && !r.started) r.started = Date.now(); if (p.lit) r.lit = true; }
  const emit = s => { if (cb) cb(JSON.parse(JSON.stringify(s))); };
  function publish() { state.online = conns.size + 1; try { localStorage.setItem(SK(code_), JSON.stringify(state)); } catch (e) {} for (const c of conns) if (c.open) c.send({ state }); emit(state); }
  function startHost(code) { return new Promise((res, rej) => { let tries = 0; const go = () => { peer = new Peer(PFX + code.toLowerCase(), { debug: 0 }); peer.on("open", () => { isHost = true; code_ = code; res(); });
    peer.on("connection", c => { c.on("open", () => { conns.add(c); publish(); }); c.on("data", d => { if (d && d.patch) { merge(state, d.patch); publish(); } }); c.on("close", () => { conns.delete(c); publish(); }); });
    peer.on("error", e => { if (e.type === "unavailable-id" && tries++ < 6) { peer.destroy(); setTimeout(go, 4000); } else if (!isHost) rej(e); }); peer.on("disconnected", () => { try { peer.reconnect(); } catch (e) {} }); }; go(); }); }
  function joinPeer(code) { return new Promise(res => { let settled = false; const t = setTimeout(() => { if (!settled) { settled = true; res(null); } }, 10000); if (peer) peer.destroy(); peer = new Peer({ debug: 0 }); code_ = code;
    const open = () => { conn = peer.connect(PFX + code.toLowerCase(), { reliable: true }); conn.on("open", () => { const p = q; q = []; p.forEach(x => conn.send({ patch: x })); }); conn.on("data", d => { if (d && d.state) { state = d.state; if (!settled) { settled = true; clearTimeout(t); res(state); } emit(state); } }); conn.on("close", () => { if (state) { state.online = 1; emit(state); } clearTimeout(retryT); retryT = setTimeout(open, 5000); }); conn.on("error", () => {}); };
    peer.on("open", open); peer.on("error", e => { if (e.type === "peer-unavailable" && settled) { clearTimeout(retryT); retryT = setTimeout(open, 5000); } }); }); }
  return {
    peer: peerMode,
    async create() { if (!peerMode) return (await (await fetch("/api/create", { method: "POST" })).json()).code; let c; c = [...Array(4)].map(() => "ABCDEFGHJKMNPQRSTUVWXYZ"[Math.floor(Math.random() * 23)]).join(""); state = fresh(); code_ = c; await startHost(c); publish(); return c; },
    async room(code) { if (!peerMode) { const r = await fetch(`/api/room?code=${code}`); return r.ok ? r.json() : null; } if (isHost && code === code_) return state; const saved = localStorage.getItem(SK(code)); if (saved) { state = JSON.parse(saved); code_ = code; try { await startHost(code); publish(); return state; } catch (e) { return null; } } return joinPeer(code); },
    listen(code, id, fn) { cb = fn; if (!peerMode) { if (es) es.close(); es = new EventSource(`/api/events?code=${code}&id=${id}`); es.onmessage = e => fn(JSON.parse(e.data)); return; } if (state) emit(state); },
    update(p) { if (!peerMode) return fetch("/api/update", { method: "POST", body: JSON.stringify(p) }); if (isHost) { merge(state, p); publish(); } else if (conn && conn.open) conn.send({ patch: p }); else q.push(p); return Promise.resolve(); },
    close() { cb = null; if (es) { es.close(); es = null; } clearTimeout(retryT); try { if (peer) peer.destroy(); } catch (e) {} peer = null; conn = null; conns = new Set(); isHost = false; }
  };
})();
