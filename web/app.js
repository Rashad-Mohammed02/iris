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

// v2 test bench, from bench/results/v2-latest.md (28 cases, one run, 28 Oct 2026).
const BENCH_V2 = {
  when: "28 Oct 2026", cases: 28, notes: 41, model: "muse-spark-1.3",
  rows: [
    ["Right decision (who, size, direction, surprise)", "90%+", "27 of 28"],
    ["Safety cases caught", "100%", "6 of 6"],
    ["Notes that gave the reason away", "0", "0 of 41"],
    ["Tone (word check and grader)", "95%+", "30 of 41"],
    ["Built on a shared interest", "100%", "41 of 41"],
    ["Action makes sense", "95%+", "40 of 41"],
    ["Harmless if wrong", "95%+", "39 of 41"]
  ],
  said: "Five leak traps (a breakup, a medical test, money trouble, a family secret, a layoff) shared the mood and never the reason. The one wrong decision: a layoff day was read as big, so a Big moments friend also got a note. Most tone misses are the grader disliking notes that repeat the name. Written and run once, without tuning to it."
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
const firstSentence = t => { const m = String(t || "").match(/^[^.?!]*[.?!]/); return m ? m[0] : String(t || ""); };
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
const S = { i: 0, cancel: {}, done: {}, felt: "", time: clock(SET.note_time || "18:00") || "6 PM", send: SET.send_mode === "ask" ? "ask" : "auto", perm: {}, sources: { see: true, hear: true, talk: true, happens: true } };
const LEVEL = { every_day: "Every day", big_moments: "Big moments", never: "Never" };
const LEVEL_HELP = { "Every day": "A note every day at your time, whatever your mood", "Big moments": "Only on days that really stand out, good or hard", "Never": "Never gets a note about you" };
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
const ACT_BTN = { song: "Send the song", reel: "Pick a reel", lunch: "Book the table", tickets: "Get the two seats", treat: "Send the treat", message: "Open the chat" };
const ACT_DONE = { song: "Song sent.", reel: "Reel sent.", lunch: "Table booked.", tickets: "Two seats booked.", treat: "Treat on its way.", message: "Chat opened." };
const NEEDS_CONNECTOR = { lunch: "Calendar and Spotify are simulated here. The free hour comes from both simulated calendars.", tickets: "Calendar and Spotify are simulated here. The show comes from a simulated ticket list.", song: "Calendar and Spotify are simulated here. The song comes from a simulated Spotify history." };
function actBox(n) {
  const a = n.action || {};
  return el("div", { class: "act" }, icon(a.type || "message"), el("div", {}, el("b", { text: a.label || "" }), a.detail ? el("span", { text: a.detail }) : null));
}
const surpriseLine = () => el("div", { class: "surprise" }, icon("gift"), el("span", { text: "Make it a surprise. Don't say Iris told you." }));

// The friend's view of one note: mood word, one idea, a ready action. Never why.
function friendNote(n, key) {
  if (!n) return el("div", { class: "widget flat" }, el("div", { class: "small", text: "No note today." }));
  const a = n.action || {}, done = S.done[key];
  return el("div", { class: "widget arrive" },
    el("div", { class: "spread" }, el("div", { class: "eyebrow", text: "From " + OWNER }), chip(firstSentence(n.text).replace(/^[^,]*,\s*/, "").replace(/[.?!]$/, ""), "mood")),
    el("p", { class: "quote", text: n.text }),
    actBox(n),
    a.surprise ? surpriseLine() : null,
    done ? el("div", { class: "ok", text: done === "no" ? "Okay. " + OWNER + " won't know." : (ACT_DONE[a.type] || "Done.") + (a.surprise ? " " + OWNER + " won't know Iris suggested it." : "") })
      : el("div", { class: "row" },
        el("button", { class: "pill blue", type: "button", onclick: () => { S.done[key] = "yes"; redraw(); } }, ACT_BTN[a.type] || "Do it"),
        el("button", { class: "pill", type: "button", onclick: () => { S.done[key] = "no"; redraw(); } }, "Not now")),
    sig(n.signature));
}
function fiveToday(day, viewer, opts) {
  const fv = (day && day.friend_view || []).filter(f => f.name !== viewer);
  fv.sort((a, b) => (a.name === OWNER ? -1 : b.name === OWNER ? 1 : 0));
  return el("div", { class: "widget flat", style: "gap:2px" },
    fv.map(f => el("div", { class: "notice" },
      el("span", { class: "row", style: "gap:10px" }, av(f.name, true), el("span", { class: f.name === OWNER ? "who" : null, text: f.name })),
      f.mood ? chip(f.mood, f.name === OWNER ? "mood" : null) : el("span", { class: "small", text: "no word yet" }))),
    opts && opts.simLabel === false ? null : el("div", { style: "padding-top:6px" }, simLine("Friends' moods are simulated in this demo. " + OWNER + "'s word is the engine's real read.")));
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
    el("p", { class: "agent", text: "How your day goes shapes how you feel. Iris reads it so your 5 can know, in one word." }),
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
        el("div", { class: "seg" }, ["Every day", "Big moments", "Never"].map(l => el("button", { type: "button", class: l === cur ? "on" : null, onclick: () => { S.perm[c.first] = l; redraw(); } }, l))),
        el("div", { class: "small", text: LEVEL_HELP[cur] }));
    })),
    el("div", { class: "small", text: "Nobody sees what you chose for them." }),
    goBtn("Done", { cls: "blue" })
  ];
} });

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
  el("p", { class: "lead", text: BIG ? "Muse reads " + OWNER + "'s day as " + BIG.mood + ", and " + BIG.size + ". At " + S.time + ", Iris writes a note to " + (BIG.notes.length === CIRCLE.length ? "each of the 5" : joinNames(BIG.notes.map(n => n.to))) + "." : "" }),
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
      el("div", { class: "row" }, chip(d.mood, "mood"), el("span", { text: d.moment || "" }))),
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
    d.not_sent.length ? el("div", { class: "small", text: "Not today: " + d.not_sent.map(x => x.name + " (" + x.why.charAt(0).toLowerCase() + x.why.slice(1) + ")").join(", ") + "." }) : null,
    el("div", { class: "small", text: "Each note is signed: " + ((d.notes[0] || {}).signature || "Suggested by Muse.") }),
    goBtn("See " + BIG_WHO + "'s phone", { cls: "blue" })
  ];
} });

add({ ch: 1, bg: "app", title: BIG_WHO + "'s phone", phone: BIG_WHO, day: () => BIG, render: () => {
  const n = noteTo(BIG, BIG_WHO);
  return [
    banner(OWNER + ":", firstSentence(n && n.text)),
    chip("On " + BIG_WHO + "'s phone"),
    appHead("Your 5 today", "Good evening, " + BIG_WHO + "."),
    fiveToday(BIG, BIG_WHO),
    friendNote(n, "big"),
    el("div", { class: "small", text: "That's all " + BIG_WHO + " sees: one word and one idea. Never why." }),
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
    banner(OWNER + ":", firstSentence(n && n.text)),
    chip("On " + TIRED.who + "'s phone"),
    appHead("A note from " + OWNER, "Good evening, " + TIRED.who + "."),
    friendNote(n, "tired"),
    t === "lunch" ? el("div", { class: "small", text: "Iris only shares the free hour, never what is on either calendar." }) : null,
    NEEDS_CONNECTOR[t] ? simLine(NEEDS_CONNECTOR[t]) : null,
    goBtn("Another day", { cls: "blue" })
  ];
} });

// A low day, then the treat on Maya's phone and her Charm
add({ ch: 1, bg: "lilac", title: "A low day", phone: OWNER, day: () => LOW.day, render: () => {
  const d = LOW.day, low = d && (d.mood === "low" || d.mood === "sad");
  return [
    el("div", { style: "margin-top:auto" }, pose("heart", "pop")),
    el("div", { class: "kicker", text: "A harder day" }),
    el("h1", { class: "h1", text: low ? "A low day." : "Then a heavier day." }),
    el("p", { class: "lead", text: d ? "Muse reads it as " + d.mood + ". " + LOW.who + " gets that word and one idea. Never why." : "" }),
    goBtn("See " + LOW.who + "'s phone")
  ];
} });

add({ ch: 1, bg: "app", title: LOW.who + "'s phone and Charm", phone: LOW.who, day: () => LOW.day, render: () => {
  const n = noteTo(LOW.day, LOW.who), t = n && n.action && n.action.type;
  return [
    banner(OWNER + ":", firstSentence(n && n.text)),
    chip("On " + LOW.who + "'s phone"),
    friendNote(n, "low"),
    t === "treat" ? el("div", { class: "small", text: "Iris fills in the address, so " + LOW.who + " never sees it." }) : null,
    NEEDS_CONNECTOR[t] ? simLine(NEEDS_CONNECTOR[t]) : null,
    el("div", { class: "who", style: "margin-top:4px", text: "The same note on " + LOW.who + "'s Muse Charm" }),
    el("div", { class: "charm" }, el("div", { class: "cbody" }), el("span", { class: "cam" }), el("div", { class: "cord", html: CORD }),
      el("div", { class: "scr" }, img(FACE), el("div", { text: n ? n.text : "" }))),
    simLine("Concept: delivery to a Muse Charm is simulated."),
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
    el("div", { class: "tabbar" },
      el("span", { class: "on" }, icon("home"), "Today"),
      el("span", {}, icon("people"), "Your 5"),
      el("span", {}, icon("user"), "You")),
    goBtn("Later, on " + OWNER + "'s phone", { cls: "blue" })
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
  el("p", { class: "lead center", text: "Any mood, every day. One word and one idea for each of your 5, and you stay in charge." }),
  el("div", { class: "go" },
    el("button", { class: "btn primary", type: "button", onclick: () => openHood("built") }, "What I built"),
    el("button", { class: "btn", type: "button", onclick: () => go(0, -1) }, "Start over")),
  el("p", { class: "fine", text: "Hackathon prototype, not a Meta product. Every person and message is fictional. Character made with Muse Image." })
] });

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
  const slide = el("div", { class: "slide" + (f.bg === "app" ? " app" : "") + (animate ? (dir < 0 ? " back" : " in") : "") });
  slide.append(...f.render().flat(Infinity).filter(Boolean));
  if (f.after) f.after(slide);
  slot.replaceChildren(slide);
  if (keep) slide.scrollTop = keep;
  try { history.replaceState(null, "", "#" + (S.i + 1)); } catch (e) {}
  if (!$("#hood").hidden && animate) renderHood();
}
$("#backBtn").addEventListener("click", back);
$("#prevU").addEventListener("click", back);
$("#nextU").addEventListener("click", next);
document.addEventListener("keydown", e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === "Escape") closeHood();
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
  return [el("h3", { text: "Test bench (v2)" }),
    el("p", { class: "note", text: BENCH_V2.cases + " fictional cases, " + BENCH_V2.notes + " notes, one run on " + BENCH_V2.when + ". Model: " + BENCH_V2.model + "." }),
    el("table", {}, el("tr", {}, el("th", { text: "Checked" }), el("th", { text: "Target" }), el("th", { text: "Result" })),
      BENCH_V2.rows.map(r => el("tr", {}, r.map(c => el("td", { text: c }))))),
    el("p", { class: "note", style: "margin-top:8px", text: BENCH_V2.said }),
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
    kids.push(el("h3", { text: "The read (Muse)" }), kv([["Mood", d.mood], ["Direction", d.direction], ["Size", d.size], ["Moment", d.moment + " (" + OWNER + "'s own log only)"], ["Private why", d.why ? d.why + " (" + OWNER + "'s own log only, never sent)" : null]]));
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
