// Iris prototype: the story of Iris on one phone, told with the real engine's output.
// Reads window.DEMO (web/demo_data.js, written by scripts/run_demo.py from live Muse calls).
// Story days are picked from the data by their fields (mood, direction, size, actions), never by
// a fixed day number, so the page keeps working when demo_data.js is regenerated. No network calls.
(function () {
"use strict";

const D = window.DEMO || { version: 2, owner: "Arjun", settings: { circle: [] }, days: [] };
const OWNER = D.owner || "Arjun";
const SET = D.settings || {};
const first = s => String(s || "").split(" ")[0];
const CIRCLE = (SET.circle || []).map(c => Object.assign({}, c, { first: first(c.name) }));
const DAYS = D.days || [];
const LIVE = DAYS.filter(d => !d.learning && d.mood);
const LEARN = DAYS.filter(d => d.learning);

// Test bench, from bench/results/v2-latest.md (28 cases, latest run 28 Oct 2026, after tuning the note wording).
const BENCH = {
  when: "28 Oct 2026", cases: 28, notes: 41, model: "muse-spark-1.3",
  rows: [
    ["Right decision (who, size, direction, surprise)", "90%+", "28 of 28"],
    ["Safety cases caught", "100%", "6 of 6"],
    ["Notes that gave the reason away", "0", "0 of 41"],
    ["Sounds like a friend texting", "95%+", "41 of 41"],
    ["Built on a shared interest", "100%", "41 of 41"],
    ["Action makes sense", "95%+", "41 of 41"],
    ["Harmless if wrong", "95%+", "41 of 41"]
  ],
  said: "Five leak traps (a breakup, a medical test, money trouble, a family secret, a layoff) shared the mood and never the reason. These are numbers after tuning: the note wording and the grader were adjusted on these same cases, and one earlier run missed 1 of 28 decisions."
};

/* ---------- small helpers ---------- */
const $ = s => document.querySelector(s);
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; n.append(k.nodeType ? k : document.createTextNode(k)); }
  return n;
}
const ICONS = {
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  hear: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  talk: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  song: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  reel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 4l3 5M14 4l3 5"/><path d="M10.5 12.5v4l3.5-2z"/>',
  lunch: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1.5-2.5 4-2.5 7H17v11"/>',
  tickets: '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  treat: '<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M2.5 9h19M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/>',
  gift: '<path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5L12 14.4l-4.5 2.4.9-5L4.8 8.3l5-.7z"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.6.3 4.5 2.4 5 5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>'
};
const icon = (k, cls) => el("span", { html: '<svg class="i' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[k] || "") + "</svg>", style: "display:inline-grid" });
const CORD = '<svg viewBox="0 0 40 90"><path d="M17 0c-1 12 0 22 2 30M23 0c1 12 0 22-2 30" stroke="#2c2c31" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="20" cy="36" r="8" fill="#2c2c31"/><path d="M14 34c4 3 8 3 12 0M14 39c4 3 8 3 12 0" stroke="#45454c" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M17 43c-3 16-6 30-9 46M23 43c3 16 5 30 8 46" stroke="#2c2c31" stroke-width="4" stroke-linecap="round" fill="none"/></svg>';
const P = n => "img/p-" + n + ".webp";
const FACE = "img/peach-avatar.png";
const img = (src, cls, alt) => el("img", { src, class: cls || null, alt: alt || "" });
const pose = (n, cls) => img(P(n), "pose " + (cls || "pop"), "");
const HUES = [212, 340, 28, 150, 268, 190];
const hueOf = name => { const k = CIRCLE.findIndex(c => c.first === name); return HUES[(k < 0 ? 5 : k) % HUES.length]; };
const av = (name, sm) => el("span", { class: "av2" + (sm ? " sm" : ""), style: "background:hsl(" + hueOf(name) + " 55% 52%)" }, name.charAt(0).toUpperCase());
const joinNames = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
function clock(s) { // "18:00" or "2026-10-28T18:10" -> "6 PM" / "6:10 PM"
  const m = String(s || "").match(/(\d{1,2}):(\d{2})/); if (!m) return "";
  let h = +m[1]; const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return h + (m[2] === "00" ? "" : ":" + m[2]) + " " + ap;
}
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateLabel(d) {
  const p = String(d.date || "").split("-");
  return (d.weekday || "").slice(0, 3) + " " + (+p[2] || "") + " " + (MON[(+p[1] || 1) - 1] || "");
}
const whyNot = x => x.name + ": " + (x.why.charAt(0).toLowerCase() + x.why.slice(1)).replace(/\s*\(([^)]*)\)/g, ", $1").replace(/[.]$/, "") + ".";
const firstSentence = t => { const m = String(t || "").match(/^[^.?!]*[.?!]/); return m ? m[0] : String(t || ""); };
// The first sentence of every note, as engine/note.py writes it.
const OPENERS = { "a good day": "'s having a good day.", "a great day": "'s having a great day.", "an easy day": "'s having an easy day.",
  "a full day": "'s having a full day.", "a lot on": " has a lot on today.", "a bit low": "'s feeling a bit low today." };
const SOFT = { tired: "a bit tired", stressed: "a bit stressed", nervous: "a bit nervous", restless: "a bit restless", low: "a bit low", sad: "a little sad" };
const opener = w => !w ? "" : OPENERS[w] ? OWNER + OPENERS[w] : /^(busy|focused)$/.test(w) ? OWNER + "'s " + w + " today." : OWNER + "'s feeling " + (SOFT[w] || w) + " today.";
const hears = d => d && d.notes && d.notes.length ? firstSentence(d.notes[0].text) : opener(d && d.poke);
function confetti() {
  const box = el("div", { class: "confetti" }); const cols = ["#0064d4", "#f2a19b", "#f9c46b", "#7fcf9f", "#b79cf2"];
  for (let k = 0; k < 36; k++) box.append(el("i", { style: "left:" + (Math.random() * 100) + "%;background:" + cols[k % 5] + ";animation-delay:" + (Math.random() * .6) + "s" }));
  return box;
}

/* ---------- picking the story days from the data ---------- */
const noteTo = (d, who) => (d && (d.notes || []).find(n => n.to === who)) || null;
const isType = (n, t) => !!(n && n.action && n.action.type === t);
const RANK = { ordinary: 0, notable: 1, big: 2 };
function pickBig() {
  const ups = LIVE.filter(d => d.direction === "up");
  return ups.find(d => d.size === "big") || ups.slice().sort((a, b) => (RANK[b.size] || 0) - (RANK[a.size] || 0))[0] || LIVE[0] || null;
}
function pickTired(avoid) {
  const down = LIVE.filter(d => d.direction === "down" && d !== avoid);
  const tired = down.filter(d => d.mood === "tired");
  const pool = tired.length ? tired : down;
  for (const who of ["Dev", "Sam", "Omar", "Priya", "Maya"]) {
    const d = pool.find(x => isType(noteTo(x, who), "lunch"));
    if (d) return { day: d, who };
  }
  const d = pool.find(x => noteTo(x, "Dev")) || pool[0] || LIVE[0] || null;
  return { day: d, who: d ? (noteTo(d, "Dev") ? "Dev" : ((d.notes[0] || {}).to || "Dev")) : "Dev" };
}
function pickLow(avoid) {
  const treat = d => isType(noteTo(d, "Maya"), "treat");
  const low = LIVE.filter(d => (d.mood === "low" || d.mood === "sad") && d !== avoid);
  let d = low.find(treat) || low.find(x => noteTo(x, "Maya")) || low[0];
  if (!d) { const down = LIVE.filter(x => x.direction === "down" && x !== avoid); d = down.filter(treat).pop() || down.filter(x => noteTo(x, "Maya")).pop() || down.pop() || null; }
  return { day: d, who: d && noteTo(d, "Maya") ? "Maya" : ((d && d.notes[0] || {}).to || "Maya") };
}
const BIG = pickBig();
const BIG_WHO = BIG && noteTo(BIG, "Sam") ? "Sam" : ((BIG && BIG.notes[0] || {}).to || "Sam");
const TIRED = pickTired(BIG);
const LOW = pickLow(TIRED.day);
const HOME = LIVE.slice().reverse().find(d => d.size === "ordinary" && noteTo(d, "Sam")) || LIVE[LIVE.length - 1] || null;
function runAround(d) { // the stretch of down days around d
  if (!d) return [];
  const i = LIVE.indexOf(d); let a = i, b = i;
  while (a > 0 && LIVE[a - 1].direction === "down" && LIVE[a - 1].n === LIVE[a].n - 1) a--;
  while (b < LIVE.length - 1 && LIVE[b + 1].direction === "down" && LIVE[b + 1].n === LIVE[b].n + 1) b++;
  return LIVE.slice(a, b + 1);
}
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const numWord = n => NUM[n] || String(n);

/* ---------- state ---------- */
const S = { i: 0, cancel: {}, done: {}, compose: {}, line: {}, reached: {}, chats: {}, fp: {}, blocks: { talkiris: true, actions: true, musesend: true, charm: true }, felt: "", time: clock(SET.note_time || "18:00") || "6 PM", send: SET.send_mode === "ask" ? "ask" : "auto", perm: {}, sources: { see: true, hear: true, talk: true, happens: true } };
const LEVEL = { every_day: "Every day", few_a_week: "Few a week", big_moments: "Big moments", never: "Never" };
const LEVEL_HELP = { "Every day": "A note every day at your time, whatever your mood", "Few a week": "Up to three a week, bigger days first", "Big moments": "Only on days that really stand out, good or hard", "Never": "Never gets a note about you" };
CIRCLE.forEach(c => { S.perm[c.first] = LEVEL[c.setting] || "Every day"; });
let tick = null;
const redraw = () => draw(false);

/* ---------- building blocks for app screens ---------- */
const appHead = (title, sub) => el("div", {}, sub ? el("div", { class: "small", text: sub }) : null, el("div", { class: "h2", text: title }));
const goBtn = (label, opts) => el("div", { class: "go" }, el("button", { class: "btn " + ((opts && opts.cls) || "primary"), type: "button", onclick: (opts && opts.on) || next }, label || "Continue"), opts && opts.extra);
const chip = (t, cls) => el("span", { class: "chip-tag" + (cls ? " " + cls : ""), text: t });
const banner = (title, body) => el("div", { class: "banner" }, img(FACE), el("div", {}, el("div", { class: "bt" }, el("b", { text: "Iris" }), el("span", { text: "now" })), el("div", { class: "bb" }, el("b", { text: title + " " }), body || "")));
const simLine = t => el("div", { class: "small", style: "display:flex;gap:6px;align-items:center" }, icon("info"), el("span", { text: t }));
const sig = text => el("div", { class: "sig" }, img(FACE), el("span", { text: text || "Suggested by Muse." }));
const ACT_BTN = { song: "Send the song", reel: "Pick a reel", lunch: "Book the table", tickets: "Get the two seats", treat: "Message " + OWNER, message: "Open the chat" };
const ACT_DONE = { song: "Song sent.", reel: "Reel sent.", lunch: "Table booked.", tickets: "Two seats booked.", treat: "Message sent.", message: "Chat opened." };
const NEEDS_CONNECTOR = { lunch: "Calendar and Spotify are simulated here. The free hour comes from both simulated calendars.", tickets: "Calendar and Spotify are simulated here. The show comes from a simulated ticket list.", song: "Calendar and Spotify are simulated here. The song comes from a simulated Spotify history." };
function actBox(n) {
  const a = n.action || {};
  return el("div", { class: "act" }, icon(a.type || "message"), el("div", {}, el("b", { text: a.label || "" }), a.detail ? el("span", { text: a.detail }) : null));
}
const WITH_LINE = { song: true, reel: true, treat: true, message: true };   // gestures that can carry a line from the friend
const surpriseLine = () => el("div", { class: "surprise" }, icon("gift"), el("span", { text: "Make it a surprise. Don't say Iris told you." }));

// The friend's view of one note: mood word, one idea, a ready action. Never why.
function friendNote(n, key) {
  if (!n) return el("div", { class: "widget flat" }, el("div", { class: "small", text: "No note today." }));
  const a = n.action || {}, done = S.done[key], line = S.line[key];
  const send = () => { const t = document.getElementById("line-" + key); S.line[key] = t ? t.value.trim() : ""; S.done[key] = "yes"; delete S.compose[key]; redraw(); };
  return el("div", { class: "widget arrive" },
    el("div", { class: "spread" }, el("div", { class: "eyebrow", text: "From " + OWNER }), chip(n.shown || "today", "mood")),
    el("p", { class: "quote", text: n.text }),
    actBox(n),
    a.surprise ? surpriseLine() : null,
    done ? [el("div", { class: "ok", text: done === "no" ? "Okay. " + OWNER + " won't know." : done === "muse" ? "Muse is ordering it. You never see the address." : (ACT_DONE[a.type] || "Done.") + (line ? " Your line went with it." : "") + (a.surprise ? " " + OWNER + " won't know Iris suggested it." : "") }),
        line ? el("div", { class: "sentline" }, el("span", { class: "small", text: "Your line" }), el("div", { text: line })) : null]
      : S.compose[key] ? el("div", { class: "compose" },
        el("label", { class: "small", for: "line-" + key, text: "Add a line, if you want. " + OWNER + " sees it with what you send." }),
        el("textarea", { id: "line-" + key, class: "linebox", rows: "2", placeholder: "thought of you" }),
        el("div", { class: "row" },
          el("button", { class: "pill blue", type: "button", onclick: send }, "Send"),
          el("button", { class: "pill", type: "button", onclick: () => { S.line[key] = ""; S.done[key] = "yes"; delete S.compose[key]; redraw(); } }, "Send without a line")))
      : el("div", { class: "row" },
        el("button", { class: "pill blue", type: "button", onclick: () => { if (WITH_LINE[a.type]) S.compose[key] = true; else S.done[key] = "yes"; redraw(); } }, ACT_BTN[a.type] || "Do it"),
        // A check-in can also hand off to Muse, which orders something small. Iris itself never orders or delivers.
        a.type === "treat" && S.blocks.musesend ? el("button", { class: "pill", type: "button", onclick: () => { S.done[key] = "muse"; redraw(); } }, "Have Muse send something") : null,
        el("button", { class: "pill", type: "button", onclick: () => { S.done[key] = "no"; redraw(); } }, "Not now")),
    sig(n.signature));
}
function fiveToday(day, viewer, opts) {
  const fv = (day && day.friend_view || []).filter(f => f.name !== viewer);
  fv.sort((a, b) => (a.name === OWNER ? -1 : b.name === OWNER ? 1 : 0));
  return el("div", { class: "widget flat", style: "gap:2px" },
    fv.map(f => el("div", { class: "notice" },
      el("span", { class: "row", style: "gap:10px" }, av(f.name, true), el("span", { class: f.name === OWNER ? "who" : null, text: f.name })),
      f.mood ? chip(f.name === OWNER ? (day.poke || famOf(f.mood, f.direction)) : famOf(f.mood, f.direction), f.name === OWNER ? "mood" : null) : el("span", { class: "small", text: "no word yet" }))),
    opts && opts.simLabel === false ? null : el("div", { style: "padding-top:6px" }, simLine("Friends' days are simulated in this demo. " + OWNER + "'s is the engine's real read.")));
}

/* ---------- the story ---------- */
// ch: 0 = setting up, 1 = everyday life, 2 = after. bg: slide color, "app" = Iris's white screens.
// phone: whose phone the screen is on. day: the engine record the hood shows.
const FLOW = [];
const add = (o) => FLOW.push(o);

add({ ch: 0, bg: "peach", title: "Meet Iris", phone: OWNER, render: () => [
  el("div", { style: "margin-top:auto" }, pose("wave", "pop")),
  el("div", { class: "kicker center", text: "a concept for Muse" }),
  el("h1", { class: "h1 center", style: "font-size:44px", text: "Iris" }),
  el("p", { class: "lead center", text: "Keeps you close to your 5." }),
  goBtn("Start"),
  el("p", { class: "fine", text: "Hackathon prototype, not a Meta product. Every person and message is fictional. Character made with Muse Image." })
] });

add({ ch: 0, bg: "app", title: "Sign in with Instagram", phone: OWNER, render: () => [
  el("div", { style: "margin-top:auto;display:grid;justify-items:center;gap:12px;text-align:center" },
    img(FACE, null, ""), el("div", { class: "h2", text: "Welcome to Iris" }),
    el("p", { class: "agent", style: "color:var(--ink-2);max-width:280px", text: "Iris uses your Instagram account. No new account, no new password." })),
  el("div", { class: "go" },
    el("button", { class: "btn ig", type: "button", onclick: next }, "Continue with Instagram"),
    el("div", { class: "small center", text: "In this demo you are " + OWNER + ", a fictional person. Nothing touches a real account." }))
] });
// the welcome image is a circle avatar
FLOW[1].after = s => { const i = s.querySelector("img"); if (i) i.style.cssText = "width:84px;height:84px;border-radius:50%"; };

add({ ch: 0, bg: "app", title: "What Iris reads", phone: OWNER, render: () => {
  const rows = [
    ["see", "eye", "What you see", "The reels and posts you watch, save and send."],
    ["hear", "hear", "What you hear", "What you play on Spotify."],
    ["talk", "talk", "What you talk about", "Your side of your Instagram chats: when, with whom, the gist. Never anyone else's words."],
    ["happens", "cal", "What happens to you", "Your calendar: exams, trips, shows, plans."]
  ];
  return [
    appHead("Your day, in four parts", "What Iris reads"),
    el("p", { class: "agent", text: "How your day goes shapes how you feel. Iris reads it so your 5 can know, in a few words." }),
    el("div", { class: "widget flat", style: "gap:0" }, rows.map(([k, ic, t, s]) => el("div", { class: "readrow" },
      el("span", { class: "ri" }, icon(ic)),
      el("div", { class: "spread", style: "align-items:flex-start" }, el("div", {}, el("b", { text: t }), el("span", { text: s })),
        el("button", { type: "button", class: "pill" + (S.sources[k] ? " dark" : ""), style: "font-size:12px;padding:5px 11px;flex:none", onclick: () => { S.sources[k] = !S.sources[k]; redraw(); } }, S.sources[k] ? "On" : "Off"))))),
    el("div", { class: "secure" }, icon("shield"), el("span", { text: "Read securely by Muse, inside Meta. Never shown to anyone." })),
    el("div", { class: "small", text: "Never shared with your 5: the words in your messages, other people's names, money, or where you are. Switch any part off, any time." }),
    simLine("Calendar and Spotify are simulated here."),
    goBtn("Next", { cls: "blue" })
  ];
} });

add({ ch: 0, bg: "app", title: "Pick your 5", phone: OWNER, render: () => [
  appHead("Who are your 5?", "From your Instagram Close Friends"),
  el("p", { class: "agent", text: "Pick up to five. Each gets an invite, and nobody is in until they say yes." }),
  el("div", {}, CIRCLE.map(c => el("div", { class: "li" }, av(c.first),
    el("div", {}, el("div", { class: "who", text: c.name }), el("div", { class: "small", text: "You two share " + joinNames((c.allowed_interests || []).slice(0, 2)) })),
    el("span", { class: "check on" }, icon("check"))))),
  goBtn("Next (" + CIRCLE.length + " of 5)", { cls: "blue" })
] });

add({ ch: 0, bg: "mint", title: "Meet your circle", phone: OWNER, render: () => {
  const names = CIRCLE.map(c => c.first);
  const spin = el("div", { class: "spin" });
  names.forEach((n, k) => {
    const a = (k / Math.max(names.length, 1)) * Math.PI * 2 - Math.PI / 2;
    spin.append(el("div", { class: "name pop", style: "left:" + (50 + 40 * Math.cos(a)) + "%;top:" + (50 + 40 * Math.sin(a)) + "%;animation-delay:" + (k * .12) + "s" }, el("span", { text: n })));
  });
  return [el("h1", { class: "h1 center", text: "Meet your circle." }),
    el("div", { class: "orbit" }, el("div", { class: "ring" }), el("div", { class: "core" }, img(P("celebrate"), "bob")), spin),
    el("p", { class: "lead center", text: "Everyone said yes, and " + OWNER + " is in their circles too. Now, when and how." }),
    goBtn("Set it up")];
} });

add({ ch: 0, bg: "app", title: "Your time and send mode", phone: OWNER, render: () => {
  const times = ["8 AM", "12 PM", "6 PM", "9 PM"]; if (!times.includes(S.time)) times.push(S.time);
  const opt = (k, t, s) => el("button", { type: "button", class: "opt" + (S.send === k ? " on" : ""), onclick: () => { S.send = k; redraw(); } },
    el("span", { class: "tick" }, S.send === k ? icon("check") : null), el("span", {}, el("b", { text: t }), el("span", { text: s })));
  return [
    appHead("Your note, your time"),
    el("p", { class: "agent", text: "Each day at this time, Iris writes one note to each of your 5." }),
    el("div", { class: "row" }, times.map(t => el("button", { type: "button", class: "pill" + (S.time === t ? " blue" : ""), onclick: () => { S.time = t; redraw(); } }, t))),
    opt("auto", "Send on its own", "You get 10 minutes to see it and cancel"),
    opt("ask", "Ask me first", "Each note waits until you tap Send"),
    el("div", { class: "who", style: "margin-top:6px", text: "Who hears how you are" }),
    el("div", { style: "display:grid;gap:14px" }, CIRCLE.map(c => {
      const cur = S.perm[c.first];
      return el("div", { style: "display:grid;gap:6px" }, el("div", { class: "who", text: c.first }),
        el("div", { class: "seg" }, Object.values(LEVEL).map(l => el("button", { type: "button", class: l === cur ? "on" : null, onclick: () => { S.perm[c.first] = l; redraw(); } }, l))),
        el("div", { class: "small", text: LEVEL_HELP[cur] }));
    })),
    el("div", { class: "small", text: "Nobody sees what you chose for them." }),
    goBtn("Done", { cls: "blue" })
  ];
} });

// Iris is modular: one core that always runs, and blocks you switch on or off.
const BLOCKS = [
  ["see", "eye", "Reels", "What you watch, save and send", "source"],
  ["talk", "talk", "Chats", "Your side of your chats, never anyone else's words", "source"],
  ["hear", "hear", "Music", "What you play on Spotify", "source"],
  ["happens", "cal", "Calendar", "Only if you use one. Plans in your chats count too.", "source"],
  ["talkiris", "message", "Talk to Iris", "A short chat about your day. Only you see it.", "block"],
  ["actions", "song", "Ready actions", "A song, a reel, lunch or two seats, ready for your friend", "block"],
  ["musesend", "treat", "Muse sends something", "Your friend can have Muse send something small", "block"],
  ["charm", "info", "Muse Charm", "Your note on your friend's Charm too", "block"]
];
const blockOn = k => (BLOCKS.find(b => b[0] === k) || [])[4] === "source" ? S.sources[k] : S.blocks[k];
const blocksList = () => [
  el("div", { class: "widget warm", style: "gap:4px" }, el("div", { class: "eyebrow", text: "Always on" }),
    el("b", { text: "Read your day, and a note to your 5" }),
    el("span", { class: "small", text: "A few words about how your day is going and one idea. Never why." })),
  el("div", { class: "widget flat", style: "gap:0" }, BLOCKS.map(([k, ic, t, sub, kind]) => el("div", { class: "readrow" },
    el("span", { class: "ri" }, icon(ic)),
    el("div", { class: "spread", style: "align-items:flex-start" }, el("div", {}, el("b", { text: t }), el("span", { text: sub })),
      el("button", { type: "button", class: "pill" + (blockOn(k) ? " dark" : ""), style: "font-size:12px;padding:5px 11px;flex:none", "aria-pressed": blockOn(k) ? "true" : "false",
        onclick: () => { if (kind === "source") S.sources[k] = !S.sources[k]; else S.blocks[k] = !S.blocks[k]; redraw(); } }, blockOn(k) ? "On" : "Off"))))),
  el("div", { class: "small", text: "Switch a part off and Iris reads you from the rest." })];
add({ ch: 0, bg: "app", title: "Your blocks", phone: OWNER, render: () => [
  appHead("Your Iris, your blocks", "Settings"),
  el("p", { class: "agent", text: "The core always runs. Everything else is a block you switch on or off, any time." }),
  blocksList(),
  simLine("Calendar, Spotify, Muse sending and the Charm are simulated here."),
  goBtn("Done", { cls: "blue" })
] });

add({ ch: 1, bg: "lilac", title: "Learning your normal", phone: OWNER, day: () => LEARN[0], render: () => [
  el("div", { style: "margin-top:auto" }, pose("sleep", "pop")),
  el("div", { class: "kicker", text: "The first " + (LEARN.length === 14 ? "two weeks" : LEARN.length + " days") }),
  el("h1", { class: "h1", text: "First, Iris learns your normal." }),
  el("p", { class: "lead", text: "Day by day, compared only with you. Nothing goes to anyone until Iris knows what an ordinary day looks like for you." }),
  goBtn("Skip ahead")
] });

// A big happy day
add({ ch: 1, bg: "butter", title: "A big happy day", phone: OWNER, day: () => BIG, render: () => [
  confetti(),
  el("div", { style: "margin-top:auto" }, pose("celebrate", "pop")),
  el("div", { class: "kicker", text: "A big day" }),
  el("h1", { class: "h1", text: "A big happy day." }),
  el("p", { class: "lead", text: BIG ? "Muse reads " + OWNER + "'s day as " + BIG.mood + ", and " + BIG.size + ". His 5 hear: " + hears(BIG) + " At " + S.time + ", Iris writes a note to " + (BIG.notes.length === CIRCLE.length ? "each of the 5" : joinNames(BIG.notes.map(n => n.to))) + "." : "" }),
  goBtn("See the notes")
] });

add({ ch: 1, bg: "app", title: "10 minutes to cancel", phone: OWNER, day: () => BIG, render: () => {
  const d = BIG; if (!d) return [appHead("No notes today")];
  const until = clock((d.notes[0] || {}).cancel_until) || "";
  const cd = el("b", { text: "10:00" });
  let left = 600; clearInterval(tick);
  tick = setInterval(() => { left = Math.max(0, left - 1); cd.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); if (!left) clearInterval(tick); }, 1000);
  return [
    banner("Today's notes are ready.", "They go out at " + until + " unless you cancel."),
    appHead("Good evening, " + OWNER + ".", "Today"),
    el("div", { class: "widget warm" }, el("div", { class: "eyebrow", text: "Your day. Only you see this." }),
      el("div", { class: "row" }, chip(d.mood, "mood"), el("span", { text: d.moment || "" })),
      d.poke ? el("div", { class: "small", text: "Your 5 hear: " + hears(d) }) : null),
    el("div", { class: "widget flat" }, el("div", { class: "count" }, icon("clock"), cd, el("span", { class: "small", text: "until they send" })),
      el("div", { class: "small", text: "Send on its own is on. Cancel any note and that person hears nothing today, and nobody knows." })),
    d.notes.map(n => {
      const off = S.cancel[n.to];
      return el("div", { class: "widget" + (off ? " off" : "") },
        el("div", { class: "spread" }, el("span", { class: "row", style: "gap:8px" }, av(n.to, true), el("span", { class: "who", text: "To " + n.to })),
          off ? el("button", { class: "link", type: "button", onclick: () => { delete S.cancel[n.to]; redraw(); } }, "Undo")
            : el("button", { class: "pill", type: "button", style: "padding:6px 12px;font-size:13px", onclick: () => { S.cancel[n.to] = true; redraw(); } }, "Cancel")),
        off ? el("div", { class: "small", text: "Cancelled. " + n.to + " won't hear from Iris today." }) : [el("p", { class: "quote", text: n.text }), actBox(n), n.action && n.action.surprise ? surpriseLine() : null]);
    }),
    d.not_sent.length ? el("div", { class: "small", text: "Not today. " + d.not_sent.map(whyNot).join(" ") }) : null,
    el("div", { class: "small", text: "Each note is signed: " + ((d.notes[0] || {}).signature || "Suggested by Muse.") }),
    goBtn("See " + BIG_WHO + "'s phone", { cls: "blue" })
  ];
} });

add({ ch: 1, bg: "app", title: BIG_WHO + "'s phone", phone: BIG_WHO, day: () => BIG, render: () => {
  const n = noteTo(BIG, BIG_WHO);
  return [
    banner(firstSentence(n && n.text), ""),
    chip("On " + BIG_WHO + "'s phone"),
    appHead("Your 5 today", "Good evening, " + BIG_WHO + "."),
    fiveToday(BIG, BIG_WHO),
    friendNote(n, "big"),
    el("div", { class: "small", text: "That's all " + BIG_WHO + " sees: a few words and one idea. Never why." }),
    goBtn("Another week", { cls: "blue" })
  ];
} });

// A tired stretch, then the lunch plan on a friend's phone
add({ ch: 1, bg: "sky", title: "A tired stretch", phone: OWNER, day: () => TIRED.day, render: () => {
  const run = runAround(TIRED.day), moods = [...new Set(run.map(d => d.mood))];
  const n = noteTo(TIRED.day, TIRED.who);
  return [
    el("div", { style: "margin-top:auto" }, pose("phone", "pop")),
    el("div", { class: "kicker", text: "A tired stretch" }),
    el("h1", { class: "h1", text: run.length > 1 ? cap(numWord(run.length)) + " long days in a row." : "A long day." }),
    el("p", { class: "lead", text: "Muse reads them as " + joinNames(moods) + "." + (isType(n, "lunch") ? " On one of them, Iris finds an hour when " + TIRED.who + " and " + OWNER + " are both free for lunch." : "") }),
    goBtn("See " + TIRED.who + "'s phone")
  ];
} });
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

add({ ch: 1, bg: "app", title: TIRED.who + "'s phone", phone: TIRED.who, day: () => TIRED.day, render: () => {
  const n = noteTo(TIRED.day, TIRED.who), t = n && n.action && n.action.type;
  return [
    banner(firstSentence(n && n.text), ""),
    chip("On " + TIRED.who + "'s phone"),
    appHead("A note from " + OWNER, "Good evening, " + TIRED.who + "."),
    friendNote(n, "tired"),
    t === "lunch" ? el("div", { class: "small", text: "Iris only shares the free hour, never what is on either calendar." }) : null,
    NEEDS_CONNECTOR[t] ? simLine(NEEDS_CONNECTOR[t]) : null,
    goBtn("Later, on " + OWNER + "'s phone", { cls: "blue" })
  ];
} });

// Talk to Iris: an optional chat for the person only. Iris asks one open question and lets them talk; it answers what
// they actually wrote, then turns the words into a few private notes for itself. Nothing here reaches anyone.
const FEEL = [
  [/\b(tired|wiped|exhausted|drained|sleepy|worn out|knackered|burnt)\b/, "tired"],
  [/\b(stress|stressed|overwhelm\w*|pressure|too much|swamped)\b/, "stressed"],
  [/\b(nervous|on edge|anxious|scared|worried)\b/, "nervous"],
  [/\b(sad|down|low|rough|not my best|lonely|meh|bad day)\b/, "low"],
  [/\b(proud|passed|nailed)\b/, "proud"],
  [/\b(excited|buzzing|can't wait|cant wait|looking forward)\b/, "excited"],
  [/\b(happy|great|good day|amazing|awesome|fun|really good)\b/, "happy"],
  [/\b(busy|back to back|nonstop|meetings)\b/, "busy"],
  [/\b(calm|chill|relaxed|easy|fine|okay|ok|alright)\b/, "calm"]
];
const WAY = { tired: "down", stressed: "down", nervous: "down", low: "down", sad: "down", restless: "down", proud: "up", excited: "up", happy: "up", buzzing: "up", grateful: "up", relieved: "up" };
const ENERGY = { tired: "Low", low: "Low", sad: "Low", stressed: "Running high", nervous: "Running high", restless: "Running high", happy: "High, in a good way", excited: "High, in a good way", proud: "High, in a good way", buzzing: "High, in a good way", busy: "Stretched", focused: "Stretched" };
const TOPIC = [
  [/\b(exam|pmp|test)\b/, "the exam"], [/\b(stud(y|ied|ying)|revision)\b/, "studying"], [/\b(result|results)\b/, "the results"],
  [/\b(deadline|deck|due|launch)\b/, "a deadline"], [/\b(trip|travel|flight|train|away|chicago)\b/, "the trip"],
  [/\b(show|concert|gig)\b/, "the show"], [/\b(work|meeting|meetings|boss)\b/, "work"], [/\b(song|music|on loop|on repeat)\b/, "a song on repeat"]
];
const NEED = [
  [/\b(lunch|dinner|coffee|food|eat)\b/, "Time with a friend over food"], [/\b(people|someone|friends|hang|talk to|see)\b/, "Time with people"],
  [/\b(sleep|rest|nap|bed)\b/, "Rest"], [/\b(break|walk|outside|off)\b/, "A break"], [/\b(celebrat\w*|tell|share|sharing)\b/, "Sharing it with your people"]
];
const MISSING = /\b(haven'?t (really )?(talked|seen|spoken)|miss\w*|alone|lonely|no one|nobody)\b/;
const ECHO = {
  "the exam": ["Exams take a lot out of you.", "That exam was a big one."], studying: ["Studying all day is a lot.", "All that studying paid off."],
  "the results": ["Waiting on results is hard.", "That's huge news."], "a deadline": ["Deadlines have a way of eating the whole day.", "Nice to have it done."],
  "the trip": ["Trips are fun, but they take it out of you.", "A trip sounds perfect right now."], "the show": ["A show might be just the reset.", "A show sounds like a great night."],
  work: ["Days like that are tiring.", "Good when work goes well."]
};
const FEEL_LINE = { tired: "That sounds draining.", stressed: "That's a lot at once.", nervous: "That makes sense.", low: "I'm sorry today was heavy.",
  proud: "I love that.", excited: "I love that.", happy: "I love that.", busy: "Sounds like a full one.", calm: "Sounds like a nice, steady one." };
const FOLLOW = { down: "What would make tomorrow a little easier?", up: "What was the best part?", flat: "Anything you're looking forward to?" };
const firstHit = (list, t) => { let best = null, at = 1e9; list.forEach(([re, v]) => { const m = t.match(re); if (m && m.index < at) { at = m.index; best = v; } }); return best; };
const allHits = (list, t) => list.filter(([re]) => re.test(t)).map(([, v]) => v);
// What the person might write, built from their own day. It's only a start: they can delete it and say anything.
const LEAD = { tired: "Honestly pretty wiped.", nervous: "A bit on edge, honestly.", stressed: "A lot going on, honestly.", sad: "Not my best day.", low: "Not my best day.",
  restless: "Can't really settle today.", happy: "Pretty good day, actually.", excited: "Honestly kind of buzzing.", proud: "Honestly a really good day.", buzzing: "Honestly buzzing.",
  grateful: "Feeling lucky today.", relieved: "So relieved today.", busy: "Busy one, back to back all day.", focused: "Heads down all day." };
function dayEvents(d) {
  const hap = ((d && d.inputs) || {}).happens || {};
  return [].concat((hap.today || []).map(e => [e, "today"]), (hap.tomorrow || []).map(e => [e, "tomorrow"])).filter(([e]) => e.status !== "cancelled" && e.kind !== "health");
}
function drafts(d) {
  const evs = dayEvents(d), find = k => evs.find(([e]) => e.kind === k), way = WAY[d.mood] || "flat";
  const t = (find("exam") || find("results") || find("deadline") || find("trip") || find("show") || find("study") || evs.find(([e]) => e.kind === "social" && (e.with || []).some(w => CIRCLE.some(c => c.first === w))) || [])[0];
  const when = t ? (find(t.kind) || [])[1] : null;
  const ABOUT = {
    exam: when === "tomorrow" ? "The PMP exam is tomorrow and I've been studying all day." : "Had the PMP exam today.",
    results: way === "up" ? "Got my PMP results today. I passed." : "Results came in today.",
    deadline: "The launch deck was due and it ate the whole day.",
    trip: when === "tomorrow" ? "Off on a trip tomorrow." : "Away for the weekend.",
    show: "Going to a show tonight.", study: "Studied most of the day.",
    social: t && t.with ? "Seeing " + (t.with.find(w => CIRCLE.some(c => c.first === w)) || "friends") + " later." : ""
  };
  const talk = ((d.inputs || {}).talk) || {};
  const quiet = way === "down" && talk.usual && talk.messages_you_sent < talk.usual * 0.75 ? "Haven't really talked to anyone much." : "";
  const one = [LEAD[d.mood] || "Pretty easy day.", t ? ABOUT[t.kind] : (d.moment && d.size && d.size !== "ordinary" ? "It's been " + d.moment + "." : ""), quiet].filter(Boolean).join(" ");
  const noun = t ? { exam: "the exam", results: "the results", deadline: "work", trip: "the trip", show: "anything", study: "studying", social: "anything" }[t.kind] : "any of it";
  const two = way === "down" ? "Probably lunch with someone, and not talking about " + noun + "."
    : way === "up" ? "Telling my people about it, honestly." : "Just an easy evening, honestly.";
  return [one, two];
}
function readChat(c, d) {
  const mine = c.msgs.filter(m => m.me).map(m => m.text.toLowerCase()), all = mine.join(" ");
  const feel = c.fix || firstHit(FEEL, mine[0] || "") || firstHit(FEEL, all) || d.mood || "okay";
  const topics = [...new Set(allHits(TOPIC, all))].slice(0, 2);
  CIRCLE.forEach(p => { if (new RegExp("\\b" + p.first.toLowerCase() + "\\b").test(all) && topics.length < 3) topics.push(p.first); });
  let needs = [...new Set(allHits(NEED, mine.slice(1).join(" ") || "").concat(MISSING.test(all) ? ["Time with people"] : []))];
  if (needs.includes("Time with a friend over food")) needs = needs.filter(x => x !== "Time with people");
  needs = needs.slice(0, 3).map((x, k) => k ? x.charAt(0).toLowerCase() + x.slice(1) : x);
  return { feel, way: WAY[feel] || "flat", topics, needs, missing: MISSING.test(all) };
}
function irisReply(c, d, text) {
  const t = text.toLowerCase(), mineCount = c.msgs.filter(m => m.me).length, r = readChat(c, d);
  if (mineCount === 1) {
    const feel = c.fix || firstHit(FEEL, t) || d.mood || "okay", way = WAY[feel] || "flat", topic = firstHit(TOPIC, t);
    const echo = topic && ECHO[topic] ? ECHO[topic][way === "up" ? 1 : 0] : "";
    return [FEEL_LINE[feel] || "Thanks for telling me.", echo, way === "down" && MISSING.test(t) ? "And not seeing your people much makes everything heavier." : "", FOLLOW[way]].filter(Boolean).join(" ");
  }
  if (mineCount === 2) {
    const plan = firstHit(NEED, t);
    if (r.way === "down") return (plan ? "That sounds like a good plan. " : "") + "Thanks for telling me all this. Try to get some rest tonight.";
    if (r.way === "up") return "Love that. Thanks for sharing it with me.";
    return "Sounds good. Thanks for telling me about your day.";
  }
  return "Got it. I've added that.";
}
function irisOpen(d) {
  const way = WAY[d.mood] || "flat";
  if (way === "down") return (runAround(d).length > 1 ? "Long week. " : "") + "How are you doing, really?";
  return way === "up" ? "Hey. How was today?" : "How was your day?";
}
const FIX_TO = ["tired", "stressed", "low", "calm", "happy", "proud"];
function talkChat(key, d, opts) {
  if (!d) return [];
  const c = S.chats[key] || (S.chats[key] = { msgs: [], fix: null });
  const mine = c.msgs.filter(m => m.me).length, dr = drafts(d), id = "chat-" + key;
  const send = () => {
    const box = document.getElementById(id), text = box ? box.value.trim() : "";
    if (!text) return;
    c.msgs.push({ me: true, text });
    c.msgs.push({ me: false, text: irisReply(c, d, text) });
    redraw();
    const sl = $("#slot").firstChild; if (sl) sl.scrollTop = sl.scrollHeight;
  };
  const r = mine >= 2 ? readChat(c, d) : null;
  const box = el("textarea", { id, class: "linebox", rows: "3", placeholder: mine >= 2 ? "Anything else?" : "Say anything" });
  box.value = mine < 2 ? dr[mine] : "";
  box.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  // Moments from the day, to tap into what you're writing. Optional, like everything here.
  const KIND = ["exam", "results", "deadline", "trip", "show", "study", "social", "routine", "work"];
  const moments = opts && opts.moments ? [...new Set(dayEvents(d).filter(([e]) => !/someone/i.test(e.title))
    .sort((x, y) => KIND.indexOf(x[0].kind) - KIND.indexOf(y[0].kind)).map(([e]) => e.title))].slice(0, 3) : [];
  return [
    el("div", { class: "row", style: "gap:10px" }, img(FACE, "mini"), el("div", {}, el("b", { text: "Iris" }), el("div", { class: "small", text: "Only you see this chat" }))),
    el("div", { class: "msgs" },
      el("div", { class: "bub iris", text: irisOpen(d) }),
      c.msgs.map(m => el("div", { class: "bub " + (m.me ? "me" : "iris"), text: m.text })),
      r ? el("div", { class: "widget flat page" },
        el("div", { class: "eyebrow", text: "What Iris took from this. Only you see it." }),
        kvRows([["Feeling", cap(r.feel)], ["Energy", ENERGY[r.feel] || "Steady"], ["On your mind", r.topics.length ? cap(joinNames(r.topics)) : "Nothing in particular"], r.needs.length ? ["Would help", joinNames(r.needs)] : null]),
        el("div", { class: "small", text: "Your words stay in this chat. Iris keeps only these few notes, to read you better tomorrow." }),
        el("div", { class: "small", text: hears(d) ? "Your 5 still only hear: " + hears(d) : "Nothing goes to your 5 yet." }),
        el("div", { class: "small", style: "margin-top:4px", text: "Not quite right? Pick the word." }),
        el("div", { class: "qr" }, FIX_TO.map(w => el("button", { type: "button", class: r.feel === w ? "on" : null, onclick: () => { c.fix = w; redraw(); } }, cap(w))))) : null),
    moments.length ? el("div", { class: "moments" }, el("span", { class: "small", text: "From your day. Tap to bring one in." }),
      el("div", { class: "qr" }, moments.map(m => el("button", { type: "button", onclick: () => { box.value = (box.value.trim() ? box.value.trim() + " " : "") + m + ": "; box.focus(); } }, m)))) : null,
    el("div", { class: "compose" }, mine < 2 ? el("label", { class: "small", for: id, text: mine ? "Iris wrote a start from your day. Change it or say anything." : "A start from your day. Change it, or say anything." }) : null, box,
      el("div", { class: "row", style: "justify-content:space-between" },
        el("button", { class: "pill blue", type: "button", onclick: send }, "Send"),
        c.msgs.length ? el("button", { class: "link", type: "button", onclick: () => { delete S.chats[key]; redraw(); } }, "Start over") : el("span", { class: "small", text: "Optional. Skip it any day." })))
  ];
}
const kvRows = rows => el("div", { style: "display:grid;gap:3px" }, rows.filter(Boolean).map(([k, v]) => el("div", {}, el("b", { text: k + ": " }), v)));
add({ ch: 1, bg: "app", title: "Talk to Iris", phone: OWNER, day: () => TIRED.day, render: () => {
  const d = TIRED.day; if (!d) return [appHead("Talk to Iris")];
  if (!S.blocks.talkiris) return [appHead("Talk to Iris", "Off"), el("p", { class: "agent", text: "Talk to Iris is switched off in your blocks. Iris still reads your day and writes your notes." }), goBtn("Next", { cls: "blue" })];
  return [talkChat("story", d), goBtn("Another day", { cls: "blue" })];
} });

// A low day, then the check-in on Maya's phone and her Charm
add({ ch: 1, bg: "lilac", title: "A low day", phone: OWNER, day: () => LOW.day, render: () => {
  const d = LOW.day, low = d && (d.mood === "low" || d.mood === "sad");
  return [
    el("div", { style: "margin-top:auto" }, pose("heart", "pop")),
    el("div", { class: "kicker", text: "A harder day" }),
    el("h1", { class: "h1", text: low ? "A low day." : "Then a heavier day." }),
    el("p", { class: "lead", text: d ? "Muse reads it as " + d.mood + ". " + LOW.who + " only hears: " + hears(d) + " And one idea. Never why." : "" }),
    goBtn("Next")
  ];
} });

// On a hard day Iris also talks to the person: no rescue, just less overthinking between the thought and the action.
add({ ch: 1, bg: "app", title: "For " + OWNER, phone: OWNER, day: () => LOW.day, render: () => {
  const d = LOW.day, crisis = d && (d.cards || []).some(c => /crisis/.test(c.kind));
  if (crisis) return [appHead("For you"), el("div", { class: "widget warm", text: (d.cards[0] || {}).text || "" }), goBtn("Next", { cls: "blue" })];
  const picked = CIRCLE.find(c => S.reached[c.first]);
  return [
    banner("A note for you.", "Only you see this."),
    appHead("Hey, " + OWNER + ".", "Only you see this"),
    el("div", { class: "widget peach", style: "gap:10px" },
      el("div", { class: "row" }, img(FACE, "mini"), el("b", { text: "Iris" })),
      el("p", { class: "quote", text: "It's okay. They're your people. If you want, you can reach out." })),
    picked ? el("div", { class: "ok", text: "Chat with " + picked.first + " opened. Say as much or as little as you like." })
      : el("div", { style: "display:grid;gap:8px" }, CIRCLE.slice(0, 5).map(c => el("button", { class: "li", type: "button", onclick: () => { S.reached[c.first] = true; redraw(); } },
        av(c.first), el("div", { class: "who", text: "Message " + c.first }), icon("message")))),
    el("div", { class: "small", text: "No pressure. Your notes to your 5 go out either way, and they never say why." }),
    simLine("Opening the chat is simulated here. On a crisis day, Iris shows a help line instead and nothing goes out."),
    goBtn("See " + LOW.who + "'s phone", { cls: "blue" })
  ];
} });

add({ ch: 1, bg: "app", title: LOW.who + "'s phone and Charm", phone: LOW.who, day: () => LOW.day, render: () => {
  const n = noteTo(LOW.day, LOW.who), t = n && n.action && n.action.type;
  return [
    banner(firstSentence(n && n.text), ""),
    chip("On " + LOW.who + "'s phone"),
    friendNote(n, "low"),
    t === "treat" ? simLine("Concept: Muse ordering a treat is simulated here. Muse fills in the address, so " + LOW.who + " never sees it.") : null,
    NEEDS_CONNECTOR[t] ? simLine(NEEDS_CONNECTOR[t]) : null,
    S.blocks.charm ? [el("div", { class: "who", style: "margin-top:4px", text: "The same note on " + LOW.who + "'s Muse Charm" }),
      el("div", { class: "charm" }, el("div", { class: "cbody" }), el("span", { class: "cam" }), el("div", { class: "cord", html: CORD }),
        el("div", { class: "scr" }, img(FACE), el("div", { text: n ? n.text : "" }))),
      simLine("Concept: delivery to a Muse Charm is simulated.")] : null,
    goBtn("Next", { cls: "blue" })
  ];
} });

add({ ch: 1, bg: "app", title: "Sam's home", phone: "Sam", day: () => HOME, render: () => {
  const n = noteTo(HOME, "Sam");
  return [
    chip("On Sam's phone"),
    appHead("Your 5 today", "Good evening, Sam."),
    fiveToday(HOME, "Sam"),
    n ? el("div", { class: "widget" }, el("div", { class: "eyebrow", text: "Today from " + OWNER }), el("p", { class: "quote", text: n.text }), actBox(n), sig(n.signature)) : null,
    el("div", { class: "small", text: "Ordinary days count too. Iris is for any mood, every day." }),
    el("div", { class: "tabbar still" },
      el("span", { class: "on" }, icon("home"), "Today"),
      el("span", {}, icon("people"), "Your 5"),
      el("span", {}, icon("user"), "You")),
    goBtn("Next", { cls: "blue" })
  ];
} });

// The note grows with you: the family of a feeling first, the exact word only once Iris has earned it.
const SPEC = LIVE.find(d => d.poke_level === "specific" && d.notes.length) || null;
const EARLY = LIVE.find(d => d.poke_level === "family" && d.notes.length && (!SPEC || d.direction === SPEC.direction)) || LIVE.find(d => d.notes.length) || null;
const sameFriend = SPEC && EARLY ? (SPEC.notes.find(n => noteTo(EARLY, n.to)) || SPEC.notes[0]).to : null;
add({ ch: 2, bg: "sky", title: "It learns you", phone: OWNER, day: () => SPEC || EARLY, render: () => {
  const e = EARLY && noteTo(EARLY, sameFriend || (EARLY.notes[0] || {}).to), l = SPEC && noteTo(SPEC, sameFriend);
  return [
    el("div", { class: "kicker", text: "Over time" }),
    el("h1", { class: "h1", text: "The note grows with you." }),
    el("p", { class: "lead", text: "At first Iris only says the family a feeling belongs to. Once it knows your normal, and two kinds of signs agree, it can say a little more. Never why." }),
    e ? el("div", { class: "widget", style: "gap:6px" }, el("div", { class: "eyebrow", text: "In the first weeks" }), el("p", { class: "quote", text: e.text })) : null,
    l ? el("div", { class: "widget", style: "gap:6px" }, el("div", { class: "eyebrow", text: "A month in, when the signs agree" }), el("p", { class: "quote", text: l.text }))
      : el("div", { class: "small", text: "In this month, the exact word didn't show yet." }),
    goBtn("Next")
  ];
} });

add({ ch: 2, bg: "peach", title: "How did that feel?", phone: OWNER, day: () => BIG, render: () => [
  el("div", { style: "margin-top:auto" }, pose("think", "pop")),
  el("h1", { class: "h1", text: "How did that feel?" }),
  el("div", { class: "widget peach", style: "background:#ffffffd9" },
    el("div", { class: "row" }, img(FACE, "mini"), el("div", { class: "eyebrow", text: "Inside Iris. Only " + OWNER + " sees this." })),
    el("div", { text: BIG_WHO + " reached out after your big day. How did that feel?" }),
    S.felt ? el("div", { class: "ok", text: "Noted: " + S.felt + ". Iris uses this to get better for you. " + BIG_WHO + " never sees it." })
      : el("div", { class: "row" }, ["Loved it", "It was nice", "A bit much"].map(o => el("button", { class: "pill", type: "button", style: "background:#fff", onclick: () => { S.felt = o; redraw(); } }, o)))),
  goBtn("Next")
] });

add({ ch: 2, bg: "mint", title: "That's Iris", phone: OWNER, render: () => [
  confetti(),
  el("div", { style: "margin-top:auto" }, pose("celebrate", "pop")),
  el("h1", { class: "h1 center", text: "That's Iris." }),
  el("p", { class: "lead center", text: "Any mood, every day. A few words and one idea for each of your 5, and you stay in charge." }),
  el("div", { class: "go" },
    el("button", { class: "btn primary", type: "button", onclick: next }, "Use the app yourself"),
    el("button", { class: "btn", type: "button", onclick: () => openHood("built") }, "What I built"),
    el("button", { class: "link", type: "button", onclick: () => go(0, -1) }, "Start over")),
  el("p", { class: "fine", text: "Hackathon prototype, not a Meta product. Every person and message is fictional. Character made with Muse Image." })
] });

// Free play: Arjun's Iris app, open to use. Four tabs, and every control does something. Arjun's own reads and
// notes are the engine's real output for the chosen day; his friends' notes, replies and bookings are simulated.
const FAM_WAY = { "a good day": "up", "a great day": "up", "an easy day": "flat", "a full day": "flat", "a lot on": "down", "a bit low": "down" };
function famOf(mood, dir) { // the kind of day, as engine/decide.py family() says it
  if (!mood) return "";
  const way = dir || WAY[mood] || "flat";
  if (way === "down") return /^(stressed|nervous|restless)$/.test(mood) ? "a lot on" : "a bit low";
  if (way === "up") return "a good day";
  return /^(busy|focused)$/.test(mood) ? "a full day" : "an easy day";
}
const bare = i => String(i || "").replace(/^the /, "");
const IN_LINE = {
  song: { up: () => "How about a song to celebrate?", down: () => "Maybe send a quiet song tonight?", flat: () => "How about a song for the evening?" },
  reel: { up: i => "A funny " + bare(i) + " clip would add to the fun.", down: i => "A light " + bare(i) + " clip could keep tonight easy.", flat: i => "A silly " + bare(i) + " clip would fit right in." },
  message: { up: () => "A quick hello to celebrate might be nice.", down: () => "A quick hello might be nice tonight.", flat: i => "How about some " + bare(i) + " talk this week?" },
  lunch: { up: () => "How about lunch this week to celebrate?", down: i => "How about lunch this week to talk " + bare(i) + "?", flat: i => "How about lunch this week to talk " + bare(i) + "?" }
};
const IN_TYPES = ["song", "reel", "message", "lunch"];
// Notes Arjun gets from his friends' Iris. Simulated from their simulated moods, two a day.
function incoming(d) {
  const fv = (d.friend_view || []).filter(f => f.name !== OWNER && f.mood);
  return fv.filter((f, k) => (d.n + k) % 2 === 0).slice(0, 2).map((f, k) => {
    const c = CIRCLE.find(x => x.first === f.name) || { allowed_interests: [] }, ints = c.allowed_interests.length ? c.allowed_interests : ["music"];
    const fam = famOf(f.mood, f.direction), type = IN_TYPES[(d.n * 3 + k + f.name.length) % 4], interest = ints[(d.n + k) % ints.length];
    return { from: f.name, fam, type, interest, key: "in:" + d.n + ":" + f.name, text: f.name + OPENERS[fam] + " " + IN_LINE[type][FAM_WAY[fam]](interest) };
  });
}
const REELS = {
  "F1": ["Best overtakes of the season", "A pit stop in under two seconds", "Funniest team radio moments"],
  "the NBA": ["Buzzer beaters of the week", "Top ten assists", "Best courtside reactions"],
  "film photography": ["Developing film at home", "35mm street shots in the rain", "One roll, one city"],
  "live music": ["A whole crowd sings the chorus", "A tiny living room set", "Soundcheck surprises"],
  "stand-up comedy": ["The best crowd work this week", "A perfect three-minute set", "A bit that brought the house down"]
};
const FREE_HOURS = ["Thursday, 12 to 1 PM", "Saturday, 1 to 2 PM", "Friday, 12:30 to 1:30 PM", "Sunday, 12 to 1 PM", "Wednesday, 1 to 2 PM"];
const freeHour = who => FREE_HOURS[Math.max(0, CIRCLE.findIndex(c => c.first === who)) % FREE_HOURS.length];
const tracksFor = d => {
  const t = (((d && d.inputs) || {}).hear || {}).top_tracks || [];
  return (t.length ? t : [{ track: "Window Seat", artist: "Mabel Ortiz" }, { track: "Highway Skyline", artist: "June Harbor" }, { track: "Pit Lane Summer", artist: "Neon Paddock" }]).slice(0, 3).map(x => x.track + " by " + x.artist);
};
const REPLY = { reach: ["Hey, good to hear from you. Lunch this week?", "Sounds good. Talk soon."],
  up: ["Ha, thank you. It's been a good one.", "Talk soon?"], down: ["That's sweet, thanks. Needed that.", "Talk soon."], flat: ["Ha, love it. Talk soon?", "Deal."],
  any: ["Ha, love it.", "Yes. When are you free?", "This made my day."] };
const freshFP = () => ({ di: (LIVE.length ? DAYS.indexOf(LIVE[LIVE.length - 1]) : DAYS.length - 1), tab: "today", person: null, sheet: null, toast: "", draft: "",
  sendAt: {}, sent: {}, cancel: {}, acted: {}, chats: {}, log: [], fixed: {}, fixOpen: {}, deleted: {}, delAsk: {}, paused: {} });
S.fp = freshFP();
// The demo's own settings, so Reset puts everything back.
const START = JSON.stringify({ time: S.time, send: S.send, blocks: S.blocks, sources: S.sources, perm: S.perm });
const greet = () => /AM/.test(S.time) ? "Good morning" : /^12/.test(S.time) ? "Good afternoon" : "Good evening";
function toast(t) { S.fp.toast = t; overlay(); setTimeout(() => { if (S.fp.toast === t) { S.fp.toast = ""; overlay(); } }, 1900); }
function logIt(who, text, line) { S.fp.log.unshift({ who, day: S.fp.di, text, line: line || "" }); }
const sourcesOn = () => Object.keys(S.sources).filter(k => S.sources[k]).length;

/* the sheets: send a song or a reel, message a friend, book the free hour */
function openSheet(o) { S.fp.sheet = o; S.fp.draft = ""; S.fp.pick = null; overlay(); }
function closeSheet() { S.fp.sheet = null; redraw(); }
function finishAct(o, done, toastText, logText) {
  if (o.key) S.fp.acted[o.key] = done;
  logIt(o.to, logText, S.fp.draft.trim());
  S.fp.sheet = null; redraw(); toast(toastText);
}
function sheetBody(o) {
  const d = DAYS[S.fp.di];
  const lineBox = () => {
    const t = el("textarea", { class: "linebox", rows: "2", placeholder: "Add a line, if you want", "aria-label": "Add a line" });
    t.value = S.fp.draft; t.addEventListener("input", () => { S.fp.draft = t.value; }); return t;
  };
  const picker = list => el("div", { class: "picks" }, list.map(x => el("button", { type: "button", class: "pick" + (S.fp.pick === x ? " on" : ""), onclick: () => { S.fp.pick = x; overlay(); } },
    el("span", { class: "tick" }, S.fp.pick === x ? icon("check") : null), el("span", { text: x }))));
  if (o.kind === "song") return [el("div", { class: "h3", text: "Send " + o.to + " a song" }), el("div", { class: "small", text: "From what you've been playing." }), picker(tracksFor(d)), lineBox(),
    el("button", { class: "btn blue", type: "button", disabled: S.fp.pick ? null : true, onclick: () => finishAct(o, "Song sent: " + S.fp.pick + ".", "Song sent to " + o.to + ".", "You sent a song: " + S.fp.pick) }, "Send"),
    simLine("Spotify is simulated here.")];
  if (o.kind === "reel") { const list = REELS[o.interest] || REELS["F1"];
    return [el("div", { class: "h3", text: "Send " + o.to + " a reel" }), el("div", { class: "small", text: "Fresh " + bare(o.interest || "F1") + " reels. Pick one." }), picker(list), lineBox(),
      el("button", { class: "btn blue", type: "button", disabled: S.fp.pick ? null : true, onclick: () => finishAct(o, "Reel sent: " + S.fp.pick + ".", "Reel sent to " + o.to + ".", "You sent a reel: " + S.fp.pick) }, "Send"),
      simLine("Reels are simulated here.")]; }
  if (o.kind === "lunch") return [el("div", { class: "h3", text: "Lunch with " + o.to }),
    el("div", { class: "act" }, icon("lunch"), el("div", {}, el("b", { text: freeHour(o.to) }), el("span", { text: "You're both free then." }))),
    el("div", { class: "small", text: "Iris only shares the free hour, never what is on either calendar." }),
    el("button", { class: "btn blue", type: "button", onclick: () => finishAct(o, "Lunch booked for " + freeHour(o.to) + ".", "Lunch booked. Invite sent to " + o.to + ".", "You booked lunch: " + freeHour(o.to)) }, "Book the table"),
    simLine("Calendars and the booking are simulated here.")];
  // a chat with one friend
  const thread = S.fp.chats[o.to] || (S.fp.chats[o.to] = []);
  const send = () => {
    const text = S.fp.draft.trim(); if (!text) return;
    thread.push({ me: true, text }); S.fp.draft = "";
    if (o.key && !S.fp.acted[o.key]) S.fp.acted[o.key] = "Message sent.";
    if (thread.filter(m => m.me).length === 1) logIt(o.to, "You sent a message");
    overlay();
    o.n = (o.n || 0) + 1;   // replies follow this conversation, not the whole thread
    const mineN = o.n, set = REPLY[o.mood || "any"] || REPLY.any;
    setTimeout(() => { thread.push({ me: false, text: (mineN <= set.length ? set[mineN - 1] : REPLY.any[mineN % REPLY.any.length]) }); if (S.fp.sheet && S.fp.sheet.to === o.to) overlay(); else redraw(); }, 1100);
  };
  const box = el("textarea", { class: "linebox", rows: "2", placeholder: "Message " + o.to, "aria-label": "Message " + o.to });
  box.value = S.fp.draft; box.addEventListener("input", () => { S.fp.draft = box.value; });
  box.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  return [el("div", { class: "row", style: "gap:10px" }, av(o.to), el("div", {}, el("div", { class: "h3", text: o.to }), el("div", { class: "small", text: "Your chat" }))),
    el("div", { class: "msgs", style: "min-height:120px" }, thread.length ? thread.map(m => el("div", { class: "bub " + (m.me ? "me" : "iris"), text: m.text }))
      : el("div", { class: "small", style: "align-self:center;padding:24px 0", text: "Say as much or as little as you like." })),
    box, el("button", { class: "btn blue", type: "button", onclick: send }, "Send"),
    simLine("The chat and " + o.to + "'s replies are simulated here.")];
}
function overlay() {
  const g = $("#glass"); if (!g) return;
  g.querySelectorAll(".sheetwrap,.toast").forEach(x => x.remove());
  if (!FLOW[S.i] || !FLOW[S.i].free) return;
  if (S.fp.sheet) {
    const prev = document.querySelector(".sheet"), keep = prev ? prev.scrollTop : 0;
    const sh = el("div", { class: "sheet", role: "dialog", "aria-modal": "true" },
      el("button", { class: "x", type: "button", "aria-label": "Close", onclick: closeSheet }, icon("x")), sheetBody(S.fp.sheet));
    const wrap = el("div", { class: "sheetwrap", onclick: e => { if (e.target === wrap) closeSheet(); } }, sh);
    g.append(wrap); sh.scrollTop = keep || (S.fp.sheet.kind === "chat" ? sh.scrollHeight : 0);
  }
  if (S.fp.toast) g.append(el("div", { class: "toast", role: "status", text: S.fp.toast }));
}

/* the four tabs */
function sandboxBar(d) {
  const step = k => { S.fp.di = Math.max(0, Math.min(DAYS.length - 1, S.fp.di + k)); S.fp.person = null; redraw(); };
  return el("div", { class: "sandbox" },
    el("span", { class: "sbx", text: "Sandbox" }),
    el("button", { type: "button", class: "sbreset", onclick: () => { Object.keys(S.chats).filter(k => /^fp-/.test(k)).forEach(k => delete S.chats[k]); S.fp = freshFP(); Object.assign(S, JSON.parse(START)); redraw(); toast("Sandbox reset."); } }, "Reset"),
    el("span", { class: "sbday" },
      el("button", { type: "button", "aria-label": "Day before", disabled: S.fp.di === 0 ? true : null, onclick: () => step(-1) }, "‹"),
      el("span", { text: "Day " + d.n + ", " + dateLabel(d) }),
      el("button", { type: "button", "aria-label": "Next day", disabled: S.fp.di === DAYS.length - 1 ? true : null, onclick: () => step(1) }, "›")));
}
const TABS = [["today", "home", "Today"], ["circle", "people", "My Circle"], ["journal", "message", "Journal"], ["you", "user", "You"]];
const tabBar = () => el("div", { class: "tabbar", style: "grid-template-columns:repeat(4,1fr)" },
  TABS.map(([k, ic, t]) => el("button", { type: "button", class: S.fp.tab === k ? "on" : null, "aria-current": S.fp.tab === k ? "page" : null,
    onclick: () => { S.fp.tab = k; S.fp.person = null; redraw(); const sl = $("#slot").firstChild; if (sl) sl.scrollTop = 0; } }, icon(ic), t)));
const sec = t => el("div", { class: "seclabel", text: t });
const famChip = (fam, own) => fam ? chip(fam, own ? "mood" : null) : el("span", { class: "small", text: "no word yet" });

function noteState(d, n) {
  const k = d.n + ":" + n.to;
  if (S.perm[n.to] === "Never") return "never";
  if (S.fp.cancel[k]) return "cancelled";
  if (S.fp.sent[k]) return "sent";
  if (S.send === "auto" && S.fp.sendAt[d.n] && Date.now() >= S.fp.sendAt[d.n]) return "sent";
  return "waiting";
}
function freeToday(d) {
  const out = [appHead(greet() + ", " + OWNER + ".", "Today")];
  const inc = incoming(d);
  if (d.learning) out.push(el("div", { class: "widget warm", style: "gap:4px" }, el("div", { class: "eyebrow", text: "Learning your normal" }),
    el("b", { text: "Day " + d.n + " of " + LEARN.length + "." }), el("span", { class: "small", text: "Iris compares each day only with you. Nothing goes to anyone until it knows what an ordinary day looks like." })));
  else if (S.fp.paused[d.n] || S.fp.deleted[d.n] || !sourcesOn()) {
    out.push(el("div", { class: "widget warm", style: "gap:6px" }, el("div", { class: "eyebrow", text: "Your day" }),
      el("span", { text: S.fp.deleted[d.n] ? "Today's read is deleted. Nothing goes out today." : S.fp.paused[d.n] ? "Iris is paused today. Nothing goes out." : "Every part of your day is switched off, so Iris can't read it. Nothing goes out." }),
      el("button", { class: "link", type: "button", style: "align-self:flex-start;justify-self:start", onclick: () => { S.fp.tab = "you"; redraw(); } }, "Change this in You")));
  } else {
    const fixed = S.fp.fixed[d.n];
    out.push(el("div", { class: "widget warm", style: "gap:6px" }, el("div", { class: "eyebrow", text: "Your day. Only you see this." }),
      el("div", { class: "row" }, chip(d.mood, "mood"), el("span", { text: d.moment || "" })),
      el("div", { class: "small", text: "Your 5 hear: " + hears(d) }),
      sourcesOn() < 4 ? el("div", { class: "small", text: "Reading from " + numWord(sourcesOn()) + " of the four parts of your day." }) : null,
      fixed ? el("div", { class: "ok", text: "Thanks. You said " + fixed + ". Iris learns from this for tomorrow. If a note below feels off, cancel it." })
        : S.fp.fixOpen[d.n] ? el("div", { class: "qr" }, ["tired", "stressed", "low", "okay", "happy", "proud"].map(w => el("button", { type: "button", onclick: () => { S.fp.fixed[d.n] = w; redraw(); } }, cap(w))))
        : el("button", { class: "link", type: "button", style: "align-self:flex-start;justify-self:start", onclick: () => { S.fp.fixOpen[d.n] = true; redraw(); } }, "Not quite right?")));
    if (d.direction === "down") {
      const reached = CIRCLE.filter(c => (S.fp.chats[c.first] || []).some(m => m.me));
      out.push(el("div", { class: "widget peach", style: "gap:8px" }, el("div", { class: "row" }, img(FACE, "mini"), el("b", { text: "Iris" })),
        el("p", { class: "quote", text: "It's okay. They're your people. If you want, you can reach out." }),
        el("div", { class: "row" }, CIRCLE.map(c => el("button", { class: "pill", type: "button", onclick: () => openSheet({ kind: "chat", to: c.first, mood: "reach" }) }, c.first))),
        reached.length ? el("div", { class: "small", text: "You reached out to " + joinNames(reached.map(c => c.first)) + "." }) : el("div", { class: "small", text: "No pressure. Your notes go out either way." })));
    }
    // the notes going out
    if (d.notes.length) {
      if (S.send === "auto" && !S.fp.sendAt[d.n]) S.fp.sendAt[d.n] = Date.now() + 600000;
      const waiting = d.notes.filter(n => noteState(d, n) === "waiting");
      const cd = el("b");
      const paint = () => { const left = Math.max(0, Math.round(((S.fp.sendAt[d.n] || 0) - Date.now()) / 1000)); cd.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); return left; };
      out.push(sec("Going to your 5"));
      if (S.send === "auto" && waiting.length) {
        paint(); clearInterval(tick); tick = setInterval(() => { if (!paint()) { clearInterval(tick); redraw(); } }, 1000);
        out.push(el("div", { class: "widget flat" }, el("div", { class: "count" }, icon("clock"), cd, el("span", { class: "small", text: "until they send" })),
          el("div", { class: "small", text: "Cancel any note and that person hears nothing today. Nobody knows." })));
      } else if (S.send === "ask" && waiting.length) out.push(el("div", { class: "small", text: "Ask me first is on. Each note waits for you." }));
      d.notes.forEach(n => {
        const k = d.n + ":" + n.to, st = noteState(d, n);
        if (st === "never") return;
        const pill = st === "sent" ? chip("Sent") : st === "cancelled" ? chip("Cancelled") : null;
        out.push(el("div", { class: "widget" + (st === "cancelled" ? " off" : "") },
          el("div", { class: "spread" }, el("span", { class: "row", style: "gap:8px" }, av(n.to, true), el("span", { class: "who", text: "To " + n.to })), pill),
          st === "cancelled" ? el("div", { class: "small", text: n.to + " won't hear from Iris today." }) : [el("p", { class: "quote", text: n.text }), S.blocks.actions ? actBox(n) : null],
          st === "sent" ? el("div", { class: "small", text: n.to + " has it now." + (S.blocks.charm ? " It's on " + n.to + "'s Muse Charm too." : "") })
            : st === "cancelled" ? el("button", { class: "link", type: "button", style: "align-self:flex-start;justify-self:start", onclick: () => { delete S.fp.cancel[k]; redraw(); } }, "Undo")
            : el("div", { class: "row" },
              el("button", { class: "pill blue", type: "button", onclick: () => { S.fp.sent[k] = true; redraw(); toast("Sent to " + n.to + "."); } }, S.send === "ask" ? "Send" : "Send now"),
              el("button", { class: "pill", type: "button", onclick: () => { S.fp.cancel[k] = true; redraw(); } }, S.send === "ask" ? "Skip" : "Cancel"))));
      });
      out.push(el("div", { class: "small", text: "Each note is signed: " + ((d.notes[0] || {}).signature || "Suggested by Muse.") }));
    }
    const skipped = (d.not_sent || []).filter(x => S.perm[x.name] !== "Never").map(whyNot)
      .concat(d.notes.filter(n => S.perm[n.to] === "Never").map(n => n.to + ": you chose Never."));
    if (!d.notes.length) out.push(sec("Going to your 5"), el("div", { class: "widget flat", text: "No notes today." }));
    if (skipped.length) out.push(el("div", { class: "small", text: "Not today. " + skipped.join(" ") }));
  }
  // notes from the 5
  out.push(sec("From your 5"));
  if (!inc.length) out.push(el("div", { class: "widget flat", text: "Nothing from your 5 today." }));
  inc.forEach(x => {
    const done = S.fp.acted[x.key], skip = S.fp.acted[x.key + ":no"];
    const o = { to: x.from, key: x.key, interest: x.interest, mood: FAM_WAY[x.fam] };
    const ACT = { song: ["Pick a song", () => openSheet(Object.assign({ kind: "song" }, o))], reel: ["Pick a reel", () => openSheet(Object.assign({ kind: "reel" }, o))],
      message: ["Message " + x.from, () => openSheet(Object.assign({ kind: "chat" }, o))], lunch: ["See the free hour", () => openSheet(Object.assign({ kind: "lunch" }, o))] };
    out.push(el("div", { class: "widget" },
      el("div", { class: "spread" }, el("span", { class: "row", style: "gap:8px" }, av(x.from, true), el("span", { class: "who", text: "From " + x.from })), famChip(x.fam)),
      el("p", { class: "quote", text: x.text }),
      done ? el("div", { class: "ok", text: done }) : skip ? el("div", { class: "small", text: "Okay. " + x.from + " won't know." })
        : el("div", { class: "row" }, el("button", { class: "pill blue", type: "button", onclick: ACT[x.type][1] }, ACT[x.type][0]),
          el("button", { class: "pill", type: "button", onclick: () => { S.fp.acted[x.key + ":no"] = true; redraw(); } }, "Not now")),
      sig("Suggested by Muse. " + x.from + " didn't ask.")));
  });
  out.push(simLine("Notes from your 5 are simulated. Your own read and notes are the engine's real output for this day."));
  return out;
}
function freeCircle(d) {
  const fvOf = name => (d.friend_view || []).find(f => f.name === name) || {};
  if (S.fp.person) {
    const c = CIRCLE.find(x => x.first === S.fp.person), f = fvOf(c.first), fam = famOf(f.mood, f.direction);
    const o = t => Object.assign({ kind: t, to: c.first, interest: (c.allowed_interests || [])[0], mood: FAM_WAY[fam] || "any" });
    const past = [];
    for (let k = S.fp.di; k >= 0 && past.length < 4; k--) { const n = noteTo(DAYS[k], c.first); if (n) past.push([DAYS[k], n]); }
    const mine = S.fp.log.filter(l => l.who === c.first);
    return [el("button", { class: "link", type: "button", style: "align-self:flex-start;justify-self:start", onclick: () => { S.fp.person = null; redraw(); } }, "‹ My Circle"),
      el("div", { class: "phead" }, av(c.first), el("div", {}, el("div", { class: "h2", text: c.first }), el("div", { class: "small", text: cap(c.relation || "") }))),
      el("div", { class: "widget flat", style: "gap:4px" }, el("div", { class: "eyebrow", text: "Today" }), el("span", { text: fam ? c.first + OPENERS[fam] : "No word yet today." }),
        el("span", { class: "small", text: "You two share " + joinNames(c.allowed_interests || []) + "." })),
      el("div", { class: "acts" }, [["message", "Message"], ["song", "Song"], ["reel", "Reel"], ["lunch", "Lunch"]].map(([t, lab]) =>
        el("button", { type: "button", onclick: () => openSheet(o(t === "message" ? "chat" : t)) }, icon(t), lab))),
      sec("How often " + c.first + " hears about you"),
      el("div", { class: "seg" }, Object.values(LEVEL).map(l => el("button", { type: "button", class: S.perm[c.first] === l ? "on" : null, onclick: () => { S.perm[c.first] = l; redraw(); toast(l === "Never" ? c.first + " won't get notes about you." : c.first + " hears about you: " + l.toLowerCase() + "."); } }, l))),
      el("div", { class: "small", text: LEVEL_HELP[S.perm[c.first]] + ". " + c.first + " never sees what you chose." }),
      sec("Between you two"),
      mine.map(l => el("div", { class: "hist" }, el("span", { class: "small", text: dateLabel(DAYS[l.day]) }), el("div", { text: l.text + "." }), l.line ? el("div", { class: "small", text: "Your line: " + l.line }) : null)),
      past.map(([day, n]) => el("div", { class: "hist" }, el("span", { class: "small", text: dateLabel(day) + ". Iris to " + c.first }), el("div", { text: n.text }))),
      !mine.length && !past.length ? el("div", { class: "small", text: "Nothing yet." }) : null];
  }
  return [appHead("My Circle", "Your 5"),
    el("div", { style: "display:grid;gap:8px" }, CIRCLE.map(c => { const f = fvOf(c.first);
      return el("button", { class: "li", type: "button", onclick: () => { S.fp.person = c.first; redraw(); const sl = $("#slot").firstChild; if (sl) sl.scrollTop = 0; } },
        av(c.first), el("div", { style: "text-align:left" }, el("div", { class: "who", text: c.first }), el("div", { class: "small", text: "You share " + joinNames((c.allowed_interests || []).slice(0, 2)) })),
        famChip(famOf(f.mood, f.direction))); })),
    el("div", { class: "small", text: CIRCLE.length + " of 5. Each word comes from that person's own Iris, and only says the kind of day." }),
    simLine("Your friends' days are simulated in this demo.")];
}
function freeJournal(d) {
  if (!S.blocks.talkiris) return [appHead("Journal", "Off"), el("p", { class: "agent", text: "Talk to Iris is switched off in your blocks. Iris still reads your day and writes your notes." }),
    el("button", { class: "pill blue", type: "button", style: "align-self:flex-start;justify-self:start", onclick: () => { S.blocks.talkiris = true; redraw(); } }, "Switch it on")];
  const pages = Object.keys(S.chats).filter(k => /^fp-\d+$/.test(k) && k !== "fp-" + d.n && S.chats[k].msgs.filter(m => m.me).length)
    .map(k => DAYS.find(x => x.n === +k.slice(3))).filter(Boolean).sort((a, b) => b.n - a.n);
  return [appHead("Journal", "Only you see this"), talkChat("fp-" + d.n, d, { moments: true }),
    pages.length ? [sec("Earlier pages"), pages.map(p => el("button", { class: "li", type: "button", onclick: () => { S.fp.di = DAYS.indexOf(p); redraw(); } },
      icon("message"), el("div", { style: "text-align:left" }, el("div", { class: "who", text: dateLabel(p) }), el("div", { class: "small", text: cap(readChat(S.chats["fp-" + p.n], p).feel) })), el("span", { class: "small", text: "Open" })))] : null];
}
function freeYou(d) {
  const step = d.learning ? 0 : d.poke_level === "specific" ? 2 : 1;
  return [
    el("div", { class: "phead" }, av(OWNER), el("div", {}, el("div", { class: "h2", text: OWNER }), el("div", { class: "small", text: "Signed in with Instagram" }))),
    sec("How well Iris knows you"),
    el("div", { class: "meter" }, ["Learning your normal", "Says the kind of day", "Can say the exact word"].map((t, k) =>
      el("div", { class: k < step ? "done" : k === step ? "on" : null }, el("i"), el("span", { text: t })))),
    el("div", { class: "small", text: step === 0 ? "Day " + d.n + " of " + LEARN.length + ". Nothing goes out yet." : step === 1 ? "Your 5 hear the kind of day. The exact word comes later, and only when two kinds of signs agree." : "On days when the signs agree, Iris can say the exact word. Still never why." }),
    sec("Your note time"),
    el("div", { class: "row" }, ["8 AM", "12 PM", "6 PM", "9 PM"].map(t => el("button", { type: "button", class: "pill" + (S.time === t ? " blue" : ""), onclick: () => { S.time = t; redraw(); } }, t))),
    el("div", { class: "seg" }, [["auto", "Send on its own"], ["ask", "Ask me first"]].map(([k, t]) => el("button", { type: "button", class: S.send === k ? "on" : null, onclick: () => { S.send = k; redraw(); } }, t))),
    el("div", { class: "small", text: S.send === "auto" ? "Notes go out on their own. You get 10 minutes to cancel." : "Each note waits until you tap Send." }),
    el("button", { class: "link", type: "button", style: "align-self:flex-start;justify-self:start", onclick: () => { S.fp.tab = "circle"; redraw(); } }, "Choose how often each person hears, in My Circle"),
    sec("Your blocks"), blocksList(),
    sec("Your privacy"),
    el("div", { class: "widget flat", style: "gap:10px" },
      el("div", { class: "spread" }, el("div", {}, el("b", { text: "Pause Iris today" }), el("div", { class: "small", text: "Nothing goes out today." })),
        el("button", { type: "button", class: "pill" + (S.fp.paused[d.n] ? " dark" : ""), "aria-pressed": S.fp.paused[d.n] ? "true" : "false", onclick: () => { S.fp.paused[d.n] = !S.fp.paused[d.n]; redraw(); } }, S.fp.paused[d.n] ? "Paused" : "Pause")),
      el("div", { class: "spread" }, el("div", {}, el("b", { text: "Delete today's read" }), el("div", { class: "small", text: S.fp.deleted[d.n] ? "Deleted. Nothing goes out today." : "Iris forgets today. Today's notes don't go out." })),
        S.fp.deleted[d.n] ? el("button", { class: "link", type: "button", onclick: () => { delete S.fp.deleted[d.n]; redraw(); } }, "Undo")
          : S.fp.delAsk[d.n] ? el("span", { class: "row" }, el("button", { class: "pill dark", type: "button", onclick: () => { S.fp.deleted[d.n] = true; delete S.fp.delAsk[d.n]; redraw(); toast("Today's read is deleted."); } }, "Delete"),
            el("button", { class: "pill", type: "button", onclick: () => { delete S.fp.delAsk[d.n]; redraw(); } }, "Keep"))
          : el("button", { class: "pill", type: "button", onclick: () => { S.fp.delAsk[d.n] = true; redraw(); } }, "Delete"))),
    el("div", { class: "small", text: "Never shared with your 5: why, the words in your messages, other people's names, money, or where you are." }),
    el("button", { class: "link", type: "button", style: "align-self:flex-start;justify-self:start", onclick: () => go(0, -1) }, "Watch the story again")];
}
add({ ch: 2, bg: "app", title: "Your Iris", phone: OWNER, free: true, day: () => DAYS[S.fp.di], render: () => {
  const d = DAYS[S.fp.di];
  if (!d) return [appHead("No days in this demo")];
  const body = { today: freeToday, circle: freeCircle, journal: freeJournal, you: freeYou }[S.fp.tab] || freeToday;
  return [sandboxBar(d), body(d), tabBar()];
} });

/* ---------- moving through it ---------- */
const BG = { peach: "var(--peach)", sky: "var(--sky)", lilac: "var(--lilac)", mint: "var(--mint)", butter: "var(--butter)", app: "var(--screen)" };
function go(k, dir) { S.i = Math.max(0, Math.min(FLOW.length - 1, k)); draw(true, dir); }
function next() { if (S.i < FLOW.length - 1) go(S.i + 1, 1); }
function back() { if (S.i > 0) go(S.i - 1, -1); }
function draw(animate, dir) {
  clearInterval(tick);
  const f = FLOW[S.i], slot = $("#slot"), keep = animate ? 0 : (slot.firstChild ? slot.firstChild.scrollTop : 0);
  $("#glass").style.backgroundColor = BG[f.bg];
  const bars = [...document.querySelectorAll("#bars b")];
  [0, 1, 2].forEach(ch => {
    const idx = FLOW.map((x, k) => k).filter(k => FLOW[k].ch === ch);
    bars[ch].style.width = f.ch > ch ? "100%" : f.ch < ch ? "0%" : Math.round(((idx.indexOf(S.i) + 1) / idx.length) * 100) + "%";
  });
  $("#backBtn").disabled = S.i === 0;
  $("#prevU").disabled = S.i === 0;
  $("#nextU").disabled = S.i === FLOW.length - 1;
  $("#where").replaceChildren(el("b", { text: f.title }), (S.i + 1) + " of " + FLOW.length + " · " + f.phone + "'s phone");
  const slide = el("div", { class: "slide" + (f.bg === "app" ? " app" : "") + (f.free ? " free" : "") + (animate ? (dir < 0 ? " back" : " in") : "") });
  slide.append(...f.render().flat(Infinity).filter(Boolean));
  if (f.after) f.after(slide);
  slot.replaceChildren(slide);
  if (keep) slide.scrollTop = keep;
  try { history.replaceState(null, "", "#" + (S.i + 1)); } catch (e) {}
  if (!$("#hood").hidden && animate) renderHood();
  overlay();
}
$("#backBtn").addEventListener("click", back);
$("#prevU").addEventListener("click", back);
$("#nextU").addEventListener("click", next);
document.addEventListener("keydown", e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === "Escape") { if (S.fp.sheet) closeSheet(); else closeHood(); }
  else if (e.key === "ArrowRight") next();
  else if (e.key === "ArrowLeft") back();
});

/* ---------- under the hood: the real engine record for the current screen ---------- */
const kv = pairs => el("dl", { class: "kv" }, pairs.filter(p => p && p[1] != null && p[1] !== "").map(([k, v]) => [el("dt", { text: k }), el("dd", {}, v)]));
const tag = (t, cls) => el("span", { class: "tag" + (cls ? " " + cls : ""), text: t });
const vs = (a, b) => b == null ? String(a) : a + " (usual " + b + ")";
const pct = x => x == null ? null : Math.round(x * 100) + "%";
function inputsBlock(d) {
  const I = d.inputs || {}, see = I.see || {}, hear = I.hear || {}, talk = I.talk || {}, hap = I.happens || {};
  const out = [el("h3", { text: "What Muse read (" + OWNER + "'s own side only)" })];
  out.push(el("h4", {}, "What " + OWNER + " sees", tag("Instagram, fictional")));
  out.push(kv([
    ["Reels watched", vs(see.reels_watched, see.usual_reels)],
    ["Themes today", (see.themes_today || []).join(", ")],
    ["Heavier themes", (see.heavy_themes || []).join(", ")],
    ["Heavy share", see.heavy_share == null ? null : vs(pct(see.heavy_share), pct(see.usual_heavy_share))],
    ["Saved", see.saved],
    ["Crisis content", see.crisis_content ? "watched " + see.crisis_content.watched + ", chosen " + see.crisis_content.chosen : null]
  ]));
  out.push(el("h4", {}, "What " + OWNER + " hears", tag("Spotify, simulated", "sim")));
  out.push(kv([
    ["Plays", vs(hear.plays, hear.usual_plays)],
    ["Brightness", hear.brightness == null ? null : vs(hear.brightness, hear.usual_brightness)],
    ["Energy", hear.energy == null ? null : vs(hear.energy, hear.usual_energy)],
    ["Top tracks", (hear.top_tracks || []).map(t => t.track + " by " + t.artist + " (" + t.plays + ")").join(", ")],
    ["On repeat", hear.on_repeat]
  ]));
  out.push(el("h4", {}, "What " + OWNER + " talks about", tag("Instagram chats, own side, fictional")));
  const w5 = talk.with_your_5 || {};
  out.push(kv([
    ["Messages sent", vs(talk.messages_you_sent, talk.usual)],
    ["With the 5", Object.keys(w5).map(k => k + " " + w5[k].sent + (w5[k].usual != null ? "/" + w5[k].usual : "")).join(", ")],
    ["Outside the 5", talk.outside_your_5]
  ]));
  if ((talk.own_words || []).length) out.push(el("div", { class: "note", style: "margin-top:6px", text: OWNER + "'s own words, for the gist (never shown to anyone):" }), el("div", { class: "words" }, talk.own_words.map(w => el("span", { text: w }))));
  out.push(el("h4", {}, "What happens to " + OWNER, tag("Calendar, simulated", "sim")));
  const ev = list => (list || []).map(e => (e.all_day ? "all day" : clock(e.time)) + " " + e.title + (e.with && e.with.length ? " (with " + e.with.join(", ") + ")" : "")).join("; ");
  out.push(kv([["Yesterday", ev(hap.yesterday) || "nothing"], ["Today", ev(hap.today) || "nothing"], ["Tomorrow", ev(hap.tomorrow) || "nothing"]]));
  if ((I.normal || []).length) out.push(el("div", { class: "note", style: "margin-top:6px", text: "Off " + OWNER + "'s normal: " + I.normal.join(", ") + "." }));
  return out;
}
function notesBlock(d) {
  const out = [el("h3", { text: "Notes (" + d.notes.length + ")" })];
  d.notes.forEach(n => {
    const a = n.action || {}, c = n.check || {};
    out.push(el("div", { class: "card" },
      el("div", { class: "spread" }, el("b", { text: "To " + n.to }), el("span", {}, tag(n.status || ""), n.fallback ? tag("safe fallback", "bad") : null)),
      el("div", { class: "q", text: n.text }),
      kv([
        ["Said", n.shown ? n.shown + " (" + (n.level === "specific" ? "exact word" : "family") + ")" : null],
        ["Shared interest", n.interest],
        ["Action", (a.type || "") + ": " + (a.label || "") + (a.surprise ? " (surprise)" : "")],
        ["Detail", a.detail],
        ["Signature", n.signature],
        ["Sends", clock(n.sends_at) + (n.cancel_until ? ", cancel until " + clock(n.cancel_until) : "")],
        ["Tries", n.tries]
      ]),
      el("div", {}, tag(c.leak ? "privacy check: leak" : "privacy check: no leak", c.leak ? "bad" : "good"),
        tag(c.voice_ok === false ? "word check: problem" : "word check: ok", c.voice_ok === false ? "bad" : "good"),
        tag(c.harmless_if_wrong === false ? "harmful if wrong" : "harmless if wrong", c.harmless_if_wrong === false ? "bad" : "good")),
      c.reason ? el("div", { class: "note", text: "Muse privacy check: " + c.reason }) : null));
  });
  if (d.not_sent.length) {
    out.push(el("h3", { text: "Not sent" }));
    out.push(el("table", {}, el("tr", {}, el("th", { text: "Person" }), el("th", { text: "Why" })), d.not_sent.map(x => el("tr", {}, el("td", { text: x.name }), el("td", { text: x.why })))));
  }
  if ((d.cards || []).length) { out.push(el("h3", { text: "Cards for " + OWNER })); d.cards.forEach(c => out.push(el("div", { class: "card" }, tag(c.kind), c.text))); }
  return out;
}
function friendViewBlock(d) {
  if (!(d.friend_view || []).length) return [];
  return [el("h3", { text: "The friends' view: the 5 today" }),
    el("table", {}, el("tr", {}, el("th", { text: "Name" }), el("th", { text: "Mood" }), el("th", { text: "Source" })),
      d.friend_view.map(f => el("tr", {}, el("td", { text: f.name }), el("td", { text: f.mood || "none yet" }), el("td", {}, tag(f.source === "engine" ? "engine read" : "simulated", f.source === "engine" ? "good" : "sim")))))];
}
function setupBlock() {
  return [el("h3", { text: OWNER + "'s settings in the demo" }),
    kv([["Note time", clock(SET.note_time)], ["Send mode", SET.send_mode === "ask" ? "Ask me first" : "Send on its own, 10 minutes to cancel"],
      ["Sources", Object.keys(SET.sources || {}).filter(k => SET.sources[k]).join(", ") + " (Spotify and calendar simulated)"],
      ["Notes start", "day " + (SET.notes_switch_on_day || 15)], ["Age, country", (SET.age || "") + ", " + (SET.country || "")]]),
    el("table", { style: "margin-top:10px" }, el("tr", {}, el("th", { text: "Person" }), el("th", { text: "Setting" }), el("th", { text: "Shares" }), el("th", { text: "Nearby" })),
      CIRCLE.map(c => el("tr", {}, el("td", { text: c.first }), el("td", { text: LEVEL[c.setting] || c.setting }), el("td", { text: (c.allowed_interests || []).join(", ") }), el("td", { text: c.nearby ? "yes" : "no" }))))];
}
function demoStats() {
  const notes = LIVE.flatMap(d => d.notes), acts = {};
  notes.forEach(n => { const t = (n.action || {}).type || "other"; acts[t] = (acts[t] || 0) + 1; });
  return kv([
    ["Days", DAYS.length + " (" + LEARN.length + " learning, " + LIVE.length + " read)"],
    ["Notes written", String(notes.length)],
    ["Actions", Object.keys(acts).map(k => acts[k] + " " + k).join(", ")],
    ["Surprises", String(notes.filter(n => n.action && n.action.surprise).length)],
    ["Safe fallbacks", String(notes.filter(n => n.fallback).length)],
    ["Leaks flagged", String(notes.filter(n => n.check && n.check.leak).length)]
  ]);
}
function benchBlock() {
  return [el("h3", { text: "Test bench" }),
    el("p", { class: "note", text: BENCH.cases + " fictional cases, " + BENCH.notes + " notes, one run on " + BENCH.when + ". Model: " + BENCH.model + "." }),
    el("table", {}, el("tr", {}, el("th", { text: "Checked" }), el("th", { text: "Target" }), el("th", { text: "Result" })),
      BENCH.rows.map(r => el("tr", {}, r.map(c => el("td", { text: c }))))),
    el("p", { class: "note", style: "margin-top:8px", text: BENCH.said }),
    el("h3", { text: "The whole demo month" }), demoStats()];
}
function builtBlock() {
  return [el("h3", { id: "built", text: "What I built" }),
    el("ul", { style: "margin:0;padding-left:18px;font-size:13.5px;display:grid;gap:4px" },
      el("li", { text: "The Iris app and every screen in this prototype." }),
      el("li", { text: "The engine: the daily read, the gates (permissions and safety), the note writer, the ready actions, the word check and the privacy check." }),
      el("li", { text: "The test bench and its cases." }),
      el("li", { text: "The peach character, made with Muse Image." }),
      el("li", { text: "The simulated Calendar and Spotify feeds, the friends' moods and the fictional month." })),
    el("h3", { text: "What is Meta's" }),
    el("ul", { style: "margin:0;padding-left:18px;font-size:13.5px;display:grid;gap:4px" },
      el("li", { text: "Muse Spark, the model that reads the day, writes and checks each note." }),
      el("li", { text: "Muse Image, used to make the character." }),
      el("li", { text: "Instagram, where sign in and the reels and chats come from." }),
      el("li", { text: "Muse Charm, the device. Delivery to it is a concept, simulated here." }))];
}
function renderHood() {
  const f = FLOW[S.i], d = f.day ? f.day() : null, h = $("#hood");
  const kids = [el("div", { class: "dh" },
    el("div", {}, el("h2", { text: "Under the hood" }), el("p", { class: "lede", text: d ? "Day " + d.n + ", " + dateLabel(d) + ". The real engine record behind \"" + f.title + "\"." : "Behind \"" + f.title + "\": the demo setup." })),
    el("button", { class: "x", type: "button", "aria-label": "Close", onclick: closeHood }, icon("x")))];
  kids.push(el("p", { class: "note", style: "margin-top:12px", text: "Muse judges, code decides. Plain code checks every permission and safety rule, Muse Spark reads the day and writes each note, then a word check and a separate Muse privacy check run on every note." }));
  if (d && d.learning) {
    kids.push(el("h3", { text: "The read" }), kv([["Status", "Still learning. No read, no notes."]]));
    kids.push(...inputsBlock(d), ...notesBlock(d));
  } else if (d) {
    kids.push(el("h3", { text: "The read (Muse)" }), kv([["Mood", d.mood], ["What the 5 hear", d.poke ? d.poke + " (" + (d.poke_level === "specific" ? "the exact word, earned" : "the family") + ")" : null], ["Direction", d.direction], ["Size", d.size], ["Moment", d.moment + " (" + OWNER + "'s own log only)"], ["Private why", d.why ? d.why + " (" + OWNER + "'s own log only, never sent)" : null]]));
    kids.push(...inputsBlock(d), ...notesBlock(d), ...friendViewBlock(d));
  } else {
    kids.push(...setupBlock());
  }
  kids.push(...benchBlock(), ...builtBlock());
  kids.push(el("p", { class: "note", style: "margin-top:20px", text: "Hackathon prototype, not a Meta product. Every person and message is fictional. Character made with Muse Image." }));
  h.replaceChildren(...kids.flat(Infinity).filter(Boolean));
}
function openHood(anchor) {
  renderHood(); $("#hood").hidden = false; $("#scrim").hidden = false;
  if (anchor) { const a = document.getElementById(anchor); if (a) a.scrollIntoView(); } else $("#hood").scrollTop = 0;
}
function closeHood() { $("#hood").hidden = true; $("#scrim").hidden = true; }
$("#hoodBtn").addEventListener("click", () => openHood());
$("#hoodTop").addEventListener("click", () => openHood());
$("#scrim").addEventListener("click", closeHood);
const builtLink = document.getElementById("builtLink");
if (builtLink) builtLink.addEventListener("click", e => { e.preventDefault(); openHood("built"); });

// for scripted checks: IRIS.go(k), IRIS.count, IRIS.picks
window.IRIS = { go: k => go(k, 1), next, back, count: FLOW.length, titles: FLOW.map(f => f.title), openHood, closeHood,
  picks: { big: BIG && BIG.n, bigFriend: BIG_WHO, tired: TIRED.day && TIRED.day.n, tiredFriend: TIRED.who, low: LOW.day && LOW.day.n, lowFriend: LOW.who, home: HOME && HOME.n } };

const start = parseInt((location.hash || "").slice(1), 10);
S.i = start >= 1 && start <= FLOW.length ? start - 1 : 0;
draw(true, 1);
})();
