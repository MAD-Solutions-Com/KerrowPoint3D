/* Round 5 (13 Nov): the office sea view and spyglass, the new signal book, the lightning glimpse, the lamp panel, clue popups and the clue gallery,
   the corner layout, pointing tutorial tips, music, the new ending, and panning on narrow screens. Loaded after game.js; it hooks in through R5.* calls
   and by replacing a few of game.js / journal.js's functions. No answers live here: the ship's signal, the letter and the ending papers arrive
   encrypted in the part rewards, and the lamp is checked against a scrambled code. */
const R5 = (() => {
  const SAFE = [.12, .10, .88, .80], sleep = ms => new Promise(r => setTimeout(r, ms)), now = () => performance.now() / 1000;
  const mk = (tag, id, cls, html) => { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; if (html) e.innerHTML = html; document.body.appendChild(e); return e; };
  const spyMask = mk("div", "spyMask"), lightCv = mk("canvas", "lightCv"), lampP = mk("div", "lampP"), spyB = mk("button", "spyB", "es-btn", "Look through the spyglass"), inv2 = mk("div", "inv2"), cview = mk("div", "cview"), endS = mk("div", "endS");
  [spyMask, lampP, spyB, inv2, cview, endS].forEach(e => e.hidden = true); MODALS.push("cview");

  /* ---------- clues: names, the parts they belong to, and their pictures (flat papers where we have them, the render otherwise) ---------- */
  const CL = {
    log: ["The keeper's log", [1], "rooms/tower/book/b.jpg"], chart: ["Air-pressure chart", [1], "data/chart.svg"], weather: ["Weather book", [1], "rooms/office/weather/b.jpg"],
    plate: ["Brass plate", [2, 7], "rooms/lamp/plate/b.jpg"], gauge: ["Oil gauge", [2, 7], "rooms/lamp/gauge/b.jpg"], oil: ["Oil book", [2], "rooms/lamp/oilbook/b.jpg"],
    receipt: ["Treloar's receipt", [2], "rooms/office/doorv/b.jpg"], cans: ["Barrel and cans", [2], "rooms/store/cansv/b.jpg"], board: ["Notices on the board", [2, 3, 7], "rooms/office/board/b.jpg"],
    pilot: ["Pilot's book: lights of this coast", [3, 7], "rooms/tower/pilot/b.jpg"], report: ["Watch report", [3], "rooms/office/reportv/b.jpg"], bearings: ["The chart", [3], "rooms/office/tchart/b.jpg"],
    sight: ["Noted bearings", [3], null], sight2: ["Noted bearings", [3], null], sill: ["On the sill", [3, 4], null], morse: ["Morse card", [4], "rooms/tower/morse/b.jpg"], signal: ["Signal book", [4], null],
    berths: ["Keeper's list of berths", [5], "rooms/tower/berthsv/b.jpg"], tags: ["Tag board", [5], "rooms/office/tagv/b.jpg"], moor: ["Mooring book", [5, 6], "rooms/office/moorbook/b.jpg"], glimpse: ["Glimpse of the ship", [5], "glimpse"],
    tide: ["Tide curve", [6], "data/tide.svg"], barnotice: ["Bar notice", [6], "data/barnotice.svg"], register: ["Harbour register", [6], "rooms/office/register/b.jpg"],
    manual: ["Service manual", [7], null], lighttime: ["Tonight's lighting time", [7], null] };
  for (const k of Object.keys(CLUE_NOW)) delete CLUE_NOW[k]; for (const k of Object.keys(CLUE_PART)) delete CLUE_PART[k];
  for (const [k, [n, ps]] of Object.entries(CL)) { CLUES[k] = n; CLUE_NOW[k] = ps; CLUE_PART[k] = Math.max(...ps); }
  const partsOf = k => (CL[k] || [0, []])[1], imgOf = k => { const s = CL[k] && CL[k][2]; return s === "glimpse" ? G.glimpse || null : s; };
  function pop(html, cls, ms) { const b = $("corner"), e = document.createElement("div"); e.className = "cpop " + (cls || ""); e.innerHTML = html; b.appendChild(e); const t = setTimeout(() => e.remove(), ms); e.onclick = () => { clearTimeout(t); e.remove(); if (cls === "new") { sfx.page(); openJournal("clues"); } }; e.style.pointerEvents = "auto"; }
  function noteClue(k) {
    if (!k || G.clues.includes(k)) return; G.clues.push(k); save(); if (!CL[k] || !N) return;
    const n = curPart(), ps = partsOf(k);
    if (ps.includes(n)) { const im = imgOf(k); tone(880, 0, .5, "sine", .05); tone(1320, .08, .6, "sine", .035); pop(`${im ? `<img src="${im}" alt="">` : ""}<span><b>New clue</b> &middot; ${esc(CL[k][0])}</span>`, "new", 4000); }
    else if (Math.min(...ps) > n) { play("pencil", .35) || sfx.tick(); pop(`<span><b>Noted for later</b> &middot; ${esc(CL[k][0])}</span>`, "later", 2500); G.early = { ...(G.early || {}), [k]: 1 }; save(); }
  }
  function partStarted(n) { if (n === 7 && G.lightAt) noteClue("lighttime"); if ((G.partPop || {})[n]) return; G.partPop = { ...(G.partPop || {}), [n]: 1 }; save(); const saved = G.clues.filter(k => (G.early || {})[k] && Math.min(...partsOf(k)) === n).length; if (saved) setTimeout(() => pop(`<span><b>${saved} clue${saved === 1 ? "" : "s"} already saved</b> &middot; in your notebook</span>`, "new", 4500), 900); }

  /* the clue gallery: a collage of what is still relevant, each opening fullscreen with zoom and drag */
  function cluesPage() {
    const n = curPart(), got = G.clues.filter(k => CL[k] && Math.min(...partsOf(k)) <= n), uniq = [...new Set(got.map(k => k === "sight2" ? "sight" : k))];
    const now = uniq.filter(k => partsOf(k).includes(n) || (Math.max(...partsOf(k)) >= n)), old = uniq.filter(k => !now.includes(k));
    const tile = k => { const im = imgOf(k), again = partsOf(k).includes(n) && Math.min(...partsOf(k)) < n, nu = !(G.clueSeen || {})[k]; return `<button class="ctile" data-g="${k}">${im ? `<img src="${im}" alt="">` : `<span class="ctext">${esc(CL[k][0])}</span>`}<i>${esc(CL[k][0])}</i>${nu ? `<b class="cdot new" title="New"></b>` : again ? `<b class="cdot" title="Needed again"></b>` : ""}</button>`; };
    return `<h2>Clues</h2>${now.length ? `<div class="cgrid">${now.map(tile).join("")}</div>` : `<p class="lab">${got.length ? "Nothing yet for this part. Keep looking." : "Anything written that you find will be kept here."}</p>`}${old.length ? `<details class="solved"${jOld ? " open" : ""}><summary>Solved (${old.length})</summary><div class="cgrid sm">${old.map(tile).join("")}</div></details>` : ""}`;
  }
  let cz = { s: 1, x: 0, y: 0 };
  function openClue(k) {
    G.clueSeen = { ...(G.clueSeen || {}), [k]: 1 }; save(); const im = imgOf(k), txt = k === "signal" ? signalText() : k === "sight" ? bearingsText() : k === "glimpse" ? `<h3>Glimpse of the ship</h3><p>A flash of lightning, and for a moment the ship off the bar stood black against the sky.</p>` : k === "lighttime" ? `<h3>Tonight's lighting time</h3><p>The Margaret can cross the bar at ${esc(G.lightAt || "")}. Light the great lamp then.</p>` : readText(k);
    cview.innerHTML = `<div class="cvbar"><b>${esc(CL[k][0])}</b><span>${im ? "Scroll or use + and − to zoom. Drag to move." : ""}</span>${im ? `<button class="es-inlay sm" id="cvTxt">Read as text</button><button class="es-inlay sm" id="cvIn">+</button><button class="es-inlay sm" id="cvOut">−</button>` : ""}<button class="es-inlay sm" id="cvX">Close</button></div>` + (im ? `<div class="cvimg" id="cvImg"><img src="${im}" alt="" draggable="false"></div>` : "") + `<div class="cvtext plain"${im ? " hidden" : ""} id="cvT">${txt}</div>`;
    showM("cview"); cz = { s: 1, x: 0, y: 0 }; const I = cview.querySelector("#cvImg img"), apply = () => { if (I) I.style.transform = `translate(${cz.x}px,${cz.y}px) scale(${cz.s})`; };
    $("cvX").onclick = () => { sfx.page(); hideM("cview"); }; if (!I) return;
    $("cvIn").onclick = () => { cz.s = Math.min(6, cz.s * 1.4); apply(); }; $("cvOut").onclick = () => { cz.s = Math.max(1, cz.s / 1.4); if (cz.s === 1) cz.x = cz.y = 0; apply(); };
    $("cvTxt").onclick = () => { const t = $("cvT"); t.hidden = !t.hidden; $("cvImg").hidden = !t.hidden; $("cvTxt").textContent = t.hidden ? "Read as text" : "Show the picture"; };
    const box = $("cvImg"); box.onwheel = e => { e.preventDefault(); cz.s = Math.min(6, Math.max(1, cz.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); if (cz.s === 1) cz.x = cz.y = 0; apply(); };
    let d = null; box.onpointerdown = e => { d = { x: e.clientX - cz.x, y: e.clientY - cz.y }; box.setPointerCapture(e.pointerId); }; box.onpointermove = e => { if (!d) return; cz.x = e.clientX - d.x; cz.y = e.clientY - d.y; apply(); }; box.onpointerup = () => { d = null; };
  }
  function bearingsText() { const B = Object.entries((N && N.bearings) || {}).filter(([k]) => k.startsWith(G.role === "tower" ? "tower" : "harbour")); return `<h3>Noted bearings</h3>${B.length ? `<ul>${B.map(([k, d]) => `<li>${pad3(d)}°, ${LNAME[k.split(":")[1]]}</li>`).join("")}</ul>` : "<p>None noted yet.</p>"}`; }
  document.addEventListener("click", e => { const t = e.target.closest && e.target.closest(".plain img.zoomable"); if (!t) return; const k = Object.keys(CL).find(c => CL[c][2] === t.getAttribute("src")); if (k) { if (slipClose) slipClose(); openClue(k); } });

  /* ---------- corners: notebook and messages bottom left (with the clue pop-ups above them), the pocket bottom right ---------- */
  function renderInv() {
    $("inv").innerHTML = `<div class="es-tray"><button class="es-pocket" id="jrnBtn" title="Notebook" aria-label="Notebook"><span class="es-well"><span class="nbk"></span></span>Notebook</button><button class="es-pocket" id="logBtn" title="Everything Mr Quick said" aria-label="Messages"><span class="es-well"><span class="mpad"><i></i><i></i><i></i><b></b></span></span>Messages</button></div>`;
    inv2.innerHTML = G.items.length ? `<div class="es-tray">${G.items.map(i => `<button class="es-pocket" data-i="${i}" title="${ITEMS[i][0]}" aria-label="${ITEMS[i][0]}"><span class="es-well"><img src="rooms/icons/${i}.jpg" alt=""></span>${ITEMS[i][0].replace(/^(Box of|Hurricane) /, "")}</button>`).join("")}</div>` : "";
    inv2.hidden = $("inv").hidden || !G.items.length;
    $("jrnBtn").onclick = () => { sfx.page(); openJournal("quick"); }; $("logBtn").onclick = () => { sfx.page(); openLog(); };
    inv2.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { sfx.tick(); const i = b.dataset.i; $("card").innerHTML = `<button class="x" id="cardX" aria-label="Close">&times;</button><img src="rooms/icons/${i}.jpg" alt=""><h3>${ITEMS[i][0]}</h3><p>${ITEMS[i][1]}</p><p class="how">Kept in your pocket. You'll use it when you find what it fits.</p>`; showM("card"); $("cardX").onclick = () => hideM("card"); });
  }
  new MutationObserver(() => { inv2.hidden = $("inv").hidden || !G.items.length; }).observe($("inv"), { attributes: true, attributeFilter: ["hidden"] });

  /* ---------- tutorial: one small speech bubble at a time, pointing at its own control ---------- */
  const TIPS = [[".mk", "Look around", "A faint circle marks something you can look at. Click to look closer. To step back, click the arrow at the bottom, or right-click."], ["#jrnBtn", "Your notebook", "To see progress and clues, check out the notebook. New clues pop up here too."], ["#logBtn", "Messages", "Everything Mr Quick has said, newest first, with his voice."], ["#task", "Ring Mr Quick", "This is what he wants to know. Ring him on the telephone with the answer, or for a hint."], ["#read", "Hard to read?", "When you look at a paper, this button shows it as plain text."], ["#menu", "The menu", "Sound, music and your room code. Your partner sees things you can't, so talk the whole way through."]];
  function tutorial() { return new Promise(res => { try { if (localStorage.getItem("kerrow-tut")) return res(); } catch (e) {} let i = 0; const T = $("tut");
    const vis = e => { if (!e || !e.getClientRects().length) return false; const r = e.getBoundingClientRect(); return r.right > 4 && r.bottom > 4 && r.left < innerWidth - 4 && r.top < innerHeight - 4; }, pickEl = sel => [...document.querySelectorAll(sel)].filter(vis).sort((a, b) => { const d = e => { const r = e.getBoundingClientRect(); return Math.hypot(r.left - innerWidth / 2, r.top - innerHeight / 2); }; return d(a) - d(b); })[0];
    const draw = () => { while (i < TIPS.length && !pickEl(TIPS[i][0])) i++; if (i >= TIPS.length) { hideM("tut"); try { localStorage.setItem("kerrow-tut", "1"); } catch (e) {} return res(); }
      const [sel, h, p] = TIPS[i], r = pickEl(sel).getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, below = cy < innerHeight * .45, W = Math.min(340, innerWidth - 32);
      const x = Math.max(16, Math.min(innerWidth - W - 16, cx - W / 2)); T.className = "bubbles"; T.innerHTML = `<div class="tbub ${below ? "below" : "above"}" style="left:${x}px;width:${W}px;${below ? `top:${r.bottom + 16}px` : `bottom:${innerHeight - r.top + 16}px`}"><i class="tarr" style="left:${Math.max(18, Math.min(W - 18, cx - x))}px"></i><h3>${h}</h3><p>${p}</p><div class="tfoot"><span>${i + 1} of ${TIPS.length}</span><button id="tutOk">${i < TIPS.length - 1 ? "Next" : "Begin"}</button></div></div><div class="tring" style="left:${cx}px;top:${cy}px;width:${Math.max(r.width, 40) + 18}px;height:${Math.max(r.height, 40) + 18}px"></div>`;
      $("tutOk").onclick = () => { sfx.tick(); i++; draw(); }; };
    showM("tut"); draw(); }); }

  /* ---------- views: panning (office sea view, spyglass, narrow screens), office lights, safe-area marks ---------- */
  const SPY_Z = 3.5, SEA_Z = 1.35, spyR = () => Math.max(130, Math.min(innerHeight * .34, innerWidth * .5 - 300)), spyC = () => [innerWidth / 2, innerHeight * .46];
  const inCircle = (x, y) => { const [sx, sy] = Engine.toScreen(x, y), [cx, cy] = spyC(); return Math.hypot(sx - cx, sy - cy) < spyR() * .97; };
  function seq(pairs, t) { const T = pairs.reduce((a, p) => a + p[0] + p[1], 0); let u = ((t % T) + T) % T; for (const [on, off] of pairs) { if (u < on) return 1; u -= on + off; if (u < 0) return 0; } return 0; }
  function officeLights(name, meta) { const L = pub.docs.loops, spy = name === "spy", tw = twistOn();
    const def = [["gannet", t => seq(L["Gannet Rock"], t + 4.4) * 2.1, WH], ["aldo", t => seq(L["St Aldo's Head"], t + 1.3) * 2.1, WH], ["blackhen", t => (tw ? henTw(t) : seq(L["Black Hen"], t + 2.6)) * 2.1, WH], ["carn", () => 1.2, WARM], ["penmor", t => 1.15 + .15 * Math.sin(t * 2.1), [1, .72, .35]], ["red", () => 1.4, RED], ["false", t => (G.flash && !tw ? seq(G.flash, t) : irr(t)) * 2.3, [1, .95, .84]]];
    return t => { const out = []; for (const [id, fn, c] of def) { const h = meta.hots[id]; if (!h || (tw && spy && id === "false")) continue; const x = (h[0] + h[2]) / 2, y = (h[1] + h[3]) / 2; if (spy && !inCircle(x, y)) continue; let i = fn(t); if (i > 0) i *= 1 + .06 * Math.sin(t * 19 + x * 50) + .04 * Math.sin(t * 7.3 + x * 13); out.push({ x, y: 1 - y, i, c, r: spy ? .0036 : .0085 }); } return out; }; }
  /* the sea view's compass comes from the picture itself: Carn Du and Penmor Head sit at known bearings, so a re-framed render (VIEW NAMES: -4 deg / 140 deg) needs no code change */
  function seaCompass(meta) { const h = meta.hots, b = pub.docs.bearings_harbour; if (!h.carn || !h.penmor) return; const xc = (h.carn[0] + h.carn[2]) / 2, xp = (h.penmor[0] + h.penmor[2]) / 2, dc = ((+b.glow + 540) % 360) - 180, dp = ((+b.hall + 540) % 360) - 180; if (Math.abs(xp - xc) < .05) return; const F = (dp - dc) / (xp - xc); W_.views.bayH.compass = [Math.round((dp - (xp - .5) * F) * 10) / 10, Math.round(F * 10) / 10]; }
  /* the sea view zooms in just enough that every light the office must note (Carn Du, Penmor Head, the false light) can be dragged under the compass pointer (QA 16 Nov: the wide bayH render left 313 and 334 out of reach at 1.35x) */
  function seaZ(meta) { const h = (meta && meta.hots) || {}, xs = ["carn", "false", "penmor"].filter(k => h[k]).map(k => (h[k][0] + h[k][2]) / 2); if (!xs.length) return SEA_Z; const m = Math.min(...xs, 1 - Math.max(...xs)) - .005; return m > .05 ? Math.max(SEA_Z, Math.ceil(.5 / m * 100) / 100) : SEA_Z; }
  function optsFor(name, r) {
    twistWorld(WORLD, twistOn());
    const z = name === "spy" || name === "spyT" ? SPY_Z : name === "bayH" ? seaZ(r.meta) : 1, keep = r.opts.view && r.opts.view[2] === z;
    r.opts.view = Engine.clampView(keep ? r.opts.view : [name === "spy" ? .62 : .5, name === "spy" ? .43 : name === "spyT" ? SPYT_Y : .5, z]);
    if (name === "spy" || name === "bayH") { seaCompass(r.meta); r.opts.lights = officeLights(name, r.meta); r.opts.allLights = true; r.opts.rain = true; }
    if (name === "spyT" || (name === "bayT" && twistOn())) { WORLD.tower.views.bayT.compass = towerCompass(r.meta.hots, pub.docs.bearings_tower) || [35, 130]; r.opts.lights = twLights(lightsFor("bayT", r.meta), name === "spyT", G.flashT, inCircle); r.opts.allLights = true; r.opts.rain = true; }
  }
  const sea = () => view === "bayH" || view === "spy" || view === "spyT", CV = () => W_.views[view === "spyT" ? "bayT" : "bayH"].compass, compassAz = () => { const V = CV(), v = rec.opts.view; return V[0] + (v[0] - .5) * V[1]; };
  function roseTick() { if (!W_ || !rec || !sea()) return; const a = ((compassAz() % 360) + 360) % 360; $("roseCard").style.transform = `rotate(${-a}deg)`; $("roseRead").textContent = pad3(a) + "°";
    if (view === "spyT" && !(G.saw || {}).twin && Math.abs(((a - SHIP_AZ() + 540) % 360) - 180) < 2.5) { G.saw = { ...(G.saw || {}), twin: 1 }; save(); thought(TW_TXT.twin); } }
  let drag = null, swallow = false;
  C.addEventListener("pointerdown", e => { if (e.button || !W_ || !rec || anyOpen() || busy || !$("title").hidden) return; const v = rec.opts.view; if (!v) return; const [sx, sy] = Engine.scale(); if (v[2] <= 1 && sx > .999 && sy > .999) return; drag = { x: e.clientX, y: e.clientY, v: [...v], moved: false }; });
  addEventListener("pointermove", e => { if (!drag || !rec) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.hypot(dx, dy) < 7) return; drag.moved = true; const [sx, sy] = Engine.scale(), v = drag.v;
    rec.opts.view = Engine.clampView([v[0] - dx / innerWidth * sx / v[2], v[1] - (sea() ? 0 : dy / innerHeight * sy / v[2]), v[2]]); roseTick(); $("marks").innerHTML = ""; });
  addEventListener("pointerup", () => { if (!drag) return; if (drag.moved) { swallow = true; setTimeout(() => swallow = false, 0); sfx.ratchet(); placeMarks(); } drag = null; });
  addEventListener("keydown", e => { if (!W_ || !rec || !sea() || anyOpen() || !(e.key === "ArrowLeft" || e.key === "ArrowRight")) return; const V = CV(), v = rec.opts.view; rec.opts.view = Engine.clampView([v[0] + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 5 : 1) / V[1], v[1], v[2]]); roseTick(); sfx.ratchet(); });
  function safeAt(r, at) { if (at[0] >= SAFE[0] && at[0] <= SAFE[2] && at[1] >= SAFE[1] && at[1] <= SAFE[3]) return at; const a = [Math.max(r[0], SAFE[0]), Math.max(r[1], SAFE[1]), Math.min(r[2], SAFE[2]), Math.min(r[3], SAFE[3])]; return a[0] < a[2] && a[1] < a[3] ? [(a[0] + a[2]) / 2, (a[1] + a[3]) / 2] : at; }
  function noteHarbour() { noteBearing("harbour", ((compassAz() % 360) + 360) % 360, harbourLights()); }

  /* ---------- the signal book: the office marks Dot / Dash / Stop in the spyglass, the tower reads the boxes live ---------- */
  const J = () => (N && N.jots) || {}, rowsOf = () => { const j = J(), cur = +(j.cur || 0), out = []; for (let r = 0; r <= cur; r++) out.push((j[r] || "").split("/")); return out; };
  function jot(d) { const j = J(), cur = +(j.cur || 0), row = j[cur] || "", open = row.split("/").pop(); let patch;
    if (d === "." || d === "-") { if (open.length >= 6) return; patch = { [cur]: row + d }; sfx.pencil(); }
    else if (d === "/") { if (open) patch = { [cur]: row + "/" }; else if (row) patch = { cur: String(cur + 1), [cur + 1]: "" }; else return; sfx.tick(); }
    else { if (row) patch = { [cur]: row.slice(0, -1) }; else if (cur > 0) patch = { cur: String(cur - 1) }; else return; sfx.pencil(); }
    N.jots = { ...j, ...patch }; post({ jots: patch }); flashSheet(); }
  function signalText() { const L = (N && N.letters) || {}; return `<h3>Signal book</h3>${rowsOf().map((bx, r) => `<p>Round ${r + 1}: ${bx.filter(b => b).map((b, i) => `${b.replace(/\./g, "•").replace(/-/g, "—")} ${L[r + "_" + i] ? "(" + esc(L[r + "_" + i]) + ")" : ""}`).join(" &nbsp;|&nbsp; ") || "nothing yet"}</p>`).join("")}`; }
  function sheet() { const F = $("flash"), tw = twistOn(), harb = marker(), L = (N && N.letters) || {}, rows = rowsOf(), first = Math.max(0, rows.length - 3), ae = document.activeElement, fo = ae && ae.dataset ? ae.dataset.l : undefined;
    F.className = "sbook2" + (harb ? " office" : " tw");
    const other = tw ? "tower" : "office", steps = harb ? [tw ? "Find the ship in the spyglass, at the bearing you noted. Black Hen lighthouse stands close by." : "Find the ship in the spyglass, at the bearing you noted.", "<b>Dot</b> for a short flash, <b>Dash</b> for a long one, <b>Stop</b> after each letter.", "Stop twice starts a new round. Keys: . &ndash; Space, Backspace."] : [`The ${other} marks the flashes; one box is one letter.`, "Find each box on the Morse card and write its letter.", `Tap ? on a box to ask the ${other} to watch that letter again.`];
    F.innerHTML = `<div class="sbl"><div class="kick">Kerrow Harbour</div><h3>Signal book</h3><ol>${steps.map(t => `<li>${t}</li>`).join("")}</ol>${harb ? `<div class="sigpad"><button class="sg" data-d=".">Dot</button><button class="sg" data-d="-">Dash</button><button class="sg stop" data-d="/">Stop</button><button class="sg rub" data-d="x">Rub out</button></div>` : ""}</div><div class="srows">`
      + rows.slice(first).map((bx, k) => { const r = first + k; return `<div class="srow"><span class="rn">${r + 1}</span>${bx.map((b, i) => { const open = i === bx.length - 1, q = L["q" + r + "_" + i]; if (open && !b && !(harb && r === rows.length - 1)) return ""; return `<div class="sbox${open ? " open" : ""}${q ? " ask" : ""}"><span class="fj">${pills(b)}</span>${!harb && !open ? `<button class="sq" data-q="${r}_${i}" title="Ask the ${other} to watch this letter again">?</button>` : q ? `<b class="qm">?</b>` : ""}${open ? "" : `<input class="fl" data-l="${r}_${i}" maxlength="1" value="${esc(L[r + "_" + i] || "")}" aria-label="Letter" autocomplete="off"${harb ? " readonly" : ""}>`}</div>`; }).join("")}</div>`; }).join("") + `</div>`;
    F.querySelectorAll(".sg").forEach(b => b.onclick = () => jot(b.dataset.d));
    F.querySelectorAll(".sq").forEach(b => b.onclick = () => { const k = "q" + b.dataset.q, v = L[k] ? "" : "?"; sfx.pencil(); N.letters = { ...L, [k]: v }; post({ letters: { [k]: v } }); sheet(); });
    F.querySelectorAll(".fl").forEach(x => { x.oninput = () => { x.value = x.value.toUpperCase().replace(/[^A-Z]/g, ""); N.letters = { ...((N && N.letters) || {}), [x.dataset.l]: x.value }; post({ letters: { [x.dataset.l]: x.value } }); }; x.onkeydown = e => e.stopPropagation(); });
    if (fo !== undefined) { const el = F.querySelector(`.fl[data-l="${fo}"]`); if (el) { el.focus(); el.setSelectionRange(9, 9); } }
    const sr = F.querySelector(".srows"); if (sr) sr.scrollTop = sr.scrollHeight; }
  addEventListener("keydown", e => { if (view !== padView() || !G.flash || anyOpen() || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || "")) return; const d = e.key === "." ? "." : e.key === "-" ? "-" : e.key === " " ? "/" : e.key === "Backspace" ? "x" : null; if (!d) return; e.preventDefault(); e.stopImmediatePropagation(); jot(d); }, true);

  /* ---------- lightning over the bay (tower, from part 5): a flash every 6-15 s; the first one with the ship on screen is kept as a clue ---------- */
  const LZ = { next: null, misses: 0, a: 0 }, SHIP_AZ = () => +pub.docs.bearings_tower.flasher;
  const lightOn = () => G.role === "tower" && N && N.solved && N.solved[4] && W_ && (view === "gallery" || view === "bayT") && !busy && !anyOpen() && $("title").hidden && !N.lit;
  function shipPos() { if (view === "gallery" && panoImg) { const Wp = panoImg.width, Hp = panoImg.height, s = innerHeight / (Hp * .78), dx = ((SHIP_AZ() - head + 540) % 360 - 180) / 360 * Wp * s, h = GP.meta && GP.meta.hots && GP.meta.hots.false; return [innerWidth / 2 + dx, h ? ((h[1] + h[3]) / 2 * Hp - Hp * .1) * s : innerHeight * .52, innerHeight * .045]; }
    if (view === "bayT" && rec && rec.meta.hots.false) { const h = rec.meta.hots.false, [x, y] = Engine.toScreen((h[0] + h[2]) / 2, (h[1] + h[3]) / 2); return [x, y, innerHeight * .05]; } return null; }
  function drawShip(c, x, y, h, roll) { const w = h * 1.7; c.save(); c.translate(x, y); c.rotate(roll); c.fillStyle = "#040507"; c.beginPath(); c.moveTo(-w * .5, -h * .1); c.lineTo(w * .52, -h * .16); c.quadraticCurveTo(w * .42, h * .14, w * .2, h * .16); c.lineTo(-w * .42, h * .13); c.quadraticCurveTo(-w * .52, h * .05, -w * .5, -h * .1); c.fill();
    c.fillRect(-w * .44, -h * .42, w * .25, h * .34); c.fillRect(-w * .40, -h * .48, w * .03, h * .08);
    const mast = (mx, mh, lean) => { c.beginPath(); c.moveTo(mx - w * .014, -h * .1); c.lineTo(mx + lean - w * .009, -h * .1 - mh); c.lineTo(mx + lean + w * .009, -h * .1 - mh); c.lineTo(mx + w * .014, -h * .1); c.fill(); c.fillRect(mx + lean * .6 - w * .07, -h * .1 - mh * .62, w * .14, h * .035); };
    mast(w * .26, w * .92, w * .01); mast(-w * .16, w * .6, -w * .03); c.restore(); }
  const SIL = []; let silTried = false; const silLoad = () => { if (silTried) return; silTried = true; [0, 1, 2].forEach(k => { const im = new Image(); im.onload = () => SIL.push(im); im.src = `rooms/gallery/glimpse/glimpse_sil_${k}.png`; }); };   // the rendered shapes, once the overnight chain has copied them in
  function drawFlash(a) { const c = lightCv.getContext("2d"), W = lightCv.width = innerWidth, H = lightCv.height = innerHeight; c.clearRect(0, 0, W, H); if (a <= 0) return null;
    const g = c.createLinearGradient(0, 0, 0, H * .62); g.addColorStop(0, `rgba(215,225,255,${.55 * a})`); g.addColorStop(.75, `rgba(200,212,245,${.3 * a})`); g.addColorStop(1, "rgba(200,210,240,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H * .62);
    const p = shipPos(); if (!p) return null; const on = p[0] > W * .06 && p[0] < W * .94; if (on) { const im = SIL.length ? SIL[Math.floor(now() * 7) % SIL.length] : null; if (im && view === "gallery" && panoImg) { const w = panoImg.width * innerHeight / (panoImg.height * .78) * 7 / 360, h = w * im.height / im.width; c.drawImage(im, p[0] - w / 2, p[1] - h / 2, w, h); } else drawShip(c, p[0], p[1], p[2], Math.sin(now() * 1.3) * .05); } return on ? p : null; }
  function capture(p) { try { const base = view === "gallery" ? $("pano") : Engine.canvas, k = base.width / innerWidth, cw = innerHeight * .5, ch = cw * 9 / 16, x0 = p[0] - cw / 2, y0 = p[1] - ch * .62, out = document.createElement("canvas"); out.width = 640; out.height = 360; const c = out.getContext("2d");
      c.drawImage(base, x0 * k, y0 * k, cw * k, ch * k, 0, 0, 640, 360); c.drawImage(lightCv, x0, y0, cw, ch, 0, 0, 640, 360); return out.toDataURL("image/jpeg", .82); } catch (e) { console.warn("glimpse", e); return null; } }
  async function strike() { silLoad(); const pulses = [[0, 100, 1], [170, 200, 1.25]]; let saw = null; play("thunder", 0); if (view === "bayT") Engine.lightning(2.4);
    for (const [at, d, a] of pulses) { await sleep(at ? 70 : 0); const t0 = performance.now(); while (performance.now() - t0 < d) { const p = drawFlash(a * (1 - (performance.now() - t0) / d * .35)); if (p) saw = p; if (p && a > 1 && !G.glimpse && performance.now() - t0 > d * .4) { const u = capture(p); if (u) { G.glimpse = u; save(); } } await sleep(16); } }
    drawFlash(0); setTimeout(() => play("thunder", .35 + Math.random() * .2), 1000 + Math.random() * 3000);
    if (saw && G.glimpse && !G.clues.includes("glimpse")) { noteClue("glimpse"); thought("There she is! Just for a moment."); LZ.misses = 0; }
    else if (!saw && !G.glimpse && ++LZ.misses >= 3) { LZ.misses = 0; thought("The lightning lights up the whole bay. Where's that ship?"); } }
  setInterval(() => { if (!lightOn()) { LZ.next = null; return; } const t = performance.now(); if (LZ.next === null) LZ.next = t + 2000 + Math.random() * 2000; if (t >= LZ.next) { LZ.next = t + 6000 + Math.random() * 9000; strike(); } }, 200);

  /* ---------- the lamp: set every value, then "Start lamp" checks them all against a scrambled code ----------
     LAMP-ROOM-LAYOUT (16 Nov): once rooms/lamp.json has the close-ups pump / valve / clock / cup, each setting is made at its own instrument
     (the panel there shows only that control, plus Start lamp); the burner view keeps the reserve can. Until then the burner shows the full panel.
     The valve starts SHUT and the clockwork STOP, as on the new dial faces. */
  const LS = () => (G.lamp = G.lamp || { poured: false, lb: 0, v: -1, c: -1, cup: 0 }), PD = () => pub.docs.lamp;
  const cupLeft = () => Math.max(0, (LS().cup - Date.now()) / 1000);
  const LAMP_CU = new Set(), CU_CARD = { pump: "pump", valve: "valve", clock: "clock", cup: "cup" };
  function lampOn(j) { const B = WORLD.tower.views.burner, jb = (j.burner && j.burner.hots) || {};
    for (const [hot, cu] of [["pump", "pump"], ["valve", "valve"], ["clock", "clock"], ["cup", "cup"], ["press", "pump"]]) if (j[cu] && jb[hot]) { B.hots[hot] = hot === "press" ? { type: "go", view: cu, label: "Pressure gauge" } : { type: "go", view: cu }; LAMP_CU.add(cu); }
    if (jb.gauge) B.hots.gauge = { type: "go", view: "bgauge", label: "Oil gauge" };
    if (jb.can && LAMP_CU.size) B.hots.can = { type: "lamp", act: "pour", label: "Reserve can" }; }
  const lampLive = () => !!(N && N.solved && N.solved[6] && !N.lit);
  function lampOv(name) { const s = G.lamp, o = []; if (!s) return o; const on = { s0: s.poured, s1: s.lb > 0, s2: cupLeft() > 0, s3: s.v >= 0, s4: s.c >= 0 };
    if (name === "burner") for (const k in on) if (on[k]) o.push(k);
    if (name === "pump" && on.s1) o.push("s1"); if (name === "valve" && on.s3) o.push("s3"); if (name === "clock" && on.s4) o.push("s4"); if (name === "cup" && on.s2) o.push("lit");
    if ((name === "gauge" || name === "bgauge") && s.poured) o.push("poured"); return o; }
  let lpMode = "all";
  function lampHtml() { const s = LS(), P = PD(), lb = s.lb, ang = -120 + lb / 60 * 240, v = s.v >= 0 ? P.valve[s.v] : null, CK = ["STOP", ...P.clock], left = cupLeft();
    const ticks = [...Array(13)].map((_, k) => { const a = (-120 + k * 20) * Math.PI / 180, r1 = 52, r2 = k % 2 ? 46 : 42; return `<line x1="${60 + r1 * Math.sin(a)}" y1="${62 - r1 * Math.cos(a)}" x2="${60 + r2 * Math.sin(a)}" y2="${62 - r2 * Math.cos(a)}" stroke="#231e16" stroke-width="${k % 2 ? 1 : 2}"/>${k % 2 ? "" : `<text x="${60 + 34 * Math.sin(a)}" y="${66 - 34 * Math.cos(a)}" font-size="9" text-anchor="middle" fill="#231e16">${k * 5}</text>`}`; }).join("");
    const cupTxt = left > 0 ? `Burning: ${Math.ceil(left)} s` : "Not lit", C = {
      can: `<div class="lpc"><h4>Reserve can</h4><svg viewBox="0 0 120 110" class="lpsvg"><rect x="34" y="20" width="52" height="78" rx="6" fill="${s.poured ? "#5a4a33" : "#7a2a1c"}" stroke="#2b2115" stroke-width="3"/><rect x="50" y="10" width="20" height="12" fill="#a9803a"/>${s.poured ? "" : `<path d="M44 46h32" stroke="#e8c47c" stroke-width="5"/>`}</svg><p class="lpv">Oil gauge: ${s.poured ? P.reserve : 0} litres</p>${s.poured ? `<p class="lpok">Poured</p>` : `<button class="es-inlay sm" id="lpPour">Break the seal and pour</button>`}</div>`,
      pump: `<div class="lpc"><h4>Pump</h4><svg viewBox="0 0 120 84" class="lpsvg"><path d="M8 62 A52 52 0 1 1 112 62" fill="#efe6d3" stroke="#a9803a" stroke-width="5"/>${ticks}<text x="60" y="80" font-size="8" text-anchor="middle" fill="#231e16">lb per sq in</text><line x1="60" y1="62" x2="${60 + 44 * Math.sin(ang * Math.PI / 180)}" y2="${62 - 44 * Math.cos(ang * Math.PI / 180)}" stroke="#8c2b20" stroke-width="3" stroke-linecap="round" class="needle"/><circle cx="60" cy="62" r="5" fill="#2b2115"/></svg><p class="lpv">${lb} lb</p><div class="lpb"><button class="es-inlay sm" id="lpPump">Pump</button><button class="es-inlay sm" id="lpRel">Release</button></div></div>`,
      valve: `<div class="lpc"><h4>Oil valve</h4><svg viewBox="0 0 120 84" class="lpsvg"><g transform="rotate(${(s.v + 1) * 30} 60 42)"><circle cx="60" cy="42" r="34" fill="none" stroke="#a9803a" stroke-width="7"/>${[0, 60, 120].map(a => `<line x1="60" y1="42" x2="${60 + 34 * Math.cos(a * Math.PI / 180)}" y2="${42 + 34 * Math.sin(a * Math.PI / 180)}" stroke="#a9803a" stroke-width="5"/><line x1="60" y1="42" x2="${60 - 34 * Math.cos(a * Math.PI / 180)}" y2="${42 - 34 * Math.sin(a * Math.PI / 180)}" stroke="#a9803a" stroke-width="5"/>`).join("")}<path d="M60 4v14" stroke="#8c2b20" stroke-width="4" stroke-linecap="round"/></g><circle cx="60" cy="42" r="7" fill="#2b2115"/></svg><p class="lpv">${v === null ? "Shut" : `${v.toFixed(2)} litres an hour`}</p><div class="lpb"><button class="es-inlay sm" id="lpV-">&lsaquo; Less</button><button class="es-inlay sm" id="lpV+">More &rsaquo;</button></div></div>`,
      clock: `<div class="lpc"><h4>Clockwork</h4><svg viewBox="0 0 120 84" class="lpsvg"><circle cx="60" cy="44" r="36" fill="#efe6d3" stroke="#a9803a" stroke-width="5"/>${CK.map((n, k) => { const a = (-120 + k * 40) * Math.PI / 180; return `<text x="${60 + 25 * Math.sin(a)}" y="${47 - 25 * Math.cos(a)}" font-size="${k ? 8.5 : 6.5}" text-anchor="middle" fill="${k === s.c + 1 ? "#8c2b20" : "#231e16"}">${n}</text>`; }).join("")}<line x1="60" y1="44" x2="${60 + 16 * Math.sin((-120 + (s.c + 1) * 40) * Math.PI / 180)}" y2="${44 - 16 * Math.cos((-120 + (s.c + 1) * 40) * Math.PI / 180)}" stroke="#8c2b20" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="44" r="4" fill="#2b2115"/></svg><p class="lpv">${s.c < 0 ? "Stopped" : `${P.clock[s.c]} turns an hour`}</p><div class="lpb"><button class="es-inlay sm" id="lpC-">&lsaquo; Slower</button><button class="es-inlay sm" id="lpC+">Faster &rsaquo;</button></div></div>`,
      cup: `<div class="lpc"><h4>Spirit cup</h4><svg viewBox="0 0 120 84" class="lpsvg"><path d="M30 60 Q60 78 90 60 Z" fill="#a9803a" stroke="#2b2115" stroke-width="2"/>${left > 0 ? `<path class="flame" d="M60 ${58 - 36 * left / P.cup} Q${48} 50 ${52} 58 Q60 62 ${68} 58 Q72 50 60 ${58 - 36 * left / P.cup}Z" fill="#ffc35c"/>` : ""}</svg><p class="lpv">${cupTxt}</p><div class="lpbar"><i style="width:${left / P.cup * 100}%"></i></div><button class="es-inlay sm" id="lpCup">${left > 0 ? "Burning" : "Light the spirit cup"}</button></div>`,
      state: `<div class="lpc lpst"><h4>The settings</h4><ul>${[["pump", "Pressure", `${lb} lb`], ["valve", "Oil valve", v === null ? "shut" : `${v.toFixed(2)} litres an hour`], ["clock", "Clockwork", s.c < 0 ? "stopped" : `${P.clock[s.c]} turns an hour`], ["cup", "Spirit cup", cupTxt.toLowerCase()]].filter(([k]) => LAMP_CU.has(k)).map(([, n, t]) => `<li><span>${n}</span><b>${t}</b></li>`).join("")}</ul></div>`,
      go: `<div class="lpc lpgo"><button id="lpStart" class="es-btn">Start lamp</button><p class="lpmsg" id="lpMsg"></p></div>` };
    const cards = lpMode === "all" ? ["can", "pump", "valve", "clock", "cup"] : lpMode === "burner" ? [...(LS().poured ? [] : ["can"]), ...["pump", "valve", "clock", "cup"].filter(k => !LAMP_CU.has(k)), "state"] : [lpMode];
    const say = lpMode === "all" ? "Set every value, light the spirit cup last, then start the lamp." : lpMode === "burner" ? "Click each part of the lamp to set it there. Light the spirit cup last, then start the lamp." : "Set it here, then go back to the burner for the rest. Light the spirit cup last, then start the lamp.";
    lampP.className = lpMode === "all" ? "" : "few"; lampP.style.setProperty("--n", cards.length + 1);
    return `<div class="lph"><b>The burner</b><span>${say}</span><button class="pencil" id="lpX">Close the panel</button></div><div class="lprow">${cards.map(k => C[k]).join("")}${C.go}</div>`; }
  let lpT = null;
  function lampPanel(show, name) { if (!show) { lampP.hidden = true; clearInterval(lpT); lpT = null; return; } lpMode = name === "burner" ? (LAMP_CU.size ? "burner" : "all") : CU_CARD[name]; lampP.hidden = false; drawLamp(); clearInterval(lpT); lpT = setInterval(() => { if (lampP.hidden) return; const was = LS().cupWas, left = cupLeft(); if (was && left <= 0) { LS().cupWas = false; save(); refresh(); thought("The spirit cup has burned out."); } if (left > 0 || was) drawLamp(); }, 1000); }
  async function pour() { const s = LS(), P = PD(); if (s.poured || busy) return; busy = true; play("pour", .9); const fr = [["s0c"], ["s0c", "s0g1"], ["s0c", "s0g2"]]; if (view === "burner") for (let f = 0; f < fr.length; f++) { pourAnim = fr[f]; refresh(); await sleep(f ? 1100 : 700); } else await sleep(900); pourAnim = null; s.poured = true; G.stepN = 1; save(); refresh(); busy = false; if (!lampP.hidden) drawLamp(); toast(`The reservoir fills. The gauge reads ${P.reserve} litres.`); }
  function lampAct(a) { if (a.act !== "pour") return; if (!lampLive()) { sfx.rattle(); thought(N && N.lit ? "The lamp is burning. Leave it be." : "Not yet. Mr Quick needs to know what's out there first."); return; } if (LS().poured) { thought("Empty now. It's all in the reservoir."); return; } pour(); }
  function drawLamp(msg) { const s = LS(), P = PD(); lampP.innerHTML = lampHtml(); if (msg) $("lpMsg").textContent = msg;
    const set = fx => { save(); fx(); refresh(); drawLamp(); }, on = (id, f) => { if ($(id)) $(id).onclick = f; };
    on("lpX", () => { sfx.tick(); lampP.hidden = true; }); on("lpPour", pour);
    on("lpPump", () => { if (s.lb < 60) { s.lb += 5; set(sfx.ratchet); } }); on("lpRel", () => { if (s.lb > 0) { s.lb -= 5; set(() => play("pour", .15) || sfx.tick()); } });
    on("lpV-", () => { if (s.v > -1) { s.v--; set(sfx.ratchet); } }); on("lpV+", () => { if (s.v < P.valve.length - 1) { s.v++; set(sfx.ratchet); } });
    on("lpC-", () => { if (s.c > -1) { s.c--; set(sfx.tick); } }); on("lpC+", () => { if (s.c < P.clock.length - 1) { s.c++; set(sfx.tick); } });
    on("lpCup", () => { if (cupLeft() > 0) return; if (!G.items.includes("matches")) { sfx.rattle(); thought("I need something to light this. There must be matches nearby."); return; } play("match", .9); s.cup = Date.now() + P.cup * 1000; s.cupWas = true; save(); refresh(); drawLamp(); });
    on("lpStart", async () => { if (busy) return; busy = true; $("lpMsg").textContent = "…"; play("ratchet", .9); await sleep(80);
      const code = `P${s.lb}V${String(Math.round(P.valve[s.v] * 100)).padStart(3, "0")}C${P.clock[s.c]}`, ok = s.poured && s.v >= 0 && s.c >= 0 && cupLeft() > 0 && !!KCrypto.check(vault.lamp, code); busy = false;
      if (!ok) { sfx.bad(); tone(70, .05, .5, "sawtooth", .05); s.cup = 0; s.cupWas = false; save(); refresh(); drawLamp("Check the settings again and retry."); toast("Check the settings again and retry."); return; }
      play("ignite", .9); sfx.good(); drawLamp("The lamp lights up and the lens starts spinning."); toast("The lamp lights up and the lens starts spinning."); await sleep(1600); lampPanel(false); post({ lit: true }); }); }

  /* ---------- the telephone, hints and answers for the lamp; the tide's near misses ---------- */
  function lampCall() { const n = 7, C_ = $("call"), used = N.hints[n] || 0, list = hintsFor(n);
    C_.innerHTML = `<button class="pencil hangup" id="callX">Hang up</button><p class="who">Mr Quick, on the line</p><p class="hand">${G.role === "tower" ? "Don't stand there talking. Do as the office tells you and light that lamp!" : "Read the tower the manual, step by step. Hurry!"}</p><div class="row"><button id="more" class="alt"${used >= list.length ? " disabled" : ""}>${used ? "Ask for another hint" : "Ask for a hint"}</button><button id="notyet" class="alt">Back to work</button></div><div class="hs">${list.slice(0, used).map((h, k) => `<div class="hint"><b>Hint ${k + 1}</b><p>${esc(h)}</p></div>`).join("")}</div>`; showM("call");
    $("callX").onclick = () => { sfx.hangup(); hideM("call"); }; $("notyet").onclick = () => { sfx.hangup(); hideM("call"); }; $("more").onclick = async () => { sfx.crank(); await post({ hints: { [n]: used + 1 } }); setTimeout(openCall, 150); }; }
  async function submit(part, ins) {
    const val = ins.map(b => b.value).join(""), q = question(part); if (val.length < q.len) { ins[val.length].focus(); return; }
    $("send").disabled = true; await sleep(60); const box = vault.parts[part - 1], key = KCrypto.check(box, val); let near = false; if (!key && box.near && val.length === 4 && val[3] !== "0") near = !!KCrypto.check(box.near, val.slice(0, box.near.pre)); $("send").disabled = false;
    if (!key) { sfx.bad(); const el = $("call"); el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 450); $("nope").textContent = near ? box.near.msg : twistOn() && part === 4 && /^(.)\1+$/.test(val.toUpperCase()) ? TW_TXT.wrong : "That doesn't square. Look again."; ins.forEach(b => b.value = ""); ins[0].focus(); return; }
    const b64 = btoa(String.fromCharCode(...key)); hideM("call"); await post({ solved: { [part]: true }, answers: { [part]: val }, rkeys: { [part]: b64 } }); }

  /* ---------- music: the title loop, the intro crossfade, the ending ---------- */
  const TR = { title: ["audio/music/lighthouse_darkness.mp3", .3], intro: ["audio/music/tides.mp3", .3], end: ["audio/music/relaxing_piano_strings.mp3", .35] }, M = {}; let duckK = 1;
  const mset = () => volOf("music"), master_ = () => +(localStorage.getItem("kerrow-vol") || .8);
  function mtick() { for (const [k, m] of Object.entries(M)) { m.env += Math.sign(m.goal - m.env) * Math.min(Math.abs(m.goal - m.env), .05 / Math.max(.05, m.fade)); m.a.volume = Math.max(0, Math.min(1, TR[k][1] * m.env * mset() * master_() * (k === "end" ? 1 : duckK))); if (m.goal === 0 && m.env <= 0 && !m.a.paused) m.a.pause(); } }
  setInterval(mtick, 50);
  function mplay(k, fade) { let m = M[k]; if (!m) { const a = new Audio(TR[k][0]); a.loop = true; a.preload = "auto"; m = M[k] = { a, env: 0, goal: 0, fade: 1 }; } m.fade = fade || 1; m.goal = 1; if (m.a.paused) { if (m.env <= 0) try { m.a.currentTime = 0; } catch (e) {} m.a.play().catch(() => { const go = () => { removeEventListener("pointerdown", go); removeEventListener("keydown", go); if (m.goal > 0) m.a.play().catch(() => {}); }; addEventListener("pointerdown", go); addEventListener("keydown", go); }); } }
  function mstop(k, fade) { const m = M[k]; if (m) { m.fade = fade || 1; m.goal = 0; } }
  const music = { title() { mstop("intro", 2); mstop("end", 2); mplay("title", 2); }, intro() { mstop("title", 2.5); mplay("intro", 2.5); }, fadeAll(s) { for (const k in M) mstop(k, s || 3); }, end() { for (const k in M) if (k !== "end") mstop(k, 2); mplay("end", 4); } };
  function duck(on) { duckK = on ? .65 : 1; }
  (function musicSlider() { const v = $("pVoice"); if (!v) return; const l = document.createElement("label"); l.innerHTML = `Music<input id="pMusic" type="range" min="0" max="1" step=".05">`; v.parentElement.after(l); $("pMusic").oninput = () => { setBus("music", +$("pMusic").value); }; })();

  /* ---------- the ending: the tower lights up, the Margaret comes in, the letter, the log book's note, the papers ---------- */
  async function ending() {
    busy = true; hideM("journal"); hideM("call"); hideM("cview"); thought(null); lampPanel(false); spyMask.hidden = true; spyB.hidden = true; $("read").hidden = true; $("flash").hidden = true; $("gt").hidden = true; $("marks").innerHTML = ""; $("clr").hidden = true; $("chartHelp").hidden = true; $("task").hidden = true; $("backZ").hidden = true; $("inv").hidden = true; inv2.hidden = true; $("rose").hidden = true; $("noteP").hidden = true;
    try { if (N.rkeys && N.rkeys[6]) { const r6 = KCrypto.openJson(KCrypto.b64d(N.rkeys[6]), vault.parts[5].reward); G.letter = r6.letter; G.ending = r6.ending; G.lightAt = r6.lightAt; if (r6.letterVoice) { G.letterVoice = r6.letterVoice; G.lakey = r6.akey; } save(); } } catch (e) {}
    if (G.role === "tower") { await enter("lit", 1); if (rec) rec.opts.beam = [.5, .36]; $("read").hidden = true; thought(null); await sleep(3500); }
    $("hud").hidden = true; $("menu").hidden = true; music.end(); ambSet({ out: .55, rain: .25, lp: 20000 });
    const E = G.ending || { illos: [], breaks: [], invitation: [], clipping: {} };
    endS.hidden = false; endS.className = "";
    // 1. the tower lights up: the lightup film when it exists (it ends on the ending film's first frame), else the still with a drawn beam
    const LU = await new Promise(res => { const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.onloadeddata = () => res(v); v.onerror = () => res(null); setTimeout(() => res(null), 5000); v.src = "rooms/intro/lightup.mp4"; });
    if (LU) {
      endS.innerHTML = `<section class="es on0" id="esT"></section>`; LU.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover"; $("esT").appendChild(LU); await sleep(60); $("esT").classList.add("on");
      await new Promise(res => { let done = false; const fin = () => { if (!done) { done = true; res(); } }; LU.onended = fin; LU.onerror = fin; setTimeout(fin, 14000); LU.play().then(() => setTimeout(() => play("thunder", .35), 4200)).catch(fin); });
    } else { endS.innerHTML = `<section class="es on0" id="esT"><div class="espic"><img src="ui/ending/title.jpg" alt=""><i class="esglow"></i><i class="esbeam"></i></div></section>`; await sleep(60); $("esT").classList.add("on"); setTimeout(() => play("thunder", .35), 3200); await sleep(9000); }
    // 2. the Margaret comes in; the fade to black starts ~3 s before the end, while she still moves
    endS.innerHTML = `<section class="es on" id="esF"><video src="rooms/intro/ending.mp4" muted playsinline preload="auto"></video></section>`; const V = endS.querySelector("video");
    await new Promise(res => { let done = false; const fin = () => { if (!done) { done = true; res(); } }; V.onended = fin; V.onerror = fin; V.ontimeupdate = () => { if (V.duration && V.currentTime >= V.duration - 3.2) fin(); }; setTimeout(fin, 16000); V.play().then(() => { atFilm([[.8, "foghorn", .55], [4.5, "horn", .8]]); setTimeout(() => play("thunder", .3), 6500); }).catch(fin); });
    $("esF").classList.remove("on"); await sleep(3000);
    // 3. a short dark pause while the storm moves indoors
    endS.innerHTML = ""; ambSet({ out: .3, rain: .3, lp: 700 }); await sleep(1600);
    // 4. the empty letter screen fades in, then the words fade in, then they start to scroll with Tregarth's voice; sketches of his story fade in at the words
    let t = esc(G.letter || ""); (E.breaks || []).forEach(b => { t = t.replace(esc(b), "</p><p>" + esc(b)); });
    endS.innerHTML = `<section class="es on" id="esL"><div id="pwrap" class="unfold"><div id="ppr"><p>${t}</p><p class="sign">Tregarth</p></div></div><figure class="illo left" id="il0"><div class="frame"><img alt=""></div><figcaption></figcaption></figure><figure class="illo right" id="il1"><div class="frame"><img alt=""></div><figcaption></figcaption></figure></section>`;
    $("ppr").style.transform = `translateY(${innerHeight * .58 - 56}px)`;   // where the scroll starts, so nothing jumps when it begins
    await sleep(2600); const unroll = await sfxBuf("audio/unroll.mp3"); if (unroll && ctx()) { const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = unroll; g.gain.value = .5; s.connect(g).connect(buses.fx); s.start(ac.currentTime, .8); }
    await sleep(3400); const vo = await letterVoice(), L = (G.letter || "").length, beats = (E.illos || []).map((b, i) => ({ ...b, at: Math.max(0, (G.letter || "").indexOf(b.key)) / Math.max(1, L), side: i % 2 }));
    const dur = vo ? vo.dur : Math.max(40, L / 15), t0 = now(); let cur = -1;
    await new Promise(res => { const step = () => { const f = Math.min(1, (vo ? vo.at() : now() - t0) / dur), P = $("ppr"); if (!P) return res(); P.style.transform = `translateY(${innerHeight * .58 - (56 + f * (P.offsetHeight - 126))}px)`;
      let c = -1; beats.forEach((b, i) => { if (f >= b.at - .01) c = i; });
      if (c !== cur) { cur = c; [0, 1].forEach(side => { const el = $("il" + side), b = c >= 0 && beats[c].side === side ? beats[c] : null; if (b) { el.querySelector("img").src = `ui/ending/${b.img}.jpg`; el.querySelector("figcaption").textContent = b.cap; } el.classList.toggle("on", !!b); }); }
      if (f >= 1 || (vo && vo.ended())) return res(); setTimeout(step, 33); }; step(); });
    await sleep(3500); music.fadeAll(7); $("esL").classList.remove("on"); await sleep(2600);
    // 5. the log book, with a note sticking out: click it for the papers
    const m = Math.max(1, Math.round((Date.now() - startedAt()) / 60000)), hn = Object.values(N.hints).reduce((a, b) => a + b, 0), C_ = E.clipping || {};
    endS.innerHTML = `<section class="es on" id="esB"><img class="esbook" src="rooms/tower/book/b.jpg" alt=""><button class="esnote" id="esNote" aria-label="The note in the log book"><span>${esc(E.note || "")}</span></button><p class="eshint">${esc(E.note || "")}</p></section>`;
    ambSet({ rain: .2, fire: .3, lp: 2400 });
    await new Promise(res => { $("esNote").onclick = () => { sfx.paper(); res(); }; });
    endS.innerHTML = `<section class="es on" id="esP"><div class="espapers"><div class="inv"><p class="ik">You are invited</p>${(E.invitation || []).map(l => `<p>${esc(l)}</p>`).join("")}</div><div class="clip"><p class="cpaper">${esc(C_.paper || "")} <span>${esc(C_.date || "")}</span></p><h2>${esc(C_.head || "")}</h2><h3>${esc(C_.sub || "")}</h3><p>${esc(C_.body || "")}</p><p class="cstat">Time taken: ${m} minutes. Hints used: ${hn}.</p></div></div><button class="mbtn" id="endb">Back to the title</button></section>`;
    busy = false; $("endb").onclick = () => { endS.hidden = true; G = blank(); save(); location.reload(); };
  }
  const bufs = {}; async function sfxBuf(u) { if (bufs[u]) return bufs[u]; try { if (!ctx()) return null; bufs[u] = await ac.decodeAudioData(await (await fetch(u)).arrayBuffer()); return bufs[u]; } catch (e) { return null; } }
  async function letterVoice() { const v = G.letterVoice; if (!v || !ctx()) return null; try { const a = new Uint8Array(await (await fetch(`audio/voice/${v.f}`)).arrayBuffer()), b = G.lakey ? KCrypto.stream(KCrypto.b64d(G.lakey), KCrypto.b64d(v.n), a) : a;
      const buf = await ac.decodeAudioData(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)), s = ac.createBufferSource(); s.buffer = buf; s.connect(buses.voice); let end = false; s.onended = () => end = true; const t0 = ac.currentTime + .05; s.start(t0); return { dur: buf.duration, at: () => ac.currentTime - t0, ended: () => end }; } catch (e) { console.warn("letter voice", e); return null; } }

  /* ---------- per view: what R5 shows ---------- */
  function ui(name) {
    const off = G.role === "office", tw = twistOn(), spyV = name === "spy" || name === "spyT", isSea = name === "bayH" || spyV; twistWorld(WORLD, tw);
    spyMask.hidden = !spyV; spyB.hidden = !(tw ? !off && name === "bayT" : off && name === "bayH"); $("hbc").hidden = true;
    $("rose").hidden = !isSea; $("noteP").hidden = name !== "bayH"; document.body.classList.toggle("insea", isSea); document.body.classList.toggle("inspy", spyV); if (isSea) roseTick();
    const showF = !!G.flash && (name === padView() || name === readView()); $("flash").hidden = !showF; if (showF) sheet();
    lampPanel((name === "burner" || !!CU_CARD[name]) && lampLive(), name);
    if (showF) noteClue("signal"); if (name === "board") noteClue("barnotice"); secUi(name);
  }
  spyB.onclick = () => { if (busy || anyOpen()) return; sfx.tick(); enter(view === "bayT" ? "spyT" : "spy", 1); };
  function hideAll() { [spyMask, lampP, spyB, inv2, endS, secL, secR].forEach(e => e.hidden = true); lampPanel(false); document.body.classList.remove("insea", "inspy"); }
  const setR = () => document.body.style.setProperty("--spyR", spyR() + "px"); setR(); addEventListener("resize", setR);
  addEventListener("resize", () => { if (rec && rec.opts.view) { rec.opts.view = Engine.clampView(rec.opts.view); roseTick(); } });

  /* ---------- the office in four sections: arrows at the edges, keys, a swipe; Back returns to the full room ---------- */
  const ROOMKEYS = {}; ["office", "lamp"].forEach(rm => fetch(`rooms/${rm}.json`).then(r => r.json()).then(j => { ROOMKEYS[rm] = new Set(Object.keys(j)); if (rm === "office") shelfOn(j); if (rm === "lamp") lampOn(j); }).catch(() => {}));
  /* the harbour books shelf: only once office.json has s4's 'shelf' spot and the 'shelf' view; until then the bench keeps its register and mooring book */
  function shelfOn(j) { if (!(j.shelf && j.s4 && j.s4.hots && j.s4.hots.shelf)) return; const V = WORLD.office.views; V.moorbook.back = V.register.back = "shelf";
    V.s4.thought = "The archive bench. The air-pressure barograph with the weather book beside it, and the service manual. The telephone and the tag board above, and the harbour books on the shelf beside the board."; }
  function srcOf(v) { const d = W_.views[v], rm = d.room || W_.room; if (d.ph && !(ROOMKEYS[rm] && ROOMKEYS[rm].has(v))) return d.ph; return d.src || v; }
  const SEC = ["s1", "s2", "s3", "s4"], secL = mk("button", "secL", "secarrow", "<span>&#8249;</span><i></i>"), secR = mk("button", "secR", "secarrow", "<i></i><span>&#8250;</span>"); secL.hidden = secR.hidden = true;
  const secName = v => hotLabel(v, W_.views.wide.hots[v]);
  function secGo(d) { const k = SEC.indexOf(view), n = SEC[k + d]; if (k < 0 || !n || busy || Engine.busy() || anyOpen() || !$("title").hidden) return; sfx.tick(); clearEdges(); enter(n, 2 * d); }
  function secUi(name) { const k = G.role === "office" ? SEC.indexOf(name) : -1; secL.hidden = k <= 0; secR.hidden = k < 0 || k >= SEC.length - 1; if (k > 0) secL.querySelector("i").textContent = secName(SEC[k - 1]); if (k >= 0 && k < SEC.length - 1) secR.querySelector("i").textContent = secName(SEC[k + 1]); }
  secL.onclick = () => secGo(-1); secR.onclick = () => secGo(1);
  addEventListener("keydown", e => { if (!W_ || SEC.indexOf(view) < 0 || G.role !== "office" || anyOpen() || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || "")) return; const d = e.key === "ArrowLeft" || e.key === "a" || e.key === "A" ? -1 : e.key === "ArrowRight" || e.key === "d" || e.key === "D" ? 1 : 0; if (d) { e.preventDefault(); secGo(d); } });
  let sw = null; C.addEventListener("pointerdown", e => { if (e.pointerType === "touch") sw = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  addEventListener("pointerup", e => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y, quick = performance.now() - sw.t < 500; sw = null; if (quick && Math.abs(dx) > 80 && Math.abs(dx) > 2 * Math.abs(dy) && SEC.includes(view)) { swallow = true; setTimeout(() => swallow = false, 0); secGo(dx < 0 ? 1 : -1); } });
  // the task slip answers a ringing telephone too, so nobody has to hunt for the set while it rings
  $("task").addEventListener("click", e => { if (ringing && !busy) { e.stopImmediatePropagation(); answerPhone(); } }, true);

  /* ---------- MORSE TWIST (16 Nov, MORSE-TWIST-PLAN.md; David: a switch, OFF by default, so both versions can be playtested) ----------
     ON: the tower watches the ship through a spyglass on its bay view (spyT, on the bayT picture), where she sits 1 degree from Black Hen; the tower marks
     Dot / Dash / Stop, the office reads the letters with the Morse card by its telephone; the office spyglass shows only the lighthouses. Black Hen shows
     short-long every 10 s and the ship sends one letter in each of her dark spells (80 s round), so the two are never lit together.
     Switched in the lobby (synced to the partner as N.opts.twist) or with #twist in the address; locked once the game has begun. */
  const twistOn = () => !!(N && N.opts && N.opts.twist), marker = () => twistOn() ? G.role === "tower" : G.role === "office";
  const padView = () => !marker() ? "" : twistOn() ? "spyT" : "spy", readView = () => marker() ? "" : twistOn() ? "phone" : "morse";
  const SPYT_Y = .456;   // the spyglass's height on bayT: Black Hen (higher) and the ship (on the waterline) both inside the circle
  const TW_TXT = { twin: "Two lights, nearly together. One stands high and keeps time like a clock. The other rides low on the water.", wrong: "That's a lighthouse, not a ship. Watch the other light.",
    phone: "The line to the tower. Crank the handle and I can reach Mr Quick. A Morse card is pinned beside it, with the signal book.",
    spy: "The spyglass. Only the lighthouses show clear from down here. The ship sits too low in this rain; the tower stands higher." };
  const henTw = t => seq(pub.docs.twist.hen_loop, t), twKeep = new WeakMap();
  function twistWorld(W, on) { const T = W.tower.views, O = W.office.views; if (!twKeep.has(W)) twKeep.set(W, { morse: T.phone.hots.morse, read: O.phone.read, phone: O.phone.thought, spy: O.spy.thought }); const k = twKeep.get(W);
    if (on) { delete T.phone.hots.morse; O.phone.read = "morse"; O.phone.thought = TW_TXT.phone; O.spy.thought = TW_TXT.spy; }
    else { if (k.morse) T.phone.hots.morse = k.morse; if (k.read === undefined) delete O.phone.read; else O.phone.read = k.read; O.phone.thought = k.phone; O.spy.thought = k.spy; } }
  /* bayT's compass from the picture itself, as for the office: Carn Du and Penmor Head sit at known bearings from the tower */
  function towerCompass(h, b) { if (!h.carn || !h.penmor) return null; const xc = (h.carn[0] + h.carn[2]) / 2, xp = (h.penmor[0] + h.penmor[2]) / 2, dc = ((+b.glow + 540) % 360) - 180, dp = ((+b.hall + 540) % 360) - 180; if (Math.abs(xp - xc) < .05) return null; const F = (dp - dc) / (xp - xc); return [Math.round((dp - (xp - .5) * F) * 10) / 10, Math.round(F * 10) / 10]; }
  /* the tower's bay lights in the twist: Black Hen white, high and still; the ship warm, low and gently bobbing; in the spyglass only what is inside the circle */
  function twLights(base, spy, F, inC) { const ship = t => F ? seq(F.pairs, t - F.lead) : irr(t);
    return t => { const out = []; for (const l of base(t)) { const o = { ...l };
      if (l.id === "blackhen") o.i = henTw(t) * 2.2;
      else if (l.id === "false") { o.i = ship(t) * 2.2; o.c = [1, .78, .45]; o.y = l.y + .0022 * Math.sin(t * 1.3); }
      if (spy) { if (!inC(o.x, 1 - l.y)) continue; o.r = l.id === "false" ? .003 : .0036; }
      out.push(o); } return out; }; }
  /* part 3's reward in the twist: the ship's twist schedule, and the changed call lines (their voices, until recorded, stay silent: text only) and notes */
  function twReward(r) { if (!r || !r.twist || !twistOn()) return r; const T = r.twist, call = r.call.map((l, i) => T.call[i] || l), voice = r.voice && r.voice.map((v, i) => T.call[i] ? (T.voice && T.voice[i]) || null : v);
    G.flashT = T.flash; G.saw = { ...(G.saw || {}) }; delete G.saw.spy; delete G.saw.phone; save(); return { ...r, call, voice, notes: { ...r.notes, ...T.notes } }; }
  /* the pilot's book and the watch report as text: Black Hen every 10 s, and the pilot's book's bearings from Kerrow Point (the rendered pages still say 8 s: needs art) */
  const _rt = readText; window.readText = k => { if (!twistOn() || (k !== "pilot" && k !== "report")) return _rt(k); const P = pub.docs, X = P.twist, row = r => `<tr>${r.map((c, i) => `<td${i ? "" : ' class="d"'}>${esc(String(c))}</td>`).join("")}</tr>`;
    const h8 = (P.lights.find(l => l[0] === "Black Hen") || [])[2], per = (c, p) => c === "short, long" && p === h8 ? X.hen : p;
    if (k === "pilot") return `<h3>The pilot's book: lights of this coast</h3><table>${row(["", "", "", "Bearing from Kerrow Point"])}${P.lights.map(([n, c, p]) => row([n, c, p ? `every ${n === "Black Hen" ? X.hen : p} s` : "-", X.pilot_brg[n] ? X.pilot_brg[n] + "°" : ""])).join("")}</table>`;
    return `<h3>Watch report</h3><table>${P.watch.map(([t, c, p]) => row([t, c + (p ? `, every ${per(c, p)} seconds` : "")])).join("")}</table>`; };
  const _pl = panoLights; window.panoLights = t => { const L = _pl(t); if (!twistOn()) return L; const F = G.flashT; return L.map(e => e[4] === "Black Hen lighthouse" ? [e[0], henTw(t) * 1.9, e[2], e[3], e[4]] : e[4] === "flasher" && F ? [e[0], seq(F.pairs, t - F.lead) * 1.9, "255,214,160", e[3], e[4]] : e); };
  /* the switch, in the lobby under the room code */
  let twHash = null;
  function twistLobby() { if (!N || !G.code || !$("lwait")) return; let el = $("twistBox");
    if (!el) { el = document.createElement("label"); el.id = "twistBox"; el.innerHTML = `<input type="checkbox" id="twistCk"><span>Morse twist (test version): the tower reads the ship through its own spyglass.</span>`; $("lwait").after(el);
      $("twistCk").onchange = e => { const v = !!e.target.checked; sfx.tick(); N.opts = { ...(N.opts || {}), twist: v }; post({ opts: { twist: v } }); }; }
    if (/twist/i.test(location.hash) && twHash !== G.code && !N.started) { twHash = G.code; if (!twistOn()) { N.opts = { ...(N.opts || {}), twist: true }; post({ opts: { twist: true } }); } }
    const ck = $("twistCk"); ck.checked = twistOn(); ck.disabled = !!N.started; el.title = N.started ? "Set before the game begins." : ""; }
  const _rl = renderLobby; window.renderLobby = () => { _rl(); twistLobby(); };

  /* ---------- replace a few of game.js / journal.js's functions ---------- */
  window.noteClue = noteClue; window.renderInv = renderInv; window.tutorial = tutorial; window.flashSheet = sheet; window.cluesPage = cluesPage; window.submit = submit; window.endFlow = ending;
  window.hintsFor = n => { const k = hintKey(n), box = n === 7 ? vault.lamp : vault.parts[n - 1]; return k && box ? KCrypto.openJson(k, twistOn() && box.hintsT ? box.hintsT : box.hints) : []; };
  window.leftPage = () => { const n = curPart(), rows = []; for (let i = 1; i <= 7; i++) { const q = question(i), st = i < n ? "done" : i === n ? "now" : "later"; rows.push(`<li class="${st}"><span>${q ? esc(q.name) : "&hellip;"}</span><i>${st === "done" ? "&#10003;" : ""}</i></li>`); } const used = Object.values(N.hints).reduce((a, b) => a + b, 0), m = Math.max(0, Math.floor((Date.now() - startedAt()) / 60000)); return `<h2>The night so far</h2><p class="stat">${m} min &middot; ${used} hint${used === 1 ? "" : "s"}</p><ol class="parts">${rows.join("")}</ol>`; };
  const _oc = openCall; window.openCall = () => { const q = question(curPart()); if (q && q.lamp && !N.lit) return lampCall(); _oc(); };
  const _oj = openJournal; window.openJournal = tab => { _oj(tab); $("journal").querySelectorAll("[data-g]").forEach(b => b.onclick = () => { sfx.tick(); openClue(b.dataset.g); }); };
  const _tl = taskLine; window.taskLine = () => { const q = N && G.role ? question(curPart()) : null; if (q && q.lamp && !N.lit) { const E = $("task"); E.innerHTML = `<span class="k">Last job &middot; The Lamp</span><span class="q">${G.role === "tower" ? "Light the great lamp." : "Talk the tower through the service manual."}</span><span class="w">${G.role === "tower" ? "The office has the manual." : "Read it to them step by step."} Ring Mr Quick for a hint.</span>`; return; } _tl(); };
  const _op = openPause; window.openPause = () => { _op(); if ($("pMusic")) $("pMusic").value = volOf("music"); let pc = $("pCode"); if (!pc) { pc = document.createElement("div"); pc.id = "pCode"; $("pSave").before(pc); } pc.innerHTML = G.code ? `<span>Room code</span><b>${esc(G.code)}</b><small>Your partner joins with this code.</small>` : ""; };
  const _st = showTitle; window.showTitle = async f => { hideAll(); await _st(f); music.title(); };
  return { lampOv, lampAct, srcOf, optsFor, ui, safeAt, noteHarbour, swallow: () => swallow, music, duck, partStarted, hideAll, openClue, twReward, twistOn };
})();
