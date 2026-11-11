/* The journal, the telephone conversation, item cards, captions. */
const ITEMS = { matches: ["Box of matches", "From the warming shelf on the stove. For a lamp."],  lantern: ["Hurricane lantern", "For somewhere without a lamp."], hatchkey: ["Hatch key", "The tag says Lamp hatch. It should fit the ladder hatch."], storekey: ["Store key", "The tag says Oil store. It should fit the door under the stairs."] };
const CLUES_OLD = { log: "The keeper's log", weather: "Harbour weather book", chart: "Barograph chart", board: "Notices on the board", oil: "Oil book", plate: "Brass plate", gauge: "Reservoir gauge", pilot: "The pilot's book", tide: "Tide table", morse: "Morse card", report: "Watch report", bearings: "Harbour bearings", register: "Harbour register", receipt: "Treloar's receipt", cans: "The oil cans", sill: "Lights from the sill", sight: "The compass", sight2: "The compass" };
const CLUE_NOW = { log: [1], weather: [1], chart: [1], oil: [2], plate: [2], gauge: [2], receipt: [2], cans: [2], board: [3, 4], pilot: [3], report: [3], bearings: [3], sight: [3], sight2: [3], morse: [4], sill: [3, 4], berths: [5], tags: [5], moor: [6], tide: [6], manual: [7] }, ITEM_NOW = { hatchkey: [2], storekey: [2], lantern: [2], matches: [7] };
const CLUE_PART = { log: 1, weather: 1, chart: 1, oil: 2, plate: 2, gauge: 2, receipt: 2, cans: 2, pilot: 3, report: 3, bearings: 3, board: 4, morse: 4, sill: 4, berths: 5, tags: 5, moor: 6, tide: 6, register: 6, manual: 7 };
const CLUES = { ...CLUES_OLD, berths: "List of berths", tags: "Berth board", moor: "Mooring book", manual: "Service manual", register: "Harbour register" };
let jTab = "quick", jClue = null, jOld = false, toastT;
function toast(t) { const e = $("toast"); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => e.hidden = true, 2800); }
function renderInv() {
  $("inv").innerHTML = `<button class="item journal" id="jrnBtn" title="Notebook" aria-label="Notebook"><span class="book-icon"></span></button><button class="item logb" id="logBtn" title="What Mr Quick said" aria-label="What Mr Quick said"><span class="log-icon">&#9742;</span></button><span class="isep"></span>` + G.items.map(i => `<button class="item" data-i="${i}" title="${ITEMS[i][0]}" aria-label="${ITEMS[i][0]}"><img src="rooms/icons/${i}.jpg" alt=""></button>`).join("");
  $("jrnBtn").onclick = () => { sfx.page(); openJournal("quick"); }; $("logBtn").onclick = () => { sfx.page(); openLog(); };
  document.querySelectorAll("#inv .item[data-i]").forEach(b => b.onclick = () => { sfx.tick(); const i = b.dataset.i; $("card").innerHTML = `<button class="x" id="cardX" aria-label="Close">&times;</button><img src="rooms/icons/${i}.jpg" alt=""><h3>${ITEMS[i][0]}</h3><p>${ITEMS[i][1]}</p><p class="how">It's used by itself when you click the right thing.</p>`; showM("card"); $("cardX").onclick = () => hideM("card"); });
}
function question(n) { return n === 1 ? pub.q1 : G.questions[n]; }
const curPart = () => Object.keys(N.solved).length + 1;
function hintKey(i) { return i === 1 ? KCrypto.b64d(vault.k0) : (G.keys[i] ? KCrypto.b64d(G.keys[i]) : null); }
function hintsFor(n) { const k = hintKey(n); return k ? KCrypto.openJson(k, vault.parts[n - 1].hints) : []; }
function callFor(n) { return !!question(n); }
function leftPage() {
  const n = curPart(), rows = []; for (let i = 1; i <= 6; i++) { const q = question(i), st = i < n ? "done" : i === n ? "now" : "later"; rows.push(`<li class="${st}"><span>${q ? esc(q.name) : "&hellip;"}</span><i>${st === "done" ? "&#10003;" : ""}</i></li>`); }
  const used = Object.values(N.hints).reduce((a, b) => a + b, 0), m = Math.max(0, Math.floor((Date.now() - startedAt()) / 60000));
  return `<h2>The night so far</h2><p class="stat">${m} min &middot; ${used} hint${used === 1 ? "" : "s"}</p><ol class="parts">${rows.join("")}</ol>`;
}
function quickPage() {
  const n = curPart(), q = question(n), used = N.hints[n] || 0; let hs = []; try { hs = used ? hintsFor(n).slice(0, used) : []; } catch (e) {}
  const tagged = G.log.some(e => e.p), notes = tagged ? G.log.filter(e => e.p === n) : G.log.slice(-3);
  return `<h2>Now</h2>${q ? `<p class="lab">Mr Quick asks</p><p class="hand ask">${esc(q.callback)}</p>` : `<div class="task-now">${$("task").innerHTML}</div>`}<button id="ringQ" class="ringq">Ring Mr Quick</button><p class="lab">Give him your answer, or ask for a hint.</p>`
    + (notes.length ? `<h3>What to do</h3>${notes.map(e => `<p class="note">${esc(e.text)}</p>`).join("")}` : "")
    + (hs.length ? `<h3>Hints so far</h3>${hs.map((h, k) => `<div class="hint"><b>Hint ${k + 1}</b><p>${esc(h)}</p></div>`).join("")}` : "");
}
function logVoices(id) {
  const V = pub.voice || {}; if (id === "note") return [V["film_" + G.role], null]; if (id === "open") return [V.open, null];
  try { const p = +id, r = KCrypto.openJson(KCrypto.b64d(N.rkeys[p]), vault.parts[p - 1].reward); return [r.voice, r.akey]; } catch (e) { return [null, null]; }
}
function openLog() {
  const n = curPart(), pn = p => (question(p) || {}).name || `part ${p}`;
  const ent = (G.said || []).map(e => ({ id: e.id, k: e.id === "note" ? 0 : e.id === "open" ? .5 : +e.id + .5, head: e.id === "note" ? "His note" : e.id === "open" ? "The first call" : `After ${pn(+e.id)}`, lines: e.lines }));
  for (let p = 1; p <= Math.min(n, 6); p++) { const u = N.hints[p] || 0; if (u) { try { ent.push({ id: null, k: p, head: `Hints: ${pn(p)}`, lines: hintsFor(p).slice(0, u) }); } catch (e) {} } }
  ent.sort((a, b) => b.k - a.k); const L = $("qlog");
  L.innerHTML = `<button class="x big" id="logX" aria-label="Close">&times;</button><div class="logp"><h2>What Mr Quick said</h2><p class="lab">Newest first.</p>${ent.length ? ent.map((e, i) => `<section class="${i ? "" : "latest"}"><h3>${esc(e.head)}${e.id && logVoices(e.id)[0] ? `<button class="play" data-v="${esc(e.id)}" aria-label="Hear it again">&#9654; Hear it again</button>` : ""}</h3>${e.lines.map(t => `<p class="hand">${esc(t)}</p>`).join("")}</section>`).join("") : `<p class="lab">Nothing yet.</p>`}</div>`;
  showM("qlog"); $("logX").onclick = () => { sfx.page(); window.voiceStop && window.voiceStop(); hideM("qlog"); };
  L.querySelectorAll("button.play").forEach(b => b.onclick = () => { sfx.tick(); const [vs, ak] = logVoices(b.dataset.v); if (vs) window.voiceSeq(vs, ak); });
}
function hintsPage() { const n = curPart(), used = N.hints[n] || 0, list = hintsFor(n); return `<h2>Hints so far</h2>${used ? list.slice(0, used).map(h => `<p class="hand">${esc(h)}</p>`).join("") : `<p class="lab">Ask Mr Quick on the telephone. Each player sees the same hints.</p>`}`; }
function cluesPage() { if (jClue) return `<button id="clueBack" class="link">&lsaquo; All clues</button><div class="plain">${readText(jClue)}</div>`; const got = G.clues.filter(k => CLUE_PART[k] && !notYet(k)), n = curPart(), now = got.filter(k => !(CLUE_PART[k] < n)), old = got.filter(k => CLUE_PART[k] < n), li = a => `<ul class="clist">${a.map(k => `<li><button class="link" data-c="${k}">${CLUES[k]}</button></li>`).join("")}</ul>`; return `<h2>Clues</h2>${now.length ? li(now) : `<p class="lab">${got.length ? "Nothing yet for this part. Keep looking." : "Anything written that you find will be kept here."}</p>`}${old.length ? `<details class="solved"${jOld ? " open" : ""}><summary>Solved (${old.length})</summary>${li(old)}</details>` : ""}`; }
const tabsHtml = () => `<nav class="tabs">${[["quick", "Now"], ["clues", "Clues"]].map(([t, l]) => `<button data-t="${t}" class="${t === jTab ? "on" : ""}">${l}</button>`).join("")}</nav>`;
function wireJournal(J) { J.querySelectorAll("nav button").forEach(b => b.onclick = () => { sfx.page(); jClue = null; openJournal(b.dataset.t); }); $("jClose").onclick = () => hideM("journal"); }
function openJournal(tab) {
  if (tab) jTab = tab; const J = $("journal");  const R = jTab === "hints" ? hintsPage() : jTab === "clues" ? cluesPage() : quickPage();
  J.innerHTML = `<div class="book"><div class="page lp">${leftPage()}</div><div class="page rp">${R}</div></div>${tabsHtml()}<button class="x big" id="jClose" aria-label="Close">&times;</button>`; showM("journal");
  J.querySelectorAll("nav button").forEach(b => b.onclick = () => { sfx.page(); jClue = null; openJournal(b.dataset.t); }); $("jClose").onclick = () => hideM("journal");
  J.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { sfx.tick(); jClue = b.dataset.c; openJournal("clues"); }); if ($("ringQ")) $("ringQ").onclick = () => { sfx.crank(); hideM("journal"); openCall(); }; const dOld = J.querySelector("details.solved"); if (dOld) dOld.ontoggle = () => { jOld = dOld.open; }; if ($("clueBack")) $("clueBack").onclick = () => { jClue = null; openJournal("clues"); };
}
/* ---- the barograph drum: turn it by hand to read the week ---- */
let drumX = 0;
function openDrum() {
  const D = $("drum"); noteClue("chart");
  D.innerHTML = `<button class="x" id="dX" aria-label="Close">&times;</button><div class="dcol"><div class="cyl" id="cyl"><div class="cyp" id="cyp"></div><div class="cya"></div><i class="cysh"></i></div><div class="dctl"><button id="dL" aria-label="Turn back a day">&lsaquo;</button><div class="crank" id="crank"><i></i></div><button id="dR" aria-label="Turn on a day">&rsaquo;</button></div></div><div class="dnote"><h3>How to read the glass</h3><p>${esc(pub.docs.glass_card)}</p><p class="lab">Drag the drum to turn it through the week.</p></div>`; showM("drum");
  const cyl = $("cyl"), cyp = $("cyp"), crank = $("crank"), wI = () => cyl.clientHeight * 2100 / 960, ax = () => wI() * .062, max = () => Math.max(0, wI() - cyl.clientWidth + ax()), set = x => { drumX = Math.max(0, Math.min(max(), x)); cyp.style.left = ax() + "px"; cyp.style.backgroundPosition = `${-(drumX + ax())}px 0`; crank.style.transform = `rotate(${drumX * .7}deg)`; };
  set(drumX); const day = () => wI() * .131; $("dL").onclick = () => { sfx.ratchet(); set(drumX - day()); }; $("dR").onclick = () => { sfx.ratchet(); set(drumX + day()); }; $("dX").onclick = () => hideM("drum");
  [cyl, crank].forEach(el => el.onpointerdown = e => { e.preventDefault(); sfx.ratchet(); const x0 = e.clientX, d0 = drumX, k = el === crank ? -2 : -1, mv = ev => set(d0 + (ev.clientX - x0) * k), up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); }; addEventListener("pointermove", mv); addEventListener("pointerup", up); });
}
function openCall() {
  const n = curPart(), q = question(n), C = $("call"), used = N.hints[n] || 0, list = q ? hintsFor(n) : [];
  if (!q) { C.innerHTML = `<button class="x" id="callX" aria-label="Hang up">&times;</button><h3>Mr Quick</h3><p class="hand">${N.solved[6] ? (G.role === "tower" ? "Don't stand there talking. Do as the office tells you and light that lamp!" : "Read the tower the manual, step by step. Hurry!") : "Nothing more tonight."}</p>`; showM("call"); $("callX").onclick = () => hideM("call"); return; }
  if (window.voiceQ && C.hidden) window.voiceQ(q);
  C.innerHTML = `<button class="x" id="callX" aria-label="Hang up">&times;</button><p class="who">Mr Quick, on the line</p><p class="hand">${esc(q.callback)}</p><div class="boxes" aria-label="${esc(q.label)}">${[...Array(q.len)].map(() => `<input class="b" maxlength="1" inputmode="${q.num ? "numeric" : "text"}" autocomplete="off">`).join("")}</div><p class="lab">${esc(q.label)}</p><span id="nope" class="nope"></span><div class="row"><button id="send">Tell him</button><button id="more" class="alt"${used >= list.length ? " disabled" : ""}>${used ? "Ask for another hint" : "Ask for a hint"}</button><button id="notyet" class="alt">No, not yet</button></div><div class="hs">${list.slice(0, used).map((h, k) => `<div class="hint"><b>Hint ${k + 1}</b><p>${esc(h)}</p></div>`).join("")}</div>`; showM("call");
  $("callX").onclick = () => { sfx.hangup(); hideM("call"); }; $("notyet").onclick = () => { sfx.hangup(); hideM("call"); toast("Then get on with it, and ring me when you have it."); };
  $("more").onclick = async () => { sfx.crank(); await post({ hints: { [n]: used + 1 } }); setTimeout(openCall, 150); };
  const ins = [...C.querySelectorAll("input.b")]; ins.forEach((b, i) => { b.oninput = () => { b.value = b.value.toUpperCase(); if (b.value && ins[i + 1]) ins[i + 1].focus(); }; b.onkeydown = e => { if (e.key === "Backspace" && !b.value && ins[i - 1]) ins[i - 1].focus(); if (e.key === "Enter") submit(n, ins); e.stopPropagation(); }; }); setTimeout(() => ins[0] && ins[0].focus(), 40);
  $("send").onclick = () => submit(n, ins);
}
async function submit(part, ins) {
  const val = ins.map(b => b.value).join(""), q = question(part); if (val.length < q.len) { ins[val.length].focus(); return; }
  $("send").disabled = true; await new Promise(r => setTimeout(r, 60)); const key = KCrypto.check(vault.parts[part - 1], val); $("send").disabled = false;
  if (!key) { sfx.bad(); const el = $("call"); el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 450); $("nope").textContent = "That doesn't square. Look again."; ins.forEach(b => b.value = ""); ins[0].focus(); return; }
  const b64 = btoa(String.fromCharCode(...key)); hideM("call"); await post({ solved: { [part]: true }, answers: { [part]: val }, rkeys: { [part]: b64 } });
}
const TUT = [["Look around", "Click the small rings to look closer. To step back, click the arrow at the bottom of the screen, or right-click. Press Esc for the menu."], ["Two places, one story", "Your partner can see things you can't. Neither of you can solve a part alone, so talk the whole way through."], ["Ring Mr Quick", "The telephone is how you give him an answer. If you're stuck, ring him and ask for a hint."], ["Notebook and log", "Bottom left. The notebook holds what Mr Quick is asking, what to do next and every clue you've found. The log beside it keeps everything Mr Quick has said, newest first."], ["Hard to read?", "When you look at a paper, the Aa button at the top right shows it as plain text."]];
function tutorial() { return new Promise(res => { try { if (localStorage.getItem("kerrow-tut")) return res(); } catch (e) {} let i = 0; const T = $("tut"), draw = () => { T.querySelector(".tb").innerHTML = `<h3>${TUT[i][0]}</h3><p>${TUT[i][1]}</p><div class="tdots">${TUT.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div><button id="tutOk">${i < TUT.length - 1 ? "Next" : "Begin"}</button>`; $("tutOk").onclick = () => { sfx.tick(); if (++i < TUT.length) draw(); else { hideM("tut"); try { localStorage.setItem("kerrow-tut", "1"); } catch (e) {} res(); } }; }; draw(); showM("tut"); }); }
