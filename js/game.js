/* Game logic for one player: places, hotspots, items, the linked session. Shared state (N) comes from the server; G is this device only. */
const go = (v, t) => ({ type: "go", view: v });
const G_ = v => ({ type: "go", view: v });
const SIGHT = {}; for (let k = 0; k < 8; k++) SIGHT["sight" + k] = { room: "lamp", back: "lamp", read: "sight", thought: k === 0 ? "The gallery, and the brass compass. Turn it until a light sits straight ahead, then read the card under the pointer." : null, hots: { turnL: { type: "turn", d: -1 }, turnR: { type: "turn", d: 1 } } };
const WORLD = {
  tower: { room: "tower", start: "wide", views: {
    wide: { hots: { desk: G_("desk"), telephone: G_("phone"), window: G_("window"), shelf: G_("pilot"), berths: G_("berthsv"), stove: G_("stove"), tide: G_("tide"), ladder: { type: "go", view: "lamp", nav: 1, label: "Ladder to the lamp room", item: "hatchkey", msg: "The hatch is locked. You need a key." } } },
    desk: { back: "wide", thought: "Tregarth's desk, left just as it was. The log is still open.", hots: { logbook: G_("book"), drawer: { type: "open", item: "hatchkey", flag: "drawer" } } },
    book: { back: "desk", read: "log", thought: "His log. Every noon he wrote down the glass, the weather and the lamp. But a storm like this doesn't come out of nowhere. Are all of these entries true?", hots: {} },
    phone: { back: "wide", thought: "The line to the harbour office. Crank the handle and I can reach Mr Quick.", hots: { crank: { type: "call" }, morse: G_("morse") } },
    morse: { back: "phone", read: "morse", thought: "A Morse card, pinned by the telephone. Short flash, dot. Long flash, dash.", hots: {} },
    pilot: { back: "wide", read: "pilot", thought: "The pilot's book, taken down from the shelf. How every light on this coast shows itself by night.", hots: {} },
    tide: { back: "wide", read: "tide", thought: "Tonight's tide table, and a note in the keeper's hand about the bar at the harbour mouth.", hots: {} },
    stove: { back: "wide", thought: "Still warm. Someone stacked this fire to last.", hots: { matches: { type: "pick", item: "matches" } } },
    window: { back: "wide", thought: "Rain on the glass, and lights out in the dark.", hots: { glass: { type: "go", view: "bayT", rect: [.28, .1, .72, .9], label: "Look out to sea" } } },
    bayT: { room: "bay", back: "window", read: "sight2", thought: "The whole bay. Some of these lights belong to this coast. Some don't.", hots: {} },
    lamp: { room: "lamp", back: "wide", thought: "The great lamp, cold and dark.", hots: { down: { type: "go", view: "wide", rect: [.36, .84, .64, 1.0], label: "Down the ladder", nav: 1 }, lens: { type: "go", view: "burner", label: "The burner", part: 6, msg: "Not yet. Mr Quick needs to know what's out there first." }, plate: G_("plate"), gauge: G_("gauge"), oilbook: G_("oilbook"), door: { type: "go", view: "sight0", nav: 1, label: "Door to the gallery", part: 2, msg: "The gallery door is bolted against the wind." } } },
    plate: { room: "lamp", back: "lamp", read: "plate", thought: "The maker's plate. It says how fast the lamp drinks its oil.", hots: {} },
    gauge: { room: "lamp", back: "lamp", read: "gauge", thought: "The reservoir gauge. Bone dry.", hots: {} },
    oilbook: { room: "lamp", back: "lamp", read: "oil", thought: "His oil book. What he says he filled the lamp with, night by night.", hots: {} },
    burner: { room: "lamp", back: "lamp", thought: "A sealed can, a pump, a spirit cup, an oil valve and the clockwork. The office has the order.", hots: { can: { type: "step", n: 0 }, pump: { type: "step", n: 1 }, cup: { type: "step", n: 2, item: "matches" }, valve: { type: "step", n: 3 }, clock: { type: "step", n: 4 } } },
    berthsv: { back: "wide", read: "berths", thought: "Every boat in the harbour, by berth. The keeper kept it for his watch.", hots: {} },
    lit: { room: "lamp", back: "lamp", hots: {} }, ...SIGHT } },
  office: { room: "office", start: "wide", views: {
    wide: { hots: { zweather: { type: "go", view: "zweather", rect: [.63, .5, 1, .99] }, zlights: { type: "go", view: "zlights", rect: [.38, .16, .63, .69] }, ztable: { type: "go", view: "zlights", rect: [.1, .69, .62, 1], nomark: 1, label: "Chart table and window" }, zrecords: { type: "go", view: "zrecords", rect: [0, .18, .37, .68] }, telephone: G_("phone") } },
    zweather: { back: "wide", thought: "The weather bench. The barograph, Mr Quick's weather book, and the harbour register.", hots: { barograph: G_("barograph"), weather: G_("weather"), register: G_("register"), telephone: { type: "go", view: "phone", quiet: 1 } } },
    zlights: { back: "wide", thought: "The chart table, Mr Quick's desk, and the window onto the bay.", hots: { charttable: G_("tchart"), qdesk: { type: "go", view: "reportv", label: "Mr Quick's watch report", rect: [.37, .44, .63, .56] }, window: G_("window") } },
    zrecords: { back: "wide", thought: "The notice board, the mooring book, the tag board and the door under the stairs.", hots: { moorbook: G_("moorbook"), tags: G_("tagv"), manual: { type: "doc", doc: "manual" }, board: G_("board"), lantern: { type: "pick", item: "lantern" }, door: { type: "go", view: "doorv", nav: 1, label: "Door under the stairs" } } },
    barograph: { back: "zweather", read: "chart", thought: "The harbour barograph. Its pen has been drawing the air pressure, hour after hour, all week. Nobody writes this by hand.", hots: { chart: { type: "drum" } } },
    weather: { back: "zweather", read: "weather", thought: "Mr Quick's own book: wind and sea at noon, written down here at the harbour. The keeper keeps a log of his own out at the tower.", hots: {} },
    phone: { back: "wide", thought: "The line to the tower. Crank the handle and I can reach Mr Quick.", hots: { crank: { type: "call" } } },
    board: { back: "zrecords", read: "board", thought: "Harbour notices, and a slate of the ships due tonight.", hots: { keybox: { type: "open", item: "storekey", flag: "box" } } },
    window: { back: "zlights", read: "sill", thought: "Rain on the panes, and the brass strip on the sill says which light lies where.", hots: { glass: { type: "go", view: "bayH", rect: [.1, .08, .9, .88], label: "Look out to sea" } } },
    bayH: { room: "bay", back: "window", read: "sill", thought: "The whole bay from the harbour. Mr Quick will want to know what you can see.", hots: {} },
    reportv: { back: "zlights", read: "report", thought: "Mr Quick's watch report, sent over the wire from the hut. Every light he has seen tonight.", hots: {} },
    register: { back: "zweather", read: "register", thought: "The harbour register. Every ship expected tonight.", hots: {} },
    moorbook: { back: "zrecords", read: "moor", thought: "The mooring book. Every boat that lies here, and what she draws.", hots: {} },
    tagv: { back: "zrecords", read: "tags", thought: "The berth board. A tag on the hook means the boat is in.", hots: {} },
    tchart: { back: "zlights", read: "bearings", hots: { bearn: G_("bearn") } },
    bearn: { back: "tchart", read: "bearings", thought: "Bearings the harbour office took, at the same moments as the tower.", hots: {} },
    doorv: { back: "zrecords", read: "receipt", thought: "The oil store, under the stairs. Treloar's receipt is nailed to the door.", hots: { enter: { type: "go", view: "store", nav: 1, label: "Go into the oil store", item: "storekey", msg: "Locked. You need a key.", item2: "lantern", msg2: "It's pitch dark in there. I need a light." } } },
    store: { room: "store", back: "doorv", thought: "The oil store. A barrel and some cans, and what's left in them.", hots: { barrel: G_("barrelv"), cans: G_("cansv") } },
    barrelv: { room: "store", back: "store", read: "cans", thought: "The label says what the barrel holds when full. The glass shows how far up the oil comes, and every mark is an equal step.", hots: {} },
    cansv: { room: "store", back: "store", read: "cans", thought: "Each label says what a full can holds. The glass on the corner shows how full each one is.", hots: {} } } } };
let G, N = null, vault, pub, W_, view = null, rec = null, busy = false, es = null;
const $ = id => document.getElementById(id), KEY = "kerrow-link-1";
const blank = () => ({ code: null, id: Math.random().toString(36).slice(2, 10), role: null, items: [], opened: {}, clues: [], seen: {}, questions: {}, keys: {}, log: [], facts: [], intro: false, lines: [], gt: 0, flash: null, letter: null, ended: false });
function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }
G = (() => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return blank(); } })();
const post = async patch => { try { await Net.update({ code: G.code, id: G.id, ...patch }); } catch (e) { toast("The line has gone dead. Check your connection."); } };

/* ---- sound (placeholder until Phase 5) ---- */
let ac, master, lpF; const buses = {}, SND = {}, amb = {}, LOOPS = ["rain", "out", "fire", "clock"], ONE = ["ring", "hangup", "crank", "ratchet", "drawer", "door", "ladder", "locked", "key", "paper", "page", "pencil", "match", "ignite", "thunder", "foghorn", "horn"];
let ambNow = { rain: .3, out: .55, lp: 12000 };
const volOf = b => { try { const v = JSON.parse(localStorage.getItem("kerrow-vols") || "{}")[b]; return v === undefined ? 1 : +v; } catch (e) { return 1; } };
function setBus(b, v) { let o = {}; try { o = JSON.parse(localStorage.getItem("kerrow-vols") || "{}"); o[b] = v; localStorage.setItem("kerrow-vols", JSON.stringify(o)); } catch (e) {} if (buses[b]) buses[b].gain.value = v; }
function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = +(localStorage.getItem("kerrow-vol") || .8); master.connect(ac.destination); for (const b of ["fx", "amb", "voice"]) { buses[b] = ac.createGain(); buses[b].gain.value = volOf(b); buses[b].connect(master); } lpF = ac.createBiquadFilter(); lpF.type = "lowpass"; lpF.frequency.value = 12000; lpF.connect(buses.amb); loadSounds(); } catch (e) {} } if (ac && ac.state === "suspended") ac.resume(); return ac; }
function loadSounds() { [...LOOPS, ...ONE].forEach(n => fetch(`audio/${n}.mp3`).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(buf => { SND[n] = buf; if (LOOPS.includes(n)) ambSet(ambNow); }).catch(e => console.warn("sound", n, e && e.message))); }
function play(n, g) { if (!SND[n] || !ac) return false; const s = ac.createBufferSource(), v = ac.createGain(); s.buffer = SND[n]; v.gain.value = g === undefined ? 1 : g; s.connect(v).connect(buses.fx); s.start(); return true; }
function ambSet(p) { ambNow = p; if (!ac) return; for (const k of LOOPS) { if (SND[k] && !amb[k]) { const s = ac.createBufferSource(), v = ac.createGain(); s.buffer = SND[k]; s.loop = true; s.loopStart = .06; s.loopEnd = SND[k].duration - .06; v.gain.value = 0; s.connect(v).connect(lpF); s.start(0, .06); amb[k] = v; } if (amb[k]) amb[k].gain.setTargetAtTime(p[k] || 0, ac.currentTime, .4); } lpF.frequency.setTargetAtTime(p.lp || 20000, ac.currentTime, .4); }
function ambFor(name) { const room = (W_.views[name] && W_.views[name].room) || W_.room; if (name.startsWith("sight") || name.startsWith("bay")) return { out: .95, rain: .2, lp: 20000 }; if (room === "store") return { rain: .2, lp: 480 }; if (room === "lamp") return { rain: .18, out: .55, lp: 4200 }; if (room === "tower") return { rain: .24, fire: name === "stove" ? .9 : .32, lp: 2400 }; return { rain: .24, clock: .35, lp: 2400 }; }
setInterval(() => { if (W_ && !busy && ac && Math.random() < .3) play("thunder", .4); }, 25000);
function atFilm(cues) { const t = cues.map(([s, n, g]) => setTimeout(() => play(n, g), s * 1000)); return () => t.forEach(clearTimeout); }
function tone(f, t0, d, type, g) { const a = ctx(); if (!a) return; const o = a.createOscillator(), v = a.createGain(); o.type = type || "sine"; o.frequency.value = f; v.gain.setValueAtTime(0, a.currentTime + t0); v.gain.linearRampToValueAtTime(g || .15, a.currentTime + t0 + .012); v.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + d); o.connect(v).connect(buses.fx); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + d + .05); }
const sfx = { tick() { tone(1400, 0, .03, "triangle", .06); }, bad() { tone(120, 0, .14, "sawtooth", .08); tone(90, .1, .22, "sawtooth", .08); }, good() { [392, 523, 659].forEach((f, i) => tone(f, .05 + i * .11, .5, "sine", .1)); },
  crank() { if (play("crank", .9)) return; for (let i = 0; i < 6; i++) tone(70 + i * 10, i * .06, .05, "square", .08); }, ring() { if (play("ring", .85)) return; for (let k = 0; k < 2; k++) for (let i = 0; i < 18; i++) { tone(1150, k * 1.1 + i * .04, .03, "square", .05); tone(1500, k * 1.1 + i * .04 + .02, .03, "square", .05); } }, pick() { if (play("key", .9)) return; tone(1400, 0, .06, "triangle", .1); tone(1900, .05, .08, "triangle", .08); }, rattle() { if (play("locked", .9)) return; for (let i = 0; i < 4; i++) tone(200 + i * 60, i * .07, .05, "square", .07); }, drawer() { play("drawer", .9) || sfx.tick(); }, door() { play("door", .55) || sfx.tick(); }, ladder() { play("ladder", .9) || sfx.tick(); }, paper() { play("paper", .7) || sfx.tick(); }, page() { play("page", .8) || sfx.tick(); }, pencil() { play("pencil", .8) || sfx.tick(); }, ratchet() { play("ratchet", .7) || sfx.tick(); }, hangup() { play("hangup", .8); } };

/* ---- pop-ups: while one is open, only it can be clicked ---- */
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
const MODALS = ["slip", "card", "journal", "call", "tut", "scene", "how", "board", "drum"];
const anyOpen = () => MODALS.some(m => !$(m).hidden);
function syncScrim() { $("scrim").hidden = !anyOpen(); if (anyOpen()) { $("ring").classList.add("gone"); $("tip").hidden = true; } }
function showM(id) { $(id).hidden = false; syncScrim(); } function hideM(id) { $(id).hidden = true; syncScrim(); }
let slipClose = null;
function slip(html, cls) { return new Promise(res => { const el = $("slip"); el.className = "slip " + (cls || ""); el.innerHTML = `<button class="x" id="slipX" aria-label="Close">&times;</button>` + html; showM("slip"); slipClose = () => { slipClose = null; hideM("slip"); res(); }; $("slipX").onclick = slipClose; }); }
addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!$("slip").hidden && slipClose) return slipClose(); for (const m of ["card", "how", "journal", "call", "board", "drum"]) if (!$(m).hidden) { hideM(m); return; } goBack(); });
function goBack() { if (!W_ || !rec || busy || Engine.busy() || anyOpen() || !$("title").hidden) return; const b = W_.views[view].back; if (b) { sfx.tick(); clearEdges(); enter(b, -1); } }
addEventListener("keydown", e => { if (e.key !== " " && e.key !== "Enter") return; if (!$("scene").hidden) { e.preventDefault(); $("scene").click(); } else if (!$("slip").hidden && slipClose) { e.preventDefault(); slipClose(); } });

/* ---- plain text of everything written ---- */
function readText(kind) {
  const P = pub.docs;
  if (kind === "log") return `<h3>The keeper's log</h3><table>${P.log.map(e => `<tr><td class="d">${e.day} Oct</td><td>Glass ${esc(e.glass)}. ${esc(e.weather)}</td><td>${esc(e.lamp)}</td></tr>`).join("")}</table>`;
  if (kind === "weather") return `<h3>Harbour weather book, noon</h3><table>${Object.entries(P.weather_book).map(([d, w]) => `<tr><td class="d">${d} Oct</td><td>${esc(w)}</td></tr>`).join("")}</table>`;
  if (kind === "chart") return `<h3>Barograph, week of 1 October 1912</h3><img class="wide" src="data/chart.png" alt="Barograph chart"><p>${esc(P.glass_card)}</p>`;
  if (kind === "board") return `<h3>Notices on the board</h3>${P.notices.map(n => `<p><b>${esc(n.head)}</b><br>${esc(n.body)}</p>`).join("")}<h3 style="margin-top:18px">On the slate</h3><p><i>Due tonight</i></p>${P.register.map(r => `<p>${esc(r[0])}</p>`).join("")}`;
  const T = (h, rows) => `<h3>${h}</h3><table>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? "" : ' class="d"'}>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
  if (kind === "oil") return T("Oil book", P.oil_book.map(([d, v]) => [d + " Oct", `Filled the lamp, ${v} litres.`]));
  if (kind === "plate") return `<h3>The Great Lamp</h3><p>Burns ${P.rate} litres of paraffin an hour.</p><p>Light at sunset. Put out at sunrise.</p><p>Never let it burn dry.</p>`;
  if (kind === "gauge") return `<h3>Reservoir gauge</h3><p>${P.reservoir} litres</p>`;
  if (kind === "pilot") return T("The pilot's book", P.lights.map(([n, c, p]) => [n, c, p ? `every ${p} s` : "-"]));
  if (kind === "tide") return T("Tide table", P.tide.map(([t, h]) => [t, h.toFixed(2) + " m above chart depth"])) + `<p style="margin-top:12px">The Kerrow Bar has ${P.bar} m of water at chart depth, plus the tide. No master takes a ship over it without ${P.keel} m of water under her keel. E.T.</p>`;
  if (kind === "morse") return `<h3>Morse</h3><p class="lab">Short flash, dot. Long flash, dash.</p><div style="columns:2;column-gap:32px">${Object.entries(P.morse).map(([k, v]) => `<div style="break-inside:avoid;padding:3px 0"><b style="display:inline-block;width:1.6em">${k}</b>${v.replace(/\./g, "\u2022 ").replace(/-/g, "\u2014 ")}</div>`).join("")}</div>`;
  if (kind === "report") return T("Watch report", P.watch.map(([t, c, p]) => [t, c + (p ? `, every ${p} seconds` : "")]));
  if (kind === "bearings") return T("Bearings from the harbour office", [["Steady glow", P.bearings_harbour.glow], ["Warm lights", P.bearings_harbour.hall], ["Flashing light", P.bearings_harbour.flasher]]);
  if (kind === "berths") return T("Boats of the harbour, by berth", P.berths.map(([b, n]) => [b, n]));
  if (kind === "moor") return T("Mooring book: what each boat draws", P.draught.map(([n, d]) => [n, d + " m"]));
  if (kind === "tags") return T("The berth board", P.berths.map(([b]) => [b, P.empty[b] ? "no tag. Chalked: " + P.empty[b] : "tag on the hook"]));
  if (kind === "manual") return `<h3>Lighthouse service manual: lighting the great lamp</h3><ol>${P.manual.map(s => `<li style="margin:.4em 0">${esc(s)}</li>`).join("")}</ol>`;
  if (kind === "register") return T("Harbour register", P.register.map(([n, d, f, a, s]) => [n, `${d} m`, f, a, `${s} on board`]));
  if (kind === "receipt") return `<h3>Treloar's receipt</h3>${pub.receipt.map(l => `<p>${esc(l)}</p>`).join("")}`;
  if (kind === "cans") { const S_ = P.store, W2 = f => f === 1 ? "full" : f === 0 ? "empty" : `at the ${f * 100}% mark`; return `<h3>The oil store</h3><p>The barrel holds ${S_.barrel.cap} litres when full. Its glass has ${S_.barrel.marks} equal marks, and the oil stands at mark ${S_.barrel.steps}.</p>` + T(`Cans, ${S_.can_cap} litres each when full`, S_.cans.map((f, i) => ["Can " + (i + 1), W2(f)])); }
  if (kind === "sill") return T("On the sill", Object.entries(P.fixed).map(([b, n]) => [n, b]));
  if (kind === "sight") { const k = +view.slice(5); return `<h3>The compass</h3><p>Pointing ${"N NE E SE S SW W NW".split(" ")[k]}.</p>`; }
  return "";
}
$("read").onclick = () => { const k = W_.views[view].read; if (k) { sfx.paper(); noteClue(k); slip(`<div class="plain">${readText(k)}</div>`, "plainc"); } };
const NOT_YET = "This doesn't help us right now.", notYet = k => !!k && !!CLUE_NOW[k] && Math.min(...CLUE_NOW[k]) > curPart();
const NAMES_AT = { doorv: ["Will Treloar"], board: ["The Penhale brothers", "Captain Ezra Jago"] };
function corner(t) { const b = $("corner"), e = document.createElement("div"); e.textContent = t; b.appendChild(e); setTimeout(() => e.remove(), 4500); }
function addNames(list) { const have = (N && N.names) || {}, miss = list.filter(n => !have[n]); if (miss.length) post({ names: Object.fromEntries(miss.map(n => [n, true])) }); }
function noteNames() { const got = Object.keys((N && N.names) || {}), old = G.knownN || [], fresh = got.filter(n => !old.includes(n)); if (!fresh.length) return; G.knownN = [...old, ...fresh]; save(); if (W_) { sfx.pencil(); corner(fresh.length > 1 ? "New names added to the suspects" : "New name added to the suspects"); } }
function noteClue(k) { if (!G.clues.includes(k)) { G.clues.push(k); save(); } }

/* ---- viewpoints ---- */
function overlaysFor(name) {
  const o = [];
  if (G.role === "tower" && name === "desk") { if (G.opened.drawer) o.push(G.items.includes("hatchkey") ? "drawer_empty" : "drawer_open"); }
  if (name === "stove" && G.items.includes("matches")) o.push("matches_gone");
  if (G.role === "office" && (name === "wide" || name === "zrecords") && G.items.includes("lantern")) o.push("lantern_gone");
  if (G.role === "office" && (name === "board" || name === "zrecords") && G.opened.box) o.push(G.items.includes("storekey") ? "box_empty" : "box_open");
  return o;
}
let thoughtT;
function thought(t) { const e = $("thought"); clearTimeout(thoughtT); if (!t) { e.hidden = true; return; } e.textContent = t; e.hidden = false; thoughtT = setTimeout(() => e.hidden = true, Math.max(5000, t.length * 70)); }
$("thought").onclick = () => $("thought").hidden = true;
const roomOf = v => W_.views[v].room || W_.room, keyOf = v => roomOf(v) + "/" + v;
function around(name) { const v = W_.views[name], o = new Set(); if (v.back) o.add(v.back); for (const a of Object.values(v.hots)) if (a.view && W_.views[a.view]) o.add(a.view); o.delete(name); return [...o]; }
let preId = 0;
async function preloadAround(name) { const id = ++preId, list = around(name); for (const v of list) { if (id !== preId) return; try { await Engine.load(roomOf(v), v); } catch (e) { console.warn(e.message); } } if (id === preId) Engine.trim(new Set([keyOf(name), ...list.map(keyOf)]), 12); }
async function loadingFor(name) { const L = $("loading"), list = [name, ...around(name)]; let done = 0; L.hidden = false; $("loadBar").style.width = "4%"; await Promise.all(list.map(v => Engine.load(roomOf(v), v).catch(e => console.warn(e.message)).then(() => { done++; $("loadBar").style.width = Math.round(done / list.length * 100) + "%"; }))); L.hidden = true; }
async function enter(name, dir, zc) { const v_ = W_.views[name]; let r; const slowT = setTimeout(() => $("loadHint").hidden = false, 220); try { r = await Engine.load(v_.room || W_.room, name); } catch (e) { clearTimeout(slowT); $("loadHint").hidden = true; toast("That picture failed to load. Check your connection and try again."); return; } clearTimeout(slowT); $("loadHint").hidden = true; G.at = name; preloadAround(name); r.opts = { lights: lightsFor(name, r.meta), allLights: name.startsWith("sight") || name.startsWith("bay") || name === "tchart", rain: name.startsWith("sight") || name.startsWith("bay") }; view = name; rec = r; ambSet(ambFor(name)); Engine.compose(r, overlaysFor(name), drawFor(name)); uiFor(name); $("read").hidden = !W_.views[name].read; if (W_.views[name].read) noteClue(W_.views[name].read); const early = notYet(W_.views[name].read), firstLook = !early && !(G.saw || {})[name]; if (firstLook) { G.saw = { ...(G.saw || {}), [name]: 1 }; save(); } thought(early ? NOT_YET : firstLook ? W_.views[name].thought : null); if (NAMES_AT[name]) addNames(NAMES_AT[name]); return new Promise(res => Engine.go(r, dir, zc, res)); }
function refresh() { if (rec) Engine.compose(rec, overlaysFor(view), drawFor(view)); }
function hit(cx, cy) {
  if (!rec) return null; const [x, y] = Engine.toImage(cx, cy), v = W_.views[view], m = rec.meta; let best = null, area = 9;
  for (const [id, act] of Object.entries(v.hots)) { const r = act.rect || m.hots[id]; if (!r) continue; if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) { const a = (r[2] - r[0]) * (r[3] - r[1]); if (a < area) { area = a; best = { id, act, rect: r }; } } }
  if (best) return best; if (v.back) { const fx = cx / innerWidth; if (fx < .15) return { edge: "L" }; if (fx > .85) return { edge: "R" }; } return null;
}
const C = $("c"), ring = $("ring");
function clearEdges() { const t_ = $("tip"); if (t_) t_.hidden = true; $("edgeL").classList.remove("on"); $("edgeR").classList.remove("on"); ring.classList.remove("hot", "edge"); }
addEventListener("mousemove", e => { ring.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; const onGame = e.target === C; ring.classList.toggle("gone", !onGame || anyOpen()); if (!onGame || busy || !W_ || !rec || !$("title").hidden) { clearEdges(); return; } const h = hit(e.clientX, e.clientY); ring.classList.toggle("hot", !!(h && !h.edge)); const tip = $("tip"); if (h && !h.edge && hotLabel(h.id, h.act)) { tip.textContent = hotLabel(h.id, h.act); tip.style.transform = `translate(${e.clientX + 30}px,${e.clientY + 16}px)`; tip.hidden = false; } else tip.hidden = true; ring.classList.toggle("edge", !!(h && h.edge)); $("edgeL").classList.toggle("on", !!(h && h.edge === "L")); $("edgeR").classList.toggle("on", !!(h && h.edge === "R")); });
C.addEventListener("contextmenu", e => { e.preventDefault(); goBack(); });
C.addEventListener("click", e => { ctx(); if (anyOpen() || busy || Engine.busy() || !W_ || !rec || !$("title").hidden) return; const h = hit(e.clientX, e.clientY); if (!h) return; if (h.edge) { sfx.tick(); clearEdges(); enter(W_.views[view].back, -1); return; } use(h); });
const STEP_OK = ["The reservoir fills.", "The needle climbs to the red line.", "The spirit cup catches.", "Oil hisses into the burner.", "The clockwork catches, and the lens begins to turn."], STEP_FX = [() => sfx.drawer(), () => sfx.ratchet(), () => play("match", .9), () => sfx.ratchet(), () => play("ignite", .8)];
async function use(h) {
  const a = h.act, zc = [(h.rect[0] + h.rect[2]) / 2, 1 - (h.rect[1] + h.rect[3]) / 2];
  if (a.type === "go") { if (a.part && !N.solved[a.part]) { sfx.rattle(); toast(a.msg); return; } if (a.item && !G.items.includes(a.item)) { sfx.rattle(); toast(a.msg); return; } if (a.item2 && !G.items.includes(a.item2)) { sfx.rattle(); toast(a.msg2); return; } (a.nav ? (a.view === "lamp" || a.view === "wide" ? sfx.ladder : sfx.door) : W_.views[a.view].read ? sfx.paper : sfx.tick)(); await enter(a.view, 1, zc); }
  else if (a.type === "turn") { sfx.ratchet(); const k = (+view.slice(5) + a.d + 8) % 8; await enter("sight" + k, 0); }
  else if (a.type === "step") { if (a.item && !G.items.includes(a.item)) { sfx.rattle(); toast("It needs a match."); return; } if (a.n === (G.stepN || 0)) { STEP_FX[a.n](); G.stepN = a.n + 1; save(); toast(STEP_OK[a.n]); if (G.stepN === 5) { busy = true; setTimeout(() => { busy = false; post({ lit: true }); }, 1400); } } else { G.stepN = 0; save(); sfx.bad(); toast("It coughs and dies. Start again."); } }
  else if (a.type === "doc") { sfx.paper(); noteClue(a.doc); if (notYet(a.doc)) thought(NOT_YET); slip(`<div class="plain">${readText(a.doc)}</div>`, "plainc"); }
  else if (a.type === "pick") { if (!G.items.includes(a.item)) { G.items.push(a.item); sfx.pick(); save(); renderInv(); refresh(); toast(`${ITEMS[a.item][0]} added to your pockets.`); } }
  else if (a.type === "open") {
    if (!G.opened[a.flag]) { if (!N.solved[1]) { sfx.rattle(); toast("It's stuck fast."); return; } G.opened[a.flag] = true; sfx.drawer(); save(); refresh(); toast("It comes open."); return; }
    if (!G.items.includes(a.item)) { G.items.push(a.item); sfx.pick(); save(); renderInv(); refresh(); toast(`${ITEMS[a.item][0]} added to your pockets.`); } }
  else if (a.type === "exit") { if (!G.items.includes(a.item)) { sfx.rattle(); toast("Locked. You need a key."); return; } sfx.good(); toast(`You use the ${ITEMS[a.item][0].toLowerCase()}. It turns.`); await new Promise(r => setTimeout(r, 900)); await slip('<p class="hand">The rest of the night lies beyond this point.</p><p class="small">End of the test slice.</p>'); }
  else if (a.type === "drum") { sfx.tick(); openDrum(); }
  else if (a.type === "call") { sfx.crank(); await new Promise(r => setTimeout(r, 450)); openCall(); }
}
/* ---- when either player solves a part, both see what follows ---- */
function addLog(text, kind) { G.log.push({ text, kind }); save(); }
let flow = Promise.resolve();
function applyState(s) { const firstJoin = !N, wasOnline = N ? (N.online || 0) : 0; N = s; noteNames(); updateHud(); if (N.lit && W_ && G.intro && !G.ended) { G.ended = true; save(); flow = flow.then(endFlow); } if (!$("lobby").hidden) renderLobby(); if (!firstJoin && s.online > wasOnline && W_) toast("Your partner is on the line."); if (!firstJoin && s.online < wasOnline && W_) toast("Your partner has dropped off the line."); if (!W_ || !G.intro) return; for (const p of Object.keys(N.solved).map(Number).sort((a, b) => a - b)) if (!G.seen[p]) { G.seen[p] = true; save(); flow = flow.then(() => rewardFlow(p)); } if (!$("journal").hidden) openJournal(); if (!$("board").hidden) openBoard(); if (view === "board") refresh(); }
async function rewardFlow(p) {
  hideM("call"); hideM("journal"); hideM("board"); busy = true; const key = KCrypto.b64d(N.rkeys[p]), r = KCrypto.openJson(key, vault.parts[p - 1].reward);
  if (r.nextHintKey) G.keys[p + 1] = r.nextHintKey; if (r.nextQ) G.questions[p + 1] = r.nextQ; if (r.flash) G.flash = r.flash; if (r.letter) G.letter = r.letter; renderInv(); sfx.good(); save();
  await playCall(r.call.filter(l => !l[0] || l[0] === G.role).map(l => l[1]));
  [...r.notes.both, ...(r.notes[G.role] || [])].forEach(t => addLog(t, "said")); if ((r.facts || []).length) { G.facts = [...(G.facts || []), ...r.facts]; save(); sfx.pencil(); corner(r.facts.length > 1 ? "New facts added to the suspects" : "New fact added to the suspects"); } corner("New note in your journal");
  lastProg = Date.now(); taskLine(); busy = false; refresh(); if (W_ && rec) placeMarks(); if (G.flash && view === "bayH") uiFor(view);
}
const lineMs = l => Math.max(2800, l.length * 62);
function playCall(lines, who) { return new Promise(res => { const box = $("scene"), sub = $("subtitle"); $("who").textContent = who || "Mr Quick, on the telephone"; showM("scene"); let i = -1, t; const next = () => { clearTimeout(t); i++; if (i >= lines.length) { hideM("scene"); box.onclick = null; res(); return; } sub.textContent = lines[i]; sub.className = "quick"; t = setTimeout(next, lineMs(lines[i])); }; box.onclick = next; next(); }); }
function filmSubs(lines, who) { const box = $("scene"), sub = $("subtitle"); $("who").textContent = who; box.onclick = null; box.style.pointerEvents = "none"; box.hidden = false; let i = -1, t, off = false; const end = () => { if (off) return; off = true; clearTimeout(t); box.hidden = true; box.style.pointerEvents = ""; syncScrim(); }, next = () => { i++; if (i >= lines.length) { end(); return; } sub.textContent = lines[i]; sub.className = "quick"; t = setTimeout(next, lineMs(lines[i])); }; next(); return end; }
function audioFrom(bytesP) { let src = null, stopped = false; (async () => { try { const bytes = await bytesP; if (stopped || !ctx()) return; const buf = await ac.decodeAudioData(bytes.buffer ? bytes.buffer.slice(0) : bytes); if (stopped) return; src = ac.createBufferSource(); src.buffer = buf; src.connect(buses.voice); src.start(); } catch (e) { console.warn("voice", e); } })(); return { stop() { stopped = true; try { src && src.stop(); } catch (e) {} } }; }
/* ---- the game begins ---- */
async function begin() {
  ctx(); $("title").hidden = true; $("lobby").hidden = true; W_ = WORLD[G.role]; await post({ start: true }); const first_ = G.intro && G.at && W_.views[G.at] ? G.at : W_.start; await loadingFor(first_); $("hud").hidden = false; $("menu").hidden = false; $("mtog").hidden = false; busy = true;
  if (!G.intro) { ambSet({ out: .9, rain: .3, lp: 20000 }); const stop = atFilm(G.role === "tower" ? [[1.2, "thunder", .6]] : [[1, "foghorn", .45]]), note_ = pub.film_note[G.role], hold_ = note_.reduce((a, l) => a + lineMs(l), 0) / 1000 + .4, endSubs = filmSubs(note_, "A note from Mr Quick"); await Engine.playVideo(`rooms/intro/${G.role === "tower" ? "tower" : "office"}.mp4`, G.role === "tower" ? "Kerrow Point" : "Kerrow Harbour", "7 October 1912", hold_ + 4, hold_); endSubs(); stop(); }
  renderInv(); $("inv").hidden = false; $("task").hidden = false; taskLine(); await enter(first_, 1);
  if (!G.intro) { sfx.ring(); toast("The telephone is ringing."); await new Promise(r => setTimeout(r, 3900)); await playCall(pub.open_call); [...pub.open_notes.both, ...pub.open_notes[G.role]].forEach(t => addLog(t, "said")); addNames(pub.names_open); G.intro = true; save(); busy = false; corner("New note in your journal"); await tutorial(); } busy = false; applyState(N);
}
function connect() { Net.listen(G.code, G.id, applyState); }
const startedAt = () => N && N.started ? N.started : Date.now();
let lastProg = Date.now(); const nudged = {};
function taskLine() { if (!N || !G.role) return; const n = curPart(), q = question(n), E = $("task"); if (N.lit) { E.hidden = true; return; } E.innerHTML = q ? `<b>${esc(q.name)}</b> ${esc(q.callback.replace(/^Well\? /, ""))} <i>Ring Mr Quick with the answer.</i>` : `<b>Last job</b> ${G.role === "tower" ? "Light the great lamp. The office has the steps." : "Talk the tower through the service manual."}`; }
function updateHud() { if (!N) return; if (W_ && !busy && !anyOpen() && N.started) { const n = curPart(); if (n <= 6 && !nudged[n] && Date.now() - lastProg > 420000) { nudged[n] = true; toast("Stuck? Ring Mr Quick and ask for a hint."); } } const m = Math.max(0, Math.floor((Date.now() - startedAt()) / 60000)); $("time").textContent = m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60}`; }
setInterval(updateHud, 20000);
$("sndb").onclick = () => { const p = $("sndp"); p.hidden = !p.hidden; if (!p.hidden) { ctx(); sfx.tick(); } }; [["vFx", "fx"], ["vAmb", "amb"], ["vVoice", "voice"]].forEach(([id, b]) => { $(id).value = volOf(b); $(id).oninput = () => setBus(b, +$(id).value); });
$("vol").value = +(localStorage.getItem("kerrow-vol") || .8); $("vol").oninput = () => { const v = +$("vol").value; localStorage.setItem("kerrow-vol", v); ctx(); master.gain.value = v; };
$("task").onclick = () => { if (busy || Engine.busy() || anyOpen()) return; sfx.tick(); openJournal("quick"); };
$("menu").onclick = () => { if (busy || Engine.busy()) return; sfx.tick(); toTitle(); };
async function toTitle() { Net.close(); $("task").hidden = true; $("clr").hidden = true; $("chartHelp").hidden = true; stopDemo(); $("marks").innerHTML = ""; $("edgeL").classList.remove("avail"); $("edgeR").classList.remove("avail"); $("mtog").hidden = true; $("inv").hidden = true; $("read").hidden = true; $("hud").hidden = true; $("menu").hidden = true; thought(null); MODALS.forEach(m => $(m).hidden = true); syncScrim(); W_ = null; rec = null; ring.classList.add("gone"); await showTitle(true); }
/* ---- title, host and join ---- */
let titleRec;
async function showTitle(fade) { titleRec = await Engine.load("title", "title"); $("loading").hidden = true; titleRec.opts = { rain: true }; ambSet({ rain: .3, out: .55, lp: 12000 }); Engine.compose(titleRec, []); $("title").hidden = false; $("lobby").hidden = true; $("cont").hidden = !G.code; if (G.code) $("cont").textContent = `Continue game ${G.code}`; if (fade) Engine.go(titleRec, -1); else Engine.show(titleRec); }
async function joinRoom(code) { const st = await Net.room(code); if (!st) return false; N = st; G.code = code; save(); connect(); $("title").hidden = true; $("lobby").hidden = false; renderLobby(); return true; }
$("host").onclick = async () => { ctx(); sfx.tick(); G = Object.assign(blank(), { id: G.id }); try { const code = await Net.create(); await joinRoom(code); } catch (e) { $("jmsg").textContent = "Couldn't reach the connection service. Check your internet and try again."; $("joinBox").hidden = false; } };
$("join").onclick = () => { ctx(); sfx.tick(); $("joinBox").hidden = false; $("jcode").focus(); };
$("jgo").onclick = async () => { const c = $("jcode").value.trim().toUpperCase(); if (c === G.code) { await joinRoom(c); return; } const old = G; G = Object.assign(blank(), { id: G.id }); let ok = false; try { ok = await joinRoom(c); } catch (e) {} if (!ok) { G = old; $("jmsg").textContent = Net.peer ? "Couldn't reach that game. Check the code and ask your partner to keep it open. Some networks block direct links." : "No game with that code."; } };
$("jcode").onkeydown = e => { if (e.key === "Enter") $("jgo").click(); e.stopPropagation(); };
$("cont").onclick = async () => { ctx(); sfx.tick(); let ok = false; try { ok = await joinRoom(G.code); } catch (e) {} if (!ok) { $("jmsg").textContent = Net.peer ? "Your partner's game isn't open. Ask them to open it, then try again." : "That game is gone."; $("joinBox").hidden = false; } };
$("howb").onclick = () => { sfx.tick(); showM("how"); }; $("howX").onclick = () => hideM("how");
function renderLobby() { const taken = r => N.roles[r] && N.roles[r] !== G.id; $("lcode").innerHTML = [...G.code].map(c => `<span>${c}</span>`).join(""); [["pT", "tower"], ["pH", "office"]].forEach(([b, r]) => { $(b).disabled = !!taken(r); $(b).classList.toggle("on", G.role === r); }); $("lwait").textContent = (N.online || 0) > 1 ? "Your partner is connected." : "Waiting for your partner. You can begin while you wait."; $("lgo").disabled = !G.role; }
function pick(r) { sfx.tick(); G.role = r; save(); post({ role: r }); renderLobby(); }
$("pT").onclick = () => pick("tower"); $("pH").onclick = () => pick("office"); $("lgo").onclick = () => begin(); $("lback").onclick = () => { $("lobby").hidden = true; $("title").hidden = false; };
(async function boot() {
  if (location.search.includes("reset")) { localStorage.removeItem(KEY); localStorage.removeItem("kerrow-tut"); location.replace(location.pathname + location.hash); return; }
  [vault, pub] = await Promise.all([fetch("data/vault.json").then(r => r.json()), fetch("data/public.json").then(r => r.json())]);
  await showTitle(false);
})();

/* ---- lights at sea ---- */
const pat = (on, per, t) => { let u = (t % per), a = 0; for (const d of on) { if (u >= a && u < a + d) return 1; a += d + .55; } return 0; };
const irr = t => { const b = Math.floor(t * 3.2); return (Math.sin(b * 91.7) * 43758.5) % 1 > .3 ? 1 : 0; };
const WH = [1, .95, .8], WARM = [1, .7, .3], RED = [1, .1, .08];
let flashAct = null;
function lightsFor(name, meta) {
  const P = (id, fn, c, r) => { const h = meta.hots[id]; return h ? t => ({ x: (h[0] + h[2]) / 2, y: 1 - (h[1] + h[3]) / 2, i: fn(t), c, r }) : null; }, list = [];
  if (name === "bayT" || name === "bayH") list.push(P("gannet", t => (flashAct ? 0 : pat([.5, .5, .5], 15, t)) * 1.8, WH, .014), P("aldo", t => (flashAct ? 0 : pat([1.6], 5, t)) * 1.8, WH, .014), P("blackhen", t => (flashAct ? 0 : pat([.5, 1.5], 8, t)) * 1.8, WH, .014), P("carn", t => .9, WARM, .008), P("penmor", t => .85 + .12 * Math.sin(t * 2.1), [1, .72, .35], .016), P("red", t => 1.3, RED, .01), P("false", t => (flashAct ? 0 : irr(t)) * 1.6, WH, .012));
  if (name === "bayH") list.push(...["W", "NW", "NE", "ship"].map(b => P(b, t => flashI(b), WH, .018)));
  if (name.startsWith("sight")) { const k = +name.slice(5), D_ = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"], b = pub.docs.bearings_tower; if (D_[k] === b.glow) list.push(P("l0", t => .8, WH, .008)); if (D_[k] === b.hall) list.push(P("l0", t => .85 + .12 * Math.sin(t * 2.1), [1, .72, .35], .012)); if (D_[k] === b.flasher) list.push(P("l0", t => irr(t) * 1.5, WH, .013)); }
  if (name === "tchart" && meta.hots.paper) { const r = meta.hots.paper, M = (c, id) => { const [x, y] = mk(c); return t => { const on = chartHov === id || (drag && drag.id === id); return { x: r[0] + x / SX * (r[2] - r[0]), y: 1 - (r[1] + y / SY * (r[3] - r[1])), i: on ? 1.7 : .6 + .3 * Math.sin(t * 2.4), c: [1, .78, .35], r: on ? .034 : .024 }; }; }; list.push(M(pub.docs.tower_cell, "t"), M(pub.docs.harbour_cell, "h")); }
  const fs = list.filter(Boolean); return t => fs.map(f => f(t));
}
function flashI(b) { if (!flashAct || flashAct.b !== b) return 0; const e = (performance.now() - flashAct.t0) / 1000; let a = 0; for (const c of flashAct.g) { const d = c === "." ? .35 : 1.05; if (e >= a && e < a + d) return 1.6; a += d + .45; } if (e > a + .3) { if (flashAct.next) flashAct.next(); else flashAct = null; } return 0; }
function playFlash(i, chain) { const [t, b, g] = G.flash[i]; document.querySelectorAll("#flash .fr").forEach((e, k) => e.classList.toggle("on", k === i)); flashAct = { b: b === "NW" && g !== "-" ? "ship" : b, g, t0: performance.now(), next: chain && i + 1 < G.flash.length ? () => playFlash(i + 1, true) : null }; }
const LABELS = { berths: "List of berths", moorbook: "Mooring book", tags: "Berth board", manual: "Service manual", can: "Reserve can", pump: "Pump", cup: "Spirit cup", valve: "Oil valve", clock: "Clockwork", lens: "The burner",  zweather: "The weather bench", zlights: "Chart table and window", zrecords: "Notices and records", desk: "Keeper's desk", telephone: "Telephone", window: "Window", shelf: "Book shelf", stove: "Stove", tide: "Tide table", logbook: "Logbook", watch: "Pocket watch", drawer: "Desk drawer", crank: "Crank the telephone", morse: "Morse card", plate: "Brass plate", gauge: "Reservoir gauge", oilbook: "Oil book", turnL: "Turn the compass", turnR: "Turn the compass", qdesk: "Mr Quick's desk", charttable: "Chart table", register: "Harbour register", barograph: "Barograph", weather: "Weather book", board: "Notice board", lantern: "Lantern", keybox: "Key box", chart: "Turn the drum", barrel: "Paraffin barrel", cans: "Paraffin cans", report: "Watch report", bearn: "Bearings", matches: "Matches" };
const hotLabel = (id, a) => a.label || LABELS[id] || "";
function viewLive(name, seen) { const v = W_.views[name]; if (!v) return true; seen = seen || new Set(); if (seen.has(name)) return false; seen.add(name); if (v.read && !(CLUE_PART[v.read] < curPart())) return true; const hs = Object.values(v.hots || {}); return (!v.read && !hs.length) || hs.some(a => !a.quiet && !a.nav && hotLive(a, seen)); }
function hotLive(a, seen) { if (a.type === "go" && !a.nav) return viewLive(a.view, seen); if (a.type === "pick" || a.type === "open") return !G.items.includes(a.item); if (a.type === "drum") return !(CLUE_PART.chart < curPart()); return true; }
function nowIn(k, map) { return (map[k] || []).includes(curPart()); }
function viewNow(name, seen) { const v = W_.views[name]; if (!v) return false; seen = seen || new Set(); if (seen.has(name)) return false; seen.add(name); if (v.read && nowIn(v.read, CLUE_NOW)) return true; return Object.values(v.hots || {}).some(a => !a.quiet && a.view !== "wide" && hotNow(a, seen)); }
function hotNow(a, seen) { if (a.type === "go") return viewNow(a.view, seen); if (a.type === "drum") return curPart() === 1; if (a.type === "doc") return nowIn(a.doc, CLUE_NOW); if (a.type === "step") return curPart() > 6; if (a.type === "pick" || a.type === "open") return !G.items.includes(a.item) && nowIn(a.item, ITEM_NOW); return false; }
function placeMarks() { const M = $("marks"); M.innerHTML = ""; if (!W_ || !view || !rec) return; const v = W_.views[view], m = rec.meta; for (const [id, a] of Object.entries(v.hots)) { const r = a.rect || m.hots[id]; if (!r || a.nomark || !hotLive(a)) continue; const [x, y] = Engine.toScreen((r[0] + r[2]) / 2, (r[1] + r[3]) / 2), e = document.createElement("div"); const isPh = id === "telephone" || a.type === "call"; e.className = "mk" + (a.nav ? " nav" : "") + (isPh ? " now" : "") + (isPh ? " phone" : ""); e.style.left = x + "px"; e.style.top = y + "px"; if (a.nav) e.textContent = "\u203a"; M.appendChild(e); } }
addEventListener("resize", () => { if (W_ && !busy) placeMarks(); });
$("mtog").onclick = () => { sfx.tick(); document.body.classList.toggle("nomarks"); try { localStorage.setItem("kerrow-marks", document.body.classList.contains("nomarks") ? "0" : "1"); } catch (e) {} }; try { if (localStorage.getItem("kerrow-marks") === "0") document.body.classList.add("nomarks"); } catch (e) {}
function uiFor(name) {
  $("marks").innerHTML = ""; setTimeout(placeMarks, 340); const bk = !!W_.views[name].back; $("edgeL").classList.toggle("avail", bk); $("edgeR").classList.toggle("avail", bk);
  const showF = name === "bayH" && G.flash, F = $("flash"); F.hidden = !showF; if (showF && !F.dataset.built) { F.dataset.built = "1"; F.innerHTML = `<h3>Flash log</h3><p class="lab">Every flash seen from here since 22:30. Watch each group at its bearing, and tell your partner what you see.</p>` + G.flash.map(([t, b], i) => `<button class="fr" data-i="${i}"><span>${t}</span><b>${b}</b></button>`).join("") + `<button id="fall">Play all</button>`; F.querySelectorAll(".fr").forEach(x => x.onclick = () => { sfx.tick(); playFlash(+x.dataset.i, false); }); $("fall").onclick = () => playFlash(0, true); }
  $("clr").hidden = name !== "tchart"; $("chartHelp").hidden = name !== "tchart"; if (name === "tchart") { chartText(); if (!G.chartDemo) { G.chartDemo = true; save(); setTimeout(chartDemo, 1200); } } else stopDemo();
}
$("clr").onclick = () => { G.lines = []; save(); refresh(); }; $("chShow").onclick = () => { sfx.tick(); chartDemo(); };
/* ---- ruling lines on the chart ---- */
let drag = null, rTick = false, chartHov = null, demoRun = null, demoT = null; const SX = 420, SY = 360, mk = c => [34 + c[0] * 40 + 20, 24 + c[1] * 40 + 20];
function svgAt(e) { const [x, y] = Engine.toImage(e.clientX, e.clientY), r = rec.meta.hots.paper; return [(x - r[0]) / (r[2] - r[0]) * SX, (y - r[1]) / (r[3] - r[1]) * SY]; }
function drawFor(name) { if (name !== "tchart") return null; return (c, W, H) => { const r = rec.meta.hots.paper, px = x => (r[0] + x / SX * (r[2] - r[0])) * W, py = y => (r[1] + y / SY * (r[3] - r[1])) * H; c.save(); c.beginPath(); c.rect(px(34), py(24), px(354) - px(34), py(344) - py(24)); c.clip(); c.lineCap = "round"; c.strokeStyle = "rgba(30,28,40,.85)"; c.lineWidth = W / 700; for (const l of G.lines) { c.beginPath(); c.moveTo(px(l.o[0]), py(l.o[1])); c.lineTo(px(l.o[0] + Math.cos(l.a) * 600), py(l.o[1] + Math.sin(l.a) * 600)); c.stroke(); } if (demoRun) { c.strokeStyle = demoRun.done ? "rgba(30,28,40,.85)" : "rgba(170,130,50,.8)"; c.lineWidth = demoRun.done ? W / 700 : W / 90; c.beginPath(); c.moveTo(px(demoRun.o[0]), py(demoRun.o[1])); c.lineTo(px(demoRun.o[0] + Math.cos(demoRun.a) * demoRun.len), py(demoRun.o[1] + Math.sin(demoRun.a) * demoRun.len)); c.stroke(); } if (drag && drag.moved) { c.strokeStyle = "rgba(170,130,50,.8)"; c.lineWidth = W / 90; c.beginPath(); c.moveTo(px(drag.o[0]), py(drag.o[1])); c.lineTo(px(drag.o[0] + Math.cos(drag.a) * 600), py(drag.o[1] + Math.sin(drag.a) * 600)); c.stroke(); } c.restore(); }; }
const DN = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"], HELP = "To rule a line, press on the tower or the harbour office, drag towards the bearing, and let go.";
const marksOn = () => [{ id: "t", o: mk(pub.docs.tower_cell), name: "Tower" }, { id: "h", o: mk(pub.docs.harbour_cell), name: "Harbour office" }];
const nearMark = p => marksOn().find(k => Math.hypot(p[0] - k.o[0], p[1] - k.o[1]) < 28);
const inPaper = p => p[0] >= 0 && p[0] <= SX && p[1] >= 0 && p[1] <= SY;
let chartT; function chartText(t) { clearTimeout(chartT); $("chText").textContent = t || HELP; } function chartSay(t) { chartText(t); chartT = setTimeout(chartText, 3500); }
function showTip(t, e) { const tip = $("tip"); tip.textContent = t; tip.style.transform = `translate(${e.clientX + 30}px,${e.clientY + 16}px)`; tip.hidden = false; }
function stopDemo() { clearInterval(demoT); demoT = null; $("penDemo").hidden = true; if (demoRun) { demoRun = null; refresh(); } }
function chartDemo() { if (view !== "tchart" || !rec || anyOpen()) return; stopDemo(); const used = new Set(Object.values(pub.docs.bearings_harbour)), o = mk(pub.docs.harbour_cell), len = 110, ang = d => DN.indexOf(d) * Math.PI / 4 - Math.PI / 2, fits = d => { const x = o[0] + Math.cos(ang(d)) * len, y = o[1] + Math.sin(ang(d)) * len; return x > 34 && x < 354 && y > 24 && y < 344; }, d = DN.find(x => !used.has(x) && fits(x)) || DN.find(fits), a = ang(d), r = rec.meta.hots.paper, pen = $("penDemo"), t0 = performance.now(); chartText("Like this: press on the mark, drag towards the bearing, let go."); pen.hidden = false;
  demoT = setInterval(() => { const u = (performance.now() - t0) / 2400; if (view !== "tchart" || u > 1.3) { stopDemo(); chartText(); return; } const e = u < .2 ? 0 : Math.min(1, (u - .2) / .8), l = len * e * (2 - e); demoRun = { o, a, len: u >= 1 ? 600 : l, done: u >= 1 }; refresh(); const [x, y] = Engine.toScreen(r[0] + (o[0] + Math.cos(a) * l) / SX * (r[2] - r[0]), r[1] + (o[1] + Math.sin(a) * l) / SY * (r[3] - r[1])); pen.style.transform = `translate(${x}px,${y}px)`; }, 50); }
C.addEventListener("mousedown", e => { if (view !== "tchart" || anyOpen() || !rec || busy) return; stopDemo(); const p = svgAt(e), k = nearMark(p); if (k) { drag = { o: k.o, id: k.id, a: 0, moved: false, x: e.clientX, y: e.clientY }; sfx.tick(); chartText("Keep holding, and drag towards the bearing."); } else if (inPaper(p)) chartSay("Start on the tower or the harbour office, where the marks glow."); });
addEventListener("mousemove", e => { if (view !== "tchart" || !rec || !W_ || !$("title").hidden) { ring.classList.remove("pencil"); chartHov = null; return; } const p = svgAt(e), on = e.target === C && !anyOpen() && inPaper(p), k = on ? nearMark(p) : null; ring.classList.toggle("pencil", on); chartHov = k ? k.id : null;
  if (drag) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12) drag.moved = true; drag.a = Math.round(Math.atan2(p[1] - drag.o[1], p[0] - drag.o[0]) / (Math.PI / 4)) * (Math.PI / 4); if (drag.moved) { const b = DN[(Math.round((drag.a + Math.PI / 2) / (Math.PI / 4)) + 16) % 8]; chartText(`Bearing ${b}. Let go to rule the line.`); showTip(b, e); if (!rTick) { rTick = true; setTimeout(() => { rTick = false; refresh(); }, 60); } } }
  else if (k) showTip(`${k.name}: press and drag`, e); });
addEventListener("mouseup", () => { if (!drag) return; const d = drag; drag = null; chartText(); $("tip").hidden = true; if (!d.moved) { chartSay("Hold the button down and drag away from the mark."); return; } if (!G.lines.some(l => l.o[0] === d.o[0] && l.o[1] === d.o[1] && Math.abs(l.a - d.a) < .01)) G.lines.push({ o: d.o, a: d.a }); sfx.pencil(); save(); refresh(); });
/* ---- the ending ---- */
async function endFlow() {
  busy = true; hideM("journal"); hideM("call"); thought(null); $("read").hidden = true; $("flash").hidden = true; $("gt").hidden = true; $("marks").innerHTML = ""; $("edgeL").classList.remove("avail"); $("edgeR").classList.remove("avail"); $("clr").hidden = true; $("chartHelp").hidden = true; $("task").hidden = true; $("inv").hidden = true;
  if (G.role === "tower") { await enter("lit", 1); $("read").hidden = true; thought(null); await new Promise(r => setTimeout(r, 3500)); }
  $("hud").hidden = true; $("menu").hidden = true; ambSet({ out: .8, rain: .15, lp: 20000 }); const stopE = atFilm([[.8, "foghorn", .55], [4.5, "horn", .8]]); await Engine.playVideo("rooms/intro/ending.mp4", "", "", 14); stopE(); ambSet({ out: .35, lp: 3000 });
  await slip(`<p class="hand">${esc(G.letter || "")}</p><p class="sig">E. Tregarth, keeper of Kerrow Point</p>`, "note");
  try { const ph = await Engine.load("tower", "bookphoto"); ph.opts = {}; Engine.compose(ph, []); rec = null; await new Promise(res => Engine.go(ph, 1, [.5, .5], res)); $("thought").textContent = "Tucked into the logbook: the reason he left."; $("thought").hidden = false; await new Promise(r => setTimeout(r, 5000)); $("thought").hidden = true; } catch (e) {}
  const m = Math.max(1, Math.round((Date.now() - startedAt()) / 60000)), hn = Object.values(N.hints).reduce((a, b) => a + b, 0); $("endc").innerHTML = `<h2>The Last Light</h2><p>${m} minutes, ${hn} hint${hn === 1 ? "" : "s"}.</p><button class="mbtn" id="endb">Back to the title</button>`; $("endc").hidden = false; busy = false; $("endb").onclick = () => { $("endc").hidden = true; G = blank(); save(); location.reload(); };
}
