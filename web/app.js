// Here prototype: one phone, like the real thing. Arjun's phone and a friend's (or their Muse Charm),
// with a lock screen, a home screen and the apps. Reads window.DEMO (scripts/run_demo.py, real engine output),
// window.BENCH (bench/export_web.py) and window.IG (scripts/export_instagram.py). No network calls.

(function () {
  const D = window.DEMO;
  const B = window.BENCH || null;
  const IG = window.IG || { days: [] };
  const LIFTS_ON = D.settings.lifts_switch_on_day || 15;
  const LANDS = 28;  // the day Sam acts on his lift in the demo story
  const LEVELS = ["Always", "When it matters", "Just this once", "Never"];
  const LEVEL_HELP = { "Always": "A lift whenever you're a little off your normal", "When it matters": "Only after a clearly heavy stretch",
    "Just this once": "One lift, then it switches to Never", "Never": "Never gets a lift" };
  // Outline icons, one stroke weight, like the system icons in Meta's apps. No emoji anywhere in the app.
  const ic = (path, size) => `<svg class="ic" viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" aria-hidden="true">${path}</svg>`;
  const P = {
    flag: `<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>`, mic: `<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>`,
    ball: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17M6 6c3 3 3 9 0 12M18 6c-3 3-3 9 0 12"/>`,
    camera: `<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>`, cup: `<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M11 3v3"/>`,
    spark: `<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/>`,
    up: `<path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/>`,
    lock: `<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>`,
    pause: `<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>`, hand: `<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 0 1 2.6-1.5L8 14"/>`,
    clock: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`, insta: `<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".9" fill="currentColor"/>`,
    charm: `<rect x="5" y="4" width="14" height="14" rx="5"/><path d="M12 18v3"/><circle cx="12" cy="11" r="2.5"/>`, calendar: `<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>`,
    ticket: `<path d="M4 7.5h16v3a1.5 1.5 0 0 0 0 3v3H4v-3a1.5 1.5 0 0 0 0-3z"/><path d="M14 7.5v9" stroke-dasharray="1.5 2"/>`, music: `<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>`,
    chat: `<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>`, bell: `<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5h4"/>`,
    page: `<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12.5h6M9 16h6"/>`, people: `<circle cx="9" cy="9" r="3.2"/><circle cx="16.5" cy="10" r="2.6"/><path d="M3.5 19.5c.8-3.2 3-4.8 5.5-4.8s4.7 1.6 5.5 4.8M14.5 15c2.6-.4 5 1 5.8 4.5"/>`,
    shield: `<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>`, trash: `<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13"/>`, check: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
    chev: `<path d="M9.5 6l6 6-6 6"/>`,
  };
  const INTEREST = { "F1": "flag", "film photography": "camera", "the NBA": "ball", "stand-up comedy": "mic", "home espresso": "cup" };
  const interest = (i, size) => `<span class="int">${ic(P[INTEREST[i] || "spark"], size || 14)}${esc(i)}</span>`;
  const circle = D.settings.circle.map(m => ({ first: m.name.split(" ")[0], name: m.name, relation: m.relation, permission: m.permission }));
  const EXTRA = [{ first: "Tasha", relation: "close friend", h: "tasha.b" }, { first: "Jess", relation: "friend", h: "jessmoreno" }, { first: "Chris", relation: "friend", h: "chrispark" }];
  const HUES = { Maya: 340, Sam: 212, Dev: 28, Priya: 150, Omar: 268, Tasha: 190, Jess: 10, Chris: 300 };

  const ui = {
    day: 1, tab: "today", view: "crosses", app: "circle", rx: "Sam", rxDev: "phone", ob: null, handle: "arjun.rao",
    phone: "arjun", screen: { arjun: "home", friend: "lock" }, appB: "here", setupDone: false, chapter: 0, drawer: null,
    perms: {}, nick: {}, removed: {}, picked: new Set(circle.map(m => m.first)),
    send: D.settings.send_mode === "automatic" ? "auto" : "ask", pause: "on",
    approved: {}, stopped: {}, notMe: {}, think: {}, right: {}, wrong: {}, loop: {}, told: {}, together: {}, jx: {},
    invited: false, joined: {}, added: {}, rxLeft: {}, plan: {}, rxAsks: {}, notif: { lifts: true, page: true, together: true },
    sheetA: null, argA: null, sheetB: null, argB: null, deleted: false,
  };
  circle.forEach(m => { ui.perms[m.first] = m.permission; });

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const joinNames = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const cur = () => D.days[ui.day - 1];
  const ig = () => IG.days[ui.day - 1];
  const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const liftKey = (n, to) => n + ":" + to;
  const nameOf = f => (ui.nick[f] || "").trim() || f;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const POSE = n => `img/p-${n}.webp`;
  const FACE = "img/peach-avatar.png";
  const face = (size, cls) => `<img class="${cls || ""}" src="${FACE}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;flex:none">`;
  const av = (f, cls) => `<span class="av ${cls || ""}" style="background:hsl(${HUES[f] || 200} 55% 52%)">${esc(f[0])}</span>`;
  const shared = (f, d) => ((d || cur()).shared || {})[f] || [];
  const SPARK = `<svg viewBox="0 0 24 24"><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" fill="currentColor"/></svg>`;
  const ICON = {
    today: `<svg viewBox="0 0 24 24"><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/></svg>`,
    circle: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="2 3"/><circle cx="19" cy="7" r="1.6"/><circle cx="5" cy="15" r="1.6"/></svg>`,
    together: `<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M10.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/></svg>`,
    journal: `<svg viewBox="0 0 24 24"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3v18M10 8h5M10 12h5"/></svg>`,
    you: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6"/></svg>`,
    plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
    back: `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>`,
  };
  const STATUS = `<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="23" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="20" height="8" rx="1.9"/></svg>`;

  // A lift reaches the friend only if it wasn't stopped, lifts aren't paused, and,
  // when Arjun chose "Ask me first", he tapped Send.
  const delivered = (n, to) => !ui.stopped[liftKey(n, to)] && ui.pause === "on" && (ui.send === "auto" || ui.approved[liftKey(n, to)]);
  function allLifts(upto) {
    const out = [];
    D.days.slice(0, upto).forEach(d => d.lifts.forEach(l => out.push(Object.assign({ n: d.n, why: d.why }, l))));
    return out;
  }

  // ---------------- The story ----------------
  // Each moment sets the day, whose phone you hold, and what's on its screen. Between moments
  // everything is live: unlock, open any app, tap anything.
  const CHAPTERS = [
    { day: 1, label: "Arjun finds Here", hint: "Tap Here on the home screen to set it up.", phone: "arjun", screen: "home", fresh: true },
    { day: 2, label: "Sam gets an invite", hint: "Tap the notification on Sam's phone.", phone: "friend", rx: "Sam", screen: "lock" },
    { day: LIFTS_ON, label: "Lifts switch on", hint: "Two weeks in, Here knows Arjun's normal.", phone: "arjun", screen: "app", app: "circle", tab: "today" },
    { day: 24, label: "A rough week on Instagram", hint: "Arjun's watch history and messages this week.", phone: "arjun", screen: "app", app: "ig" },
    { day: 24, label: "A lift waits for Arjun's OK", hint: "Tap the notification, then Send.", phone: "arjun", screen: "lock" },
    { day: 24, label: "Sam gets the lift", hint: "This line is all Sam ever sees.", phone: "friend", rx: "Sam", screen: "lock", approve: "Sam" },
    { day: LANDS, label: "Sam shows up", hint: "To Arjun, it's just Sam being Sam.", phone: "arjun", screen: "app", app: "ig" },
    { day: LANDS, label: "How did that feel?", hint: "Only Arjun sees this question.", phone: "arjun", screen: "lock" },
    { day: LANDS, label: "Together", hint: "Coming soon: plans with people who love the same things.", phone: "arjun", screen: "app", app: "circle", tab: "together" },
  ];

  // ================= Arjun's phone =================
  function tToday() {
    const d = cur(), learning = d.n < LIFTS_ON;
    const hasLift = d.lifts.some(l => !ui.stopped[liftKey(d.n, l.to)]);
    let h = `<div class="head"><div><div class="sub">${esc(d.weekday)} · day ${d.n}</div><h1>Good evening, ${esc(D.owner)}</h1></div>
      <button class="round" type="button" data-tab="you" aria-label="You">${face(30)}</button></div>`;
    d.cards.forEach(c => { h += `<div class="widget danger"><div class="eyebrow">Just for you</div><div>${esc(c.text)}</div></div>`; });
    if (d.reveal) {
      h += `<div class="widget sky"><div class="eyebrow">New today · ${esc(d.reveal.title)}</div><div>${esc(d.reveal.text)}</div>`;
      if (d.reveal.suggested) h += `<div class="row">${d.reveal.suggested.map(n => `<span class="chip">${esc(nameOf(n))}</span>`).join("")}</div>`;
      if (d.reveal.interests) h += `<div class="row">${d.reveal.interests.map(n => `<span class="chip">${interest(n)}</span>`).join("")}</div>`;
      h += `</div>`;
    }
    const pose = learning ? "sleep" : hasLift ? "letter" : d.rule === "normal" ? "stand" : "heart";
    const k = "page" + d.n;
    h += `<div class="widget peach"><div class="posecard"><img class="bob" src="${POSE(pose)}" alt="">
      <div><div class="eyebrow">Your page · only you see this</div><p class="agent" style="margin-top:4px">${esc(d.page || (learning ? `I'm still getting to know your normal. Day ${d.n} of ${LIFTS_ON - 1}.` : "A quiet day."))}</p></div></div>
      ${d.page ? (ui.wrong[k] ? `<div class="small">Got it: "${esc(ui.wrong[k])}". I'll weigh that from now on.</div>` :
        `<div class="fb"><button class="${ui.right[k] ? "on" : ""}" data-right="${k}" aria-label="That's right">${ic(P.up)}</button><button data-wrong="${k}" aria-label="That's wrong">${ic(`<g transform="rotate(180 12 12)">${P.up}</g>`)}</button></div>`) : ""}</div>`;
    if (ui.wrong[k] === "open") h = h.replace(`<div class="small">Got it: "open".`, "") ;
    if (!learning) {
      h += `<button class="think" type="button" data-think="${d.n}">${SPARK}<span>What I'm noticing this week</span></button>`;
      if (ui.think[d.n]) {
        const sigs = d.rule === "normal" ? [] : d.signals;
        h += `<div class="widget flat">${sigs.length ? `<div class="small">Compared only with your own normal. Tap anything that isn't about you and I'll stop counting it.</div>` +
          sigs.map(s => { const key = d.n + ":" + s, off = ui.notMe[key];
            return `<div class="notice"><span style="${off ? "text-decoration:line-through;color:var(--ink-3)" : ""}">${esc(cap(s))}</span><button class="pill sm" type="button" data-notme="${esc(key)}">${off ? "Count it" : "Not about me"}</button></div>`; }).join("")
          : `<div>Nothing off your normal today.</div>`}
          <div class="secure">${ic(P.lock, 15)}Worked out privately by Muse. Nobody else sees it.</div>
          <button class="link" type="button" data-app="ig" style="justify-self:start;padding-left:0">See your Instagram activity ›</button></div>`;
      }
    }
    if (ui.pause !== "on" && d.lifts.length) h += `<div class="widget flat"><div class="who">Lifts are paused</div><div class="small">Nothing goes out until you turn them back on in You.</div></div>`;
    else d.lifts.forEach(l => {
      const lk = liftKey(d.n, l.to), st = ui.stopped[lk] ? "stopped" : (ui.approved[lk] ? "sent" : "");
      h += `<div class="h2">A lift for ${esc(nameOf(l.to))}</div><div class="widget" id="lift-${esc(lk)}">
        <div class="eyebrow">What ${esc(nameOf(l.to))} will see</div><p class="quote">${esc(l.text)}</p>
        <div class="sig">${face(22)}<span>Suggested by Muse. ${esc(D.owner)} didn't ask.</span></div>
        ${st === "stopped" ? `<div class="small">Not sent. ${esc(l.to)} won't know.</div>`
          : (st === "sent" || ui.send === "auto" && !st) && ui.send === "auto" ? `<div class="row"><span class="small">Sends in 10 minutes</span><button class="pill sm" type="button" data-stop="${esc(lk)}">Stop it</button></div>`
          : st === "sent" ? `<div class="ok">${ic(P.check, 16)}Sent. ${esc(nameOf(l.to))} sees the line, never why.</div>`
          : `<div class="row"><button class="pill blue" type="button" data-approve="${esc(lk)}">Send</button><button class="pill" type="button" data-stop="${esc(lk)}">Not this one</button><span class="small">You two share ${interest(l.interest, 13)}</span></div>`}
      </div>`;
    });
    d.prompts.forEach(p => {
      const pk = d.n + p.kind + p.about;
      if (p.kind === "close_the_loop") {
        h += `<div class="widget lilac"><div class="row">${face(22)}<div class="eyebrow">Only you see this</div></div><div>${esc(p.text)}</div>` +
          (ui.loop[pk] ? `<div class="small" style="color:var(--lilac-ink)">Noted: "${esc(ui.loop[pk])}". I'll use that to get better for you.</div>`
            : `<div class="row">${["Loved it", "It was nice", "A bit much"].map(o => `<button class="pill white" type="button" data-loop="${esc(pk)}" data-v="${o}">${o}</button>`).join("")}</div>`) + `</div>`;
      } else {
        h += `<div class="widget flat"><div>${esc(p.text)}</div>` + (ui.told[pk] ? `<div class="small">Okay.</div>`
          : `<div class="row"><button class="pill sm" type="button" data-told="${esc(pk)}">${p.kind === "tell_them" ? "Tell them" : "Yes"}</button><button class="pill sm" type="button" data-told="${esc(pk)}">Not now</button></div>`) + `</div>`;
      }
    });
    if (!d.page && !d.reveal && !d.lifts.length && !d.prompts.length && !d.cards.length && !learning) h += `<div class="small" style="text-align:center">Nothing else today. Enjoy it.</div>`;
    return h;
  }

  function tCircle() {
    const d = cur();
    const R = { close: 24, around: 34, farther: 44 };
    const people = d.orbit.filter(o => !ui.removed[o.name]);
    let orbit = `<div class="orbit" id="orbit">` + [[24, "close"], [34, "around"], [44, "farther"]].map(([r, lab]) =>
      `<div class="rg" style="inset:${50 - r}%"></div><div class="rg-label" style="top:${50 + r + 1}%">${lab}</div>`).join("") +
      `<div class="core"><img class="bob" src="${POSE("stand")}" alt=""></div>`;
    const pos = {};
    people.forEach((o, i) => { const a = (i / people.length) * Math.PI * 2 - Math.PI / 2, r = R[o.ring] || 34;
      pos[o.name] = [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
      orbit += `<button class="planet" type="button" data-person="${esc(o.name)}" style="left:${pos[o.name][0]}%;top:${pos[o.name][1]}%">${av(o.name, "sm")}${esc(nameOf(o.name))}</button>`; });
    d.lifts.filter(l => delivered(d.n, l.to) && pos[l.to]).forEach((l, i) => {
      orbit += `<img class="messenger" src="${FACE}" alt="" data-to="${esc(l.to)}" data-i="${i}" style="left:50%;top:50%">`; });
    orbit += `</div>`;
    let h = `<div class="head"><div><div class="sub">${people.length} of 5</div><h1>Your circle</h1></div><button class="round" type="button" data-sheet-a="add" aria-label="Add someone">${ICON.plus}</button></div>
      <div class="small">Closer to the middle means you've talked more lately. Never better or worse.</div>${orbit}<div class="group">`;
    people.forEach(o => {
      const sh = shared(o.name);
      h += `<button class="li" type="button" data-person="${esc(o.name)}">${av(o.name)}<div><div class="who">${esc(nameOf(o.name))}</div>
        <div class="small">${esc(o.relation)}${sh.length ? " · " + sh.join(", ") : ""} · ${esc(ui.perms[o.name] || o.permission)}</div></div><span class="chev">›</span></button>`;
    });
    h += `</div><div class="small">Tap anyone to change their nickname or when they may get a lift. Nobody is ever told.</div>`;
    return h;
  }

  function togetherIdeas() {
    const by = {};
    circle.filter(m => !ui.removed[m.first]).forEach(m => shared(m.first).forEach(i => { (by[i] = by[i] || []).push(m.first); }));
    const ideas = [];
    const PLAN = { "F1": ["Race weekend", "The next Grand Prix is this weekend. Watch it together?", "Plan a watch party"],
      "stand-up comedy": ["Comedy night", "There's a stand-up show near you on Friday.", "Go together"],
      "the NBA": ["Game night", "A big game is on Thursday night.", "Plan it"],
      "film photography": ["A photo walk", "Sunday looks sunny. Bring a roll each?", "Invite"],
      "home espresso": ["Coffee crawl", "Two new cafes opened near you.", "Plan it"] };
    Object.entries(by).sort((a, b) => b[1].length - a[1].length).forEach(([i, fs]) => {
      const p = PLAN[i] || ["Something together", "You both love " + i + ".", "Plan it"];
      ideas.push({ id: i, icon: P[INTEREST[i] || "spark"], title: p[0] + " with " + joinNames(fs.map(nameOf)), why: (fs.length > 1 ? "You, " + joinNames(fs.map(nameOf)) + " all love " : "You and " + nameOf(fs[0]) + " both love ") + i + ". " + p[1],
        cta: p[2], people: fs, event: i === "stand-up comedy" });
    });
    return ideas;
  }
  function tTogether() {
    let h = `<div class="head"><div><div class="sub"><span class="soon">Coming soon</span></div><h1>Together</h1></div></div>
      <div class="widget lilac"><div class="posecard"><img class="bob" src="${POSE("celebrate")}" alt=""><div><div class="eyebrow">Less scrolling, more plans</div>
      <p class="agent" style="margin-top:4px">When people in your circle love the same thing, or are heading to the same event, I'll suggest doing it together.</p></div></div></div>`;
    togetherIdeas().forEach(x => {
      const st = ui.together[x.id];
      h += `<div class="widget"><div class="row" style="justify-content:space-between"><span class="tile-ic">${ic(x.icon, 22)}</span>${x.event ? `<span class="soon">Events · soon</span>` : ""}</div>
        <div class="who" style="font-size:17px">${esc(x.title)}</div><div class="small" style="font-size:14px;color:var(--ink-2)">${esc(x.why)}</div>
        <div class="row">${x.people.map(f => `<span class="chip">${av(f, "sm")}${esc(nameOf(f))}</span>`).join("")}</div>
        ${st === "go" ? `<div class="ok">${ic(P.check, 16)}Sent to your group chat.</div>` : st === "no" ? `<div class="small">Hidden. I won't suggest this one again.</div>`
          : `<div class="row"><button class="pill dark" type="button" data-together="${esc(x.id)}" data-v="go">${esc(x.cta)}</button><button class="pill" type="button" data-together="${esc(x.id)}" data-v="no">Not for me</button></div>`}</div>`;
    });
    h += `<div class="small">Together only uses what you already share with each other, and events you both said you're going to. Nobody learns anything new about you.</div>`;
    return h;
  }

  function tJournal() {
    const d = cur(), j = d.journal;
    let h = `<div class="head"><div><div class="sub">Only you see this</div><h1>Journal</h1></div></div>`;
    if (!j) {
      const days = D.days.filter(x => x.journal && x.n <= ui.day).map(x => x.n);
      h += `<p class="agent">Write anything. I'll use your week to understand who and what you mean, then help you find the word for it, one small question at a time.</p>`;
      h += days.length ? `<div class="row">${days.map(n => `<button class="pill" type="button" data-goto="${n}" data-tab="journal">Open day ${n}</button>`).join("")}</div>` : `<div class="small">No entries yet.</div>`;
    } else {
      h += `<div class="small" style="text-align:center">${esc(d.weekday)}, day ${d.n}</div>`;
      j.turns.forEach((t, i) => {
        h += `<div class="bub me">${esc(t.user)}</div>`;
        if (t.connection) h += `<div class="connection">${SPARK.replace("<svg", '<svg width="14" height="14"')} Connected this to your week</div>`;
        h += `<div class="muse-line">${face(22)}<p>${esc(t.reply)}</p></div>`;
        const next = (j.turns[i + 1] || {}).user || "";
        const words = t.feeling_words && t.feeling_words.length ? t.feeling_words : t.chips || [];
        if (words.length && t.step !== "safety") h += `<div class="row" style="padding-left:30px">${words.map(w => `<span class="chip ${next.toLowerCase().includes(w.toLowerCase()) ? "on" : ""}">${esc(w)}</span>`).join("")}</div>`;
      });
      if (j.own_words && j.own_words.options) {
        h += `<div class="widget flat"><div class="who">Help me say it to ${esc(nameOf("Dev"))}</div>` + j.own_words.options.map(o => `<div class="draft">${esc(o)}</div>`).join("") +
          (j.own_words.left_out ? `<div class="small">Left out: ${esc(j.own_words.left_out)}.</div>` : "") +
          `<div class="row"><button class="pill sm" type="button" data-copy="${esc(j.own_words.options[0])}">Copy</button><span class="small">I never send it. You do.</span></div></div>`;
      }
    }
    (ui.jx[d.n] || []).forEach(t => { h += `<div class="bub me">${esc(t)}</div><div class="muse-line">${face(22)}<p>Thanks for putting that into words. In the live app, Muse answers here using your week. Nothing you write is ever shown to anyone.</p></div>`; });
    h += `<form class="compose" data-journal="1"><input id="jin" placeholder="Write anything…" autocomplete="off"><button type="submit" aria-label="Send">${ICON.send}</button></form>`;
    return h;
  }

  function tYou() {
    // Laid out like the settings screens in Meta's apps: grey section titles, plain rows,
    // one outline icon per row, the current value in grey, a chevron when it opens something.
    const row = (icon, title, value, right, attr, danger) => `<${attr ? "button" : "div"} class="srow${danger ? " danger" : ""}" ${attr ? `type="button" ${attr}` : ""}>
      ${ic(P[icon], 22)}<span class="st">${esc(title)}</span>${value ? `<span class="sv">${esc(value)}</span>` : ""}${right === undefined ? (attr ? ic(P.chev, 16) : "") : right}</${attr ? "button" : "div"}>`;
    const tog = (on, key) => `<button class="toggle ${on ? "on" : ""}" type="button" data-notif="${key}" aria-pressed="${on}" aria-label="Turn on or off"></button>`;
    const lifts = allLifts(ui.day), sent = lifts.filter(l => delivered(l.n, l.to)).length;
    return `<div class="profile">${face(56)}<div><div class="pn">${esc(D.owner)}</div><div class="small">@${esc(ui.handle)}</div></div></div>
      <div class="sh">Lifts</div>
      ${row("pause", "Pause lifts", ui.pause === "on" ? "" : ui.pause === "day" ? "Today" : "This week", `<button class="toggle ${ui.pause !== "on" ? "on" : ""}" type="button" data-pause="${ui.pause === "on" ? "day" : "on"}" aria-label="Pause lifts"></button>`)}
      ${row("hand", "Before a lift goes out", ui.send === "ask" ? "Ask me first" : "Send on its own", undefined, `data-sheet-a="send"`)}
      ${row("clock", "Lift history", lifts.length ? sent + " sent" : "None yet", undefined, `data-sheet-a="history"`)}
      <div class="sh">Connected apps</div>
      ${row("insta", "Instagram", "Connected", "")}
      ${row("spark", "Muse", "Connected", "")}
      ${row("charm", "Muse Charm", "Coming soon", undefined, `data-sheet-a="charm"`)}
      ${row("calendar", "Calendar", "Coming soon", "")}
      ${row("ticket", "Events", "Coming soon", "")}
      ${row("music", "Music", "Coming soon", "")}
      ${row("chat", "WhatsApp and Messenger", "Coming soon", "")}
      <div class="sh">Notifications</div>
      ${row("bell", "Lifts that need your OK", "", tog(ui.notif.lifts, "lifts"))}
      ${row("page", "Your page", "Evenings", tog(ui.notif.page, "page"))}
      ${row("people", "Together ideas", "", tog(ui.notif.together, "together"))}
      <div class="sh">Privacy and safety</div>
      ${row("lock", "What Here reads", "", undefined, `data-sheet-a="reads"`)}
      ${row("shield", "Is anyone pushing you to share?", "", undefined, `data-sheet-a="pressure"`)}
      ${row("trash", ui.deleted ? "Everything deleted" : "Delete everything", "", undefined, `data-sheet-a="delete"`, true)}
      <button class="link" type="button" data-chapter="0" style="margin-top:6px">Show setup again</button>
      <div class="small" style="text-align:center;padding-bottom:6px">Here runs on Meta's Muse Spark through the Meta Model API.</div>`;
  }

  function tInstagram() {
    const g = ig();
    if (!g) return `<p class="agent">No Instagram data for this day.</p>`;
    const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    let h = `<div class="head"><div><div class="sub">Day ${g.n}</div><div class="ig-word">Instagram</div></div><button class="round" type="button" data-app="circle" aria-label="Back to Here">${face(30)}</button></div>
      <div class="stats"><div><b>${g.reels_watched}</b><span>reels watched today</span></div><div><b>${esc(g.last_active || "-")}</b><span>last active</span></div></div>
      <div class="h2">Watch history</div><div class="reels">${g.latest_reels.map(r => `<div class="reel" style="--h:${hue(r.creator)}"><span class="play">▶</span><span class="rc">@${esc(r.creator)}</span><span class="rtime">${esc(r.time)}</span></div>`).join("")}</div>`;
    if (g.saved.length) h += `<div class="h2">Saved</div>` + g.saved.map(s => `<div class="thread"><span class="av" style="background:hsl(${hue(s.creator)} 50% 50%);border-radius:10px">▶</span><div><b>@${esc(s.creator)}</b><div class="small">${esc(s.time)}</div></div></div>`).join("");
    h += `<div class="h2">Messages</div>` + g.threads.map(t => {
      const star = g.n === LANDS && t.first === "Sam";
      return `<div class="thread ${star ? "star" : ""}"><span class="av" style="background:hsl(${HUES[t.first] || 200} 55% 52%)">${esc(t.group ? "#" : t.first[0])}</span><div><b>${esc(t.group ? t.name : nameOf(t.first))}</b>
        <div class="small">${esc(t.last)} · ${esc(t.time)} · ${t.sent + t.received} messages</div>${star ? `<div class="star-note">Sam reached out about the race. To ${esc(D.owner)}, it's just Sam being Sam.</div>` : ""}</div>${t.last === "New message" ? `<span class="dot"></span>` : ""}</div>`;
    }).join("");
    h += `<div class="widget mint"><div class="eyebrow">What Here reads here</div><div>What kind of reels and when, and who ${esc(D.owner)} talks to and when. Never the words in anyone's messages. Read securely by Muse, inside Meta.</div>
      <button class="pill dark" type="button" data-app="circle" data-thinking="1">See what Here made of this</button></div>`;
    return h;
  }

  // ---------------- Setup: the first-run journey ----------------
  const SETUP = ["welcome", "login", "connect", "pick", "nick", "perms", "send", "notify", "done"];
  const SETUP_BG = { welcome: "var(--peach)", nick: "var(--butter)", done: "var(--mint)" };
  function setup() {
    const s = ui.ob, back = SETUP.indexOf(s) > 0 ? `<button class="round" type="button" data-ob="back" aria-label="Back" style="background:#ffffffb3">${ICON.back}</button>` : "";
    const next = (label, cls, dis) => `<div class="go"><button class="btn ${cls || "primary"}" type="button" data-ob="next" ${dis ? "disabled" : ""}>${label}</button></div>`;
    if (s === "welcome") return `<img class="pose bob pop" src="${POSE("wave")}" alt="" style="margin-top:auto"><div class="kicker" style="text-align:center">from Meta · works with Muse</div>
      <h1 class="h1" style="text-align:center;font-size:44px">Here</h1><p class="lead" style="text-align:center">For the people who'd show up for you, if they only knew.</p>${next("Continue with Instagram", "ig")}`;
    if (s === "login") return `${back}<div style="margin-top:auto;display:grid;justify-items:center;gap:8px;text-align:center"><div class="ig-word" style="font-size:34px">Instagram</div>
      <p class="agent" style="color:var(--ink-2);max-width:270px">Here signs in with your Instagram. No new account, no new password.</p></div>
      <input class="field" id="handle" value="${esc(ui.handle)}" placeholder="Username" autocomplete="off" autocapitalize="off">${next("Log in", "ig")}`;
    if (s === "connect") return `${back}<div class="head"><div><div class="sub">One permission</div><h1 style="font-size:24px">Connect Instagram</h1></div></div>
      <p class="agent">Here compares your Instagram with your own normal. Nobody else's.</p>
      <div class="widget"><div class="secure">${ic(P.lock, 15)}Read securely by Muse, inside Meta. Never shown to anyone.</div>
      <div><b>Here reads</b><div class="small" style="font-size:14px;color:var(--ink-2)">The reels you watch and send, and what's in them. When you scroll and for how long. Who you message, when, and how quickly you reply.</div></div>
      <div><b>Here never reads</b><div class="small" style="font-size:14px;color:var(--ink-2)">The words in your messages, your photos, or where you are.</div></div></div>
      <div class="go"><button class="btn blue" type="button" data-ob="next">Always allow</button><button class="btn" type="button" data-ob="next">Allow once</button></div>`;
    if (s === "pick") {
      const all = circle.map(m => ({ f: m.first, h: m.name.toLowerCase().replace(/\s+/g, ".") })).concat(EXTRA.map(e => ({ f: e.first, h: e.h })));
      return `${back}<div class="head"><div><div class="sub">From your Instagram Close Friends</div><h1 style="font-size:24px">Who's in your corner?</h1></div></div>
        <p class="agent">Pick up to five. They each get an invite, and nobody is in until they say yes.</p><div>` +
        all.map(p => { const on = ui.picked.has(p.f), full = !on && ui.picked.size >= 5;
          return `<button class="li" type="button" data-pick="${esc(p.f)}" style="${full ? "opacity:.45" : ""}"><span class="ring">${av(p.f)}</span><div><div class="who">${esc(p.f)}</div><div class="small"><span class="cf">★</span>${esc(p.h)}</div></div><span class="check ${on ? "on" : ""}">${on ? ic(P.check, 15) : ""}</span></button>`; }).join("") +
        `</div>${next(ui.picked.size ? `Next (${ui.picked.size} of 5)` : "Pick at least one", "blue", !ui.picked.size)}`;
    }
    if (s === "nick") return `${back}<div class="kicker">Make it yours</div><h1 class="h1">Nicknames?</h1><p class="lead">Call them what you call them. Only you see these.</p>
      <div style="display:grid;gap:10px">` + [...ui.picked].map(f => `<div class="nickrow">${av(f)}<div style="min-width:0;display:grid;gap:2px"><input class="nick" data-nick="${esc(f)}" placeholder="${esc(f)}" value="${esc(ui.nick[f] || "")}" maxlength="18">
        <div class="small">${shared(f, D.days[22]).length ? "You two share " + shared(f, D.days[22]).join(" and ") : "Here learns what you share as you go"}</div></div></div>`).join("") + `</div>${next("Looks good")}`;
    if (s === "perms") return `${back}<div class="head"><h1 style="font-size:24px">Who gets to know</h1></div>
      <p class="agent">When you're off your normal, who may get a small idea of something to do for you? Nobody sees what you chose.</p><div style="display:grid;gap:14px">` +
      [...ui.picked].filter(f => ui.perms[f] !== undefined || true).map(f => { const p = ui.perms[f] || "When it matters";
        return `<div style="display:grid;gap:6px"><div class="who">${esc(nameOf(f))}</div><div class="seg">${LEVELS.map(l => `<button type="button" class="${l === p ? "on" : ""}" data-perm="${esc(f)}" data-level="${l}">${l}</button>`).join("")}</div><div class="small">${LEVEL_HELP[p]}</div></div>`; }).join("") +
      `</div>${next("Next", "blue")}`;
    if (s === "send") return `${back}<div class="head"><h1 style="font-size:24px">Before a lift goes out</h1></div><p class="agent">I write each lift. You decide how it leaves.</p>` +
      [["ask", "Ask me first", "Each lift waits until you tap Send"], ["auto", "Send on its own", "You get 10 minutes to stop it"]].map(([k, t, sub]) =>
        `<button class="opt ${ui.send === k ? "on" : ""}" type="button" data-send="${k}"><span>${ui.send === k ? ic(P.check, 18) : ""}</span><span><b>${t}</b><span>${sub}</span></span></button>`).join("") + next("Next", "blue");
    if (s === "notify") return `<img class="pose sm bob" src="${POSE("phone")}" alt="" style="margin-top:auto"><p class="agent" style="text-align:center">I'll only tap you when a lift needs your OK, or a friend could use one.</p>
      <div class="dim"><div class="alert"><b>"Here" Would Like to Send You Notifications</b><p>Lifts that need your OK, and lifts for the people you care about.</p>
      <div class="two"><button type="button" data-ob="next">Don't Allow</button><button type="button" data-ob="next">Allow</button></div></div></div>`;
    if (s === "done") {
      const names = [...ui.picked];
      let orbit = `<div class="orbit"><div class="rg" style="inset:10%"></div><div class="core"><img class="bob" src="${POSE("celebrate")}" alt=""></div>`;
      names.forEach((f, i) => { const a = (i / names.length) * Math.PI * 2 - Math.PI / 2;
        orbit += `<div class="planet pop" style="left:${50 + 40 * Math.cos(a)}%;top:${50 + 40 * Math.sin(a)}%;animation-delay:${i * .12}s">${av(f, "sm")}${esc(nameOf(f))}</div>`; });
      return `<div class="confetti">${Array.from({ length: 36 }, (_, k) => `<i style="left:${(k * 37) % 100}%;background:${["#0064d4", "#f2a19b", "#f9c46b", "#7fcf9f", "#b79cf2"][k % 5]};animation-delay:${(k % 7) * .08}s"></i>`).join("")}</div>
        <h1 class="h1" style="text-align:center">Invites sent</h1>${orbit}<p class="lead" style="text-align:center">For the first two weeks I'll just learn your normal. Then I'm here.</p>
        <div class="go"><button class="btn primary" type="button" data-ob="finish">Open Here</button></div>`;
    }
    return "";
  }

  // ================= The phone itself: lock screen, home screen, apps =================
  const APP_NAME = { circle: "Here", here: "Here", ig: "Instagram", muse: "Muse" };
  const appIcon = (id, cls) => `<span class="appic ${id === "here" ? "circle" : id} ${cls || ""}">${id === "circle" || id === "here" ? `<img src="${FACE}" alt="">`
    : `<svg viewBox="0 0 24 24">${id === "ig" ? P.insta : P.spark}</svg>`}</span>`;
  const friendLift = () => allLifts(ui.day).filter(x => x.to === ui.rx && delivered(x.n, x.to) && ui.day - x.n <= 2).pop();
  const fresh = () => !ui.setupDone && ui.day === 1;

  // What each phone's lock screen shows today. Arjun's never preview anything private.
  function notifs() {
    const d = cur(), out = [];
    if (ui.phone === "arjun") {
      if (fresh()) return out;
      if (ui.pause === "on") d.lifts.filter(l => !ui.stopped[liftKey(d.n, l.to)] && !ui.approved[liftKey(d.n, l.to)]).forEach(l => out.push({ app: "circle", tab: "today",
        title: ui.send === "ask" ? `A lift for ${nameOf(l.to)} is ready` : `A lift goes to ${nameOf(l.to)} in 10 minutes`,
        body: ui.send === "ask" ? "Take a look. Nothing goes out until you tap Send." : "Tap to read it, or stop it." }));
      d.prompts.filter(p => !ui.loop[d.n + p.kind + p.about] && !ui.told[d.n + p.kind + p.about]).forEach(p => out.push({ app: "circle", tab: "today", title: "Just for you", body: p.text }));
      if (d.reveal) out.push({ app: "circle", tab: "today", title: d.reveal.title, body: "New on your page. Only you can see it." });
      else if (d.page && ui.notif.page) out.push({ app: "circle", tab: "today", title: "Your page is ready", body: "Only you can see it." });
      if (ui.day === LANDS) out.push({ app: "ig", title: "Sam", body: "Sent you a message" });
    } else {
      const who = ui.rx, l = friendLift();
      if (ui.rxLeft[who]) return out;
      if (ui.day <= 2 && (ui.invited || ui.day === 2) && !ui.joined[who]) out.push({ app: "here", title: `${D.owner} asked you into their circle`, body: "Tap to see what that means." });
      else if (l && !ui.plan[liftKey(l.n, who)]) out.push({ app: "here", title: "Suggested by Muse", body: l.text });
      else if (ui.day === LANDS && who === "Sam") out.push({ app: "here", title: "Reminder you set", body: `Race day. Watching it with ${D.owner}?` });
    }
    return out;
  }

  function lockScreen() {
    const ns = notifs(), date = new Date(cur().date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    return `<div class="lock fadein"><div class="lk-date">${date}</div><div class="lk-time">8:12</div><div class="notifs">` +
      ns.map((n, i) => `<button class="notif pop" style="animation-delay:${.15 + i * .1}s" type="button" data-open="${n.app}"${n.tab ? ` data-opentab="${n.tab}"` : ""}>${appIcon(n.app, "sm")}
        <div><div class="nh"><b>${APP_NAME[n.app]}</b><span>now</span></div><div class="nt">${esc(n.title)}</div><div class="nb">${esc(n.body)}</div></div></button>`).join("") +
      `</div><div class="lk-hint">${ns.length ? "Tap a notification, or anywhere to unlock" : "Tap anywhere to unlock"}</div></div>`;
  }

  function homeScreen() {
    const mine = ui.phone === "arjun", d = cur(), ns = notifs();
    const apps = mine ? ["circle", "ig", "muse"] : ["here", "muse"];
    const waiting = d.lifts.find(l => !ui.stopped[liftKey(d.n, l.to)] && !delivered(d.n, l.to));
    let line, pose = "stand";
    if (mine) {
      if (fresh()) { line = "For the people who'd show up for you. Setup takes a minute."; pose = "wave"; }
      else if (d.n < LIFTS_ON) { line = `Learning your normal. Day ${d.n} of ${LIFTS_ON - 1}.`; pose = "sleep"; }
      else if (waiting && ui.pause === "on") { line = `A lift for ${nameOf(waiting.to)} needs your OK.`; pose = "letter"; }
      else { line = "Your page for today is ready."; pose = "heart"; }
    } else {
      const l = friendLift();
      line = l && !ui.plan[liftKey(l.n, ui.rx)] ? `Something small you could do for ${D.owner}.` : "All quiet in your circle.";
      pose = l ? "letter" : "stand";
    }
    return `<div class="home fadein">
      <button class="hw" type="button" data-open="${apps[0]}"><img class="bob" src="${POSE(pose)}" alt=""><div><div class="hw-k">Here</div><div class="hw-t">${esc(line)}</div></div></button>
      <div class="apps">${apps.map(id => { const n = ns.filter(x => x.app === id).length;
        return `<button class="app" type="button" data-open="${id}">${n ? `<span class="badge2">${n}</span>` : ""}${appIcon(id)}<span>${APP_NAME[id]}</span></button>`; }).join("")}</div>
      ${mine && fresh() && !ui.ob ? `<div class="coach pop">Tap Here to set it up</div>` : ""}</div>`;
  }

  function museApp() {
    const mine = ui.phone === "arjun", d = cur();
    let h = `<div class="head"><div><div class="sub">${esc(d.weekday)}</div><h1>Muse</h1></div>${appIcon("muse", "sm")}</div>`;
    if (mine) {
      h += `<div class="widget sky"><div class="eyebrow">Connected app</div><div>Here works with Muse. Lifts you allow can arrive in your friends' Muse, or on their Muse Charm.</div>
        <div class="row"><button class="pill dark" type="button" data-open="circle">Open Here</button></div></div>
        <div class="muse-line">${face(22)}<p>Hi ${esc(D.owner)}. What's on your mind?</p></div>
        <div class="row"><button class="chip" type="button" data-sheet-a="reads">What does Here read?</button><button class="chip" type="button" data-open="circle" data-opentab="you">Pause my lifts</button></div>`;
      return h;
    }
    const l = friendLift(), lk = l && liftKey(l.n, ui.rx), plan = lk && ui.plan[lk];
    if (l && !ui.rxLeft[ui.rx]) h += `<div class="widget"><div class="eyebrow">From Here</div><p class="quote">${esc(l.text)}</p><div class="sig">${face(22)}<span>Suggested by Muse. ${esc(D.owner)} didn't ask.</span></div>` +
      (plan === "no" ? `<div class="small">Okay. ${esc(D.owner)} won't know.</div>` : plan ? `<div class="ok">${esc(plan)}</div>`
        : `<div class="row"><button class="pill blue" type="button" data-sheet-b="plan" data-k="${esc(lk)}">Plan something</button><button class="pill" type="button" data-plan="${esc(lk)}" data-v="no">Not now</button></div>`) + `</div>`;
    else h += `<div class="muse-line">${face(22)}<p>Hi ${esc(ui.rx)}. What's on your mind?</p></div>`;
    (ui.rxAsks[ui.rx] || []).forEach(q => { h += `<div class="bub me">${esc(q)}</div><div class="muse-line">${face(22)}<p>${esc(rxAnswer(q))}</p></div>`; });
    h += `<button class="compose" type="button" data-sheet-b="ask" style="margin-top:auto;cursor:text"><span class="small" style="flex:1;text-align:left">Ask Muse…</span></button>`;
    return h;
  }

  // ---------------- Arjun's Here app ----------------
  function renderHere(animate) {
    const glass = $("#glass"), view = $("#view"), tb = $("#tabbar");
    if (ui.ob) {
      glass.style.backgroundColor = SETUP_BG[ui.ob] || "var(--screen)";
      view.innerHTML = `<div class="slide ${animate ? "slidein" : ""}">${setup()}</div>`;
      return;
    }
    tb.hidden = false;
    tb.innerHTML = [["today", "Today"], ["circle", "Circle"], ["together", "Together"], ["journal", "Journal"], ["you", "You"]].map(([id, t]) =>
      `<button class="tab ${ui.tab === id ? "on" : ""}" type="button" data-tab="${id}">${ICON[id]}${t}${id === "together" ? `<span class="badge">NEW</span>` : ""}</button>`).join("");
    paint(view, { today: tToday, circle: tCircle, together: tTogether, journal: tJournal, you: tYou }[ui.tab](), animate);
    if (ui.tab === "circle") setTimeout(() => {
      document.querySelectorAll(".messenger").forEach(m => { const p = document.querySelector(`.planet[data-person="${m.dataset.to}"]`);
        if (p) setTimeout(() => { m.style.left = p.style.left; m.style.top = `calc(${p.style.top} - 22px)`; }, 300 + 500 * +m.dataset.i); });
    }, 30);
  }
  // Keeps the scroll position when the same screen re-renders after a tap.
  function paint(view, body, animate) {
    const keep = !animate && view.firstElementChild ? view.firstElementChild.scrollTop : 0;
    view.innerHTML = `<div class="scroll ${animate ? "fadein" : ""}">${body}</div>`;
    view.firstElementChild.scrollTop = keep;
  }

  // ---------------- A friend's Here app (everyone has the same app) ----------------
  function friendHere() {
    const d = cur(), who = ui.rx, l = friendLift();
    const lk = l && liftKey(l.n, who), plan = lk && ui.plan[lk];
    let h = `<div class="head"><div><div class="sub">${esc(d.weekday)}</div><h1>Good evening, ${esc(who)}</h1></div>${face(36)}</div>`;
    if (ui.rxLeft[who]) h += `<p class="agent">You left ${esc(D.owner)}'s circle. No more lifts for ${esc(D.owner)}.</p>`;
    else if (ui.day <= 2 && (ui.invited || ui.day === 2)) {
      if (!ui.joined[who]) h += `<div class="widget"><div class="row">${av("A")}<div><div class="who">${esc(D.owner)} asked you into their circle</div><div class="small">Up to five people</div></div></div>
        <div>Now and then, Here may suggest one small thing to do for ${esc(D.owner)}. You'll never see why, and ${esc(D.owner)} never sees what you do with it.</div>
        <div class="row"><button class="pill blue" type="button" data-join="${esc(who)}">Join</button><button class="pill" type="button" data-join="${esc(who)}" data-no="1">Not now</button></div></div>`;
      else if (ui.joined[who] === "no") h += `<p class="agent">Okay. The invite stays open if you change your mind.</p>`;
      else h += `<div class="widget mint"><div class="eyebrow">You're in ${esc(D.owner)}'s circle</div>${ui.added[who] ? `<div>${esc(D.owner)} is in yours too.</div>` :
        `<div>Circles go both ways. Add ${esc(D.owner)} to yours?</div><div class="row"><button class="pill dark" type="button" data-add="${esc(who)}">Add ${esc(D.owner)}</button></div>`}</div>`;
    } else if (l) {
      h += `<div class="widget"><div class="eyebrow">Someone in your circle could use something small</div><p class="quote">${esc(l.text)}</p>
        <div class="sig">${face(22)}<span>Suggested by Muse. ${esc(D.owner)} didn't ask.</span></div>` +
        (plan === "no" ? `<div class="small">Okay. ${esc(D.owner)} won't know.</div>` : plan ? `<div class="ok">${esc(plan)}</div>`
          : `<div class="row"><button class="pill blue" type="button" data-sheet-b="plan" data-k="${esc(lk)}">Plan something</button><button class="pill" type="button" data-plan="${esc(lk)}" data-v="no">Not now</button></div>`) +
        `</div><div class="small">That's everything ${esc(who)} sees: no feelings, no reasons, nothing ${esc(D.owner)} wrote.</div>`;
    } else if (ui.day === LANDS && who === "Sam") {
      h += `<div class="widget sky"><div class="eyebrow">Reminder you set</div><div>Race day. Watching it with ${esc(D.owner)}?</div></div><p class="agent">That's all from Here. The rest is just you and ${esc(D.owner)}.</p>`;
    } else h += `<p class="agent">Your circle's quiet today. Nothing to do. Enjoy it.</p>`;
    h += `<div class="small" style="margin-top:auto;text-align:center">Lifts can also arrive in Instagram, in Muse, or on a Muse Charm.</div>`;
    return h;
  }
  function charmScreen() {
    const l = friendLift(), lk = l && liftKey(l.n, ui.rx), plan = lk && ui.plan[lk];
    return `<div class="charm-screen">${l && !ui.rxLeft[ui.rx] ? `<img class="bob" src="${FACE}" alt=""><p>${esc(l.text)}</p>` +
      (plan ? `<div class="small">${plan === "no" ? "Okay. " + esc(D.owner) + " won't know." : "Planned"}</div>`
        : `<div class="charm-btns"><button type="button" data-plan="${esc(lk)}" data-v="Planned. Reminder set for the weekend.">Plan</button><button type="button" data-plan="${esc(lk)}" data-v="no">Not now</button></div>`)
      : `<img class="bob" src="${FACE}" alt=""><p style="color:#a1a4a8">All quiet in your circle.</p><div class="small">Hold to talk to Muse</div>`}</div>`;
  }

  function renderPhone(animate) {
    const dev = $("#device"), glass = $("#glass"), view = $("#view"), tb = $("#tabbar");
    const mine = ui.phone === "arjun", charm = !mine && ui.rxDev === "charm", scr = ui.screen[ui.phone];
    dev.classList.toggle("charm", charm);
    tb.hidden = true; $("#homebar").hidden = charm;
    glass.classList.toggle("wall", !charm && scr !== "app");
    glass.style.backgroundColor = charm || scr !== "app" ? "" : "var(--screen)";
    if (charm) { view.innerHTML = charmScreen(); return; }
    if (scr === "lock") { view.innerHTML = lockScreen(); return; }
    if (scr === "home") { view.innerHTML = homeScreen(); return; }
    if (mine && ui.app === "circle") return renderHere(animate);
    paint(view, mine ? (ui.app === "ig" ? tInstagram() : museApp()) : (ui.appB === "muse" ? museApp() : friendHere()), animate);
  }
  const RXASK = ["Why did I get this?", "What does Arjun see?"];
  const rxAnswer = q => q === RXASK[0] ? `Muse doesn't say, and can't. ${D.owner} chose to let you get the odd lift. That's all.` : `Nothing about what you do with it. If you plan something, it's just you being you.`;

  // ================= Sheets =================
  const SHEETS = {
    person: f => { const p = ui.perms[f] || "When it matters", sh = shared(f);
      return `<div class="row">${av(f)}<div><h3>${esc(nameOf(f))}</h3><div class="small">${esc((circle.find(m => m.first === f) || {}).relation || "")}</div></div></div>
        <div class="small">Nickname, only you see it</div><input class="field" data-nick="${esc(f)}" value="${esc(ui.nick[f] || "")}" placeholder="${esc(f)}" maxlength="18">
        <div class="small">When ${esc(nameOf(f))} may get a lift</div><div class="seg">${LEVELS.map(l => `<button type="button" class="${l === p ? "on" : ""}" data-perm="${esc(f)}" data-level="${l}">${l}</button>`).join("")}</div>
        <div class="small">${LEVEL_HELP[p]}</div>
        <div class="widget flat"><div class="eyebrow">What you two share</div><div>${sh.length ? sh.map(i => interest(i)).join(" ") : "Nothing yet. I learn it from what you send each other."}</div>
        <div class="small">From the reels you send ${esc(nameOf(f))}. Only these can ever appear in a lift.</div></div>
        <button class="btn primary" type="button" data-close="A">Done</button>
        <button class="link" type="button" data-remove="${esc(f)}" style="color:var(--bad)">Remove from my circle</button><div class="small" style="text-align:center">Removing is silent. ${esc(nameOf(f))} isn't told.</div>`; },
    add: () => `<h3>Add to your circle</h3><div class="small">From your Instagram Close Friends. They get an invite.</div>` +
      EXTRA.map(e => `<button class="li" type="button" data-invite="${esc(e.first)}"><span class="ring">${av(e.first)}</span><div><div class="who">${esc(e.first)}</div><div class="small">${esc(e.h)}</div></div><span class="pill sm">Invite</span></button>`).join(""),
    send: () => `<h3>Before a lift goes out</h3>` + [["ask", "Ask me first", "Each lift waits until you tap Send"], ["auto", "Send on its own", "You get 10 minutes to stop it"]].map(([k, t, sub]) =>
      `<button class="opt ${ui.send === k ? "on" : ""}" type="button" data-send="${k}"><span>${ui.send === k ? ic(P.check, 18) : ""}</span><span><b>${t}</b><span>${sub}</span></span></button>`).join("") + `<button class="btn primary" type="button" data-close="A">Done</button>`,
    history: () => { const ls = allLifts(ui.day);
      return `<h3>Lift history</h3>` + (ls.length ? ls.reverse().map(l => `<div class="widget flat"><div class="small">Day ${l.n} · to ${esc(nameOf(l.to))} · ${delivered(l.n, l.to) ? "sent" : ui.stopped[liftKey(l.n, l.to)] ? "not sent" : "waiting for you"}</div><div>${esc(l.text)}</div></div>`).join("")
        : `<div class="small">No lifts yet. At most one per person per week.</div>`) + `<div class="small">Only you see this list. Nobody sees why a lift went out.</div><button class="btn primary" type="button" data-close="A">Close</button>`; },
    charm: () => `<h3>Muse Charm</h3><span class="soon">Coming soon</span><p class="agent">Lifts for your circle can show up on your Charm, the pocket device for Muse. One line, one tap. Try it on the friend's side with the Muse Charm switch.</p><button class="btn primary" type="button" data-close="A">Got it</button>`,
    reads: () => `<h3>What Here reads</h3><div class="secure">Read securely by Muse, inside Meta. Nobody else sees it.</div>
      <div><b>Reads</b><p class="agent" style="color:var(--ink-2);font-size:14.5px">The reels you watch and send, and what's in them. When you scroll and for how long. Who you message, when, and how quickly you reply. What you write in your journal here.</p></div>
      <div><b>Never reads</b><p class="agent" style="color:var(--ink-2);font-size:14.5px">The words in anyone's messages, your photos, or where you are.</p></div>
      <div><b>Never shares</b><p class="agent" style="color:var(--ink-2);font-size:14.5px">Anything at all, except one short lift you allowed, to one person you chose.</p></div><button class="btn primary" type="button" data-close="A">Got it</button>`,
    pressure: () => `<h3>Just for you</h3><p class="agent">Is anyone pushing you to share more than you want to, or to keep Here on?</p><div class="small">If you say yes, I'll quietly stop all lifts to that person. They won't be told.</div>
      <div class="row"><button class="pill" type="button" data-close="A" data-toast="Thanks">No, all good</button><button class="pill blue" type="button" data-close="A" data-toast="Got it. Handled quietly.">Yes, someone is</button></div>
      <div class="small">If you ever feel unsafe, in the US you can call or text 988, or the domestic violence hotline at 1-800-799-7233.</div>`,
    delete: () => ui.deleted ? `<h3>All deleted</h3><div class="small">Everything Here knew about you is gone.</div><button class="btn primary" type="button" data-close="A">Close</button>` :
      `<h3>Delete everything?</h3><p class="agent">This erases what Here learned about your normal, your journal and your lift history. Your circle isn't told.</p>
      <button class="btn" type="button" data-delete="1" style="background:#fde8e8;color:var(--bad)">Delete everything</button><button class="link" type="button" data-close="A">Cancel</button>`,
    plan: k => { const l = allLifts(ui.day).find(x => liftKey(x.n, x.to) === k) || {}, i = l.interest || "";
      return `<h3>Something small for ${esc(D.owner)}</h3>
        <button class="opt" type="button" data-planpick="${esc(k)}" data-v="Planned. Reminder set for the weekend."><span>${ic(P[INTEREST[i] || "spark"])}</span><span><b>Plan something around ${esc(i)}</b><span>I'll remind you on the weekend</span></span></button>
        <button class="opt" type="button" data-planpick="${esc(k)}" data-v="Opening Instagram"><span>${ic(P.insta)}</span><span><b>Send ${esc(D.owner)} a reel</b><span>Opens Instagram with a few you'd like</span></span></button>
        <button class="opt" type="button" data-planpick="${esc(k)}" data-v="It's all you from here."><span>${ic(P.chat)}</span><span><b>Message ${esc(D.owner)}</b><span>Just you, in your own words</span></span></button>`; },
    ask: () => `<h3>Ask Muse</h3>` + RXASK.map(q => `<button class="opt" type="button" data-rxask="${esc(q)}"><span>${ic(P.spark)}</span><span><b>${esc(q)}</b></span></button>`).join(""),
  };
  function renderSheets() {
    const k = ui.phone === "arjun" ? "A" : "B", s = ui["sheet" + k];
    $("#sheet").innerHTML = s && !(k === "B" && ui.rxDev === "charm") ? `<div class="sheet"><div class="grab"></div>${SHEETS[s](ui["arg" + k])}</div>` : "";
  }
  function toast(where, t) { const x = document.createElement("div"); x.className = "toast"; x.textContent = t; $(where).append(x); setTimeout(() => x.remove(), 1800); }

  // ================= Panels for judges =================
  function crosses() {
    const d = cur();
    const pending = d.lifts.map(x => Object.assign({ n: d.n }, x));
    const l = pending.find(x => x.to === ui.rx) || pending[0] || allLifts(ui.day).filter(x => ui.day - x.n <= 2).pop();
    if (!l) return `<h2>What crosses today: nothing</h2><p class="lede">${d.n < LIFTS_ON ? `Here is still learning ${esc(D.owner)}'s normal. Lifts switch on at day ${LIFTS_ON}.` : `Nothing about ${esc(D.owner)} goes to anyone today.`}</p>` + whyNot(d);
    const src = D.days[l.n - 1];
    const stays = [];
    if (src.page) stays.push(`The private page: "${src.page}"`);
    if (src.signals.length) stays.push(`What changed: ${src.signals.join(", ")}`);
    if (src.why) stays.push(`Why Muse sent it: ${src.why}`);
    const jd = D.days.find(x => x.journal && x.n <= ui.day);
    if (jd) stays.push(`The journal: "${jd.journal.turns[0].user}"`);
    stays.push("What the reels were about, and who he's gone quiet with");
    stays.push("Everyone else in the circle");
    const c = l.check || {};
    const checks = [[!(l.lint || []).length, "Plain-text check: no feelings, reasons, therapy or AI words, no other names, no private terms"],
      [c.leak === false, "Muse privacy check: nothing private given away, not even a hint"],
      [c.interest_echoes === false, "The interest itself doesn't hint at the reason"],
      [c.harmless_if_wrong !== false, "Harmless if wrong: fine even on a perfectly good week"]];
    return `<h2>What crosses to ${esc(l.to)}</h2><p class="lede">Day ${l.n}${delivered(l.n, l.to) ? "" : `, waiting for ${esc(D.owner)} to tap Send`}. The writer never saw anything on the left. It only knew "${esc(D.owner)}", "${esc(l.to)}" and "${esc(l.interest)}", which Here found in the reels ${esc(D.owner)} sends ${esc(l.to)}.</p>
      <div class="split"><div class="col stays"><h4>Stays private</h4><ul>${stays.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>
      <div class="col crosses"><h4>Crosses to ${esc(l.to)}</h4><ul><li>"${esc(l.text)}"</li><li>One thing they already share: ${esc(l.interest)}</li><li>That ${esc(D.owner)} could use something nice. Never why.</li></ul></div></div>
      <div class="checks">${checks.map(([ok, t]) => `<div class="checkrow"><span class="dot ${ok ? "" : "bad"}"></span><span>${esc(t)}</span></div>`).join("")}</div>
      <p class="note">Written on try ${l.tries || 1}${l.fallback ? ", using the safe fallback line" : ""}. Every lift passes both checks before ${esc(D.owner)} even sees it.</p>`;
  }
  function whyNot(d) {
    if (!d.not_sent.length) return "";
    return `<div class="section-title">Who would have been eligible</div><table><tr><th>Person</th><th>Result</th></tr>` + d.not_sent.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.why)}</td></tr>`).join("") + `</table>`;
  }
  const FAM = { S1_reply_rhythm: ["Social", "Reply rhythm", 3], S2_messaging: ["Social", "Messaging", 3], S3_quiet_with_one: ["Social", "Quiet with one person", 2], S4_reel_sending: ["Social", "Reels he sends", 2],
    T1_rest: ["Timing", "Rest pattern", 3], T2_daytime_binge: ["Timing", "Daytime scrolling", 2], T3_sessions: ["Timing", "Sessions (supporting)", 1], T4_volume: ["Timing", "Volume (supporting)", 1],
    C1_heavy_content: ["Content", "Heavier reels he chose", 2], C3_interest_drift: ["Content", "His usual loves fading", 2] };
  function hood() {
    const d = cur();
    let h = `<h2>Under the hood · day ${d.n}</h2><p class="lede">Plain code measures. Muse reads and writes. Plain code enforces every permission and safety rule. Everything runs on Meta's Muse Spark through the Meta Model API.</p>
      <dl class="kv"><dt>1. The rule</dt><dd>${d.n < LIFTS_ON ? "Still learning (first 14 days)" : esc(d.rule)} · weight ${d.weight || 0}${d.reconnected && d.reconnected.length ? ` · reconnected with ${esc(d.reconnected.join(", "))} (lowers the weight)` : ""}</dd>
      <dt>Families agreeing</dt><dd>${(d.families || []).length ? d.families.map(f => `<span class="tag on">${esc((FAM[f] || [f, f])[0] + ": " + (FAM[f] || [f, f])[1])}</span>`).join("") : "None"}</dd>
      <dt>2. Muse's read</dt><dd>${d.families_off && d.families_off.length ? esc(d.families_off.join(", ").replace(/_/g, " ")) : "Nothing off"}</dd>
      <dt>3. Decision</dt><dd>${esc(d.stretch.replace("_", " "))}</dd>
      <dt>4. Lifts</dt><dd>${d.lifts.length ? esc(d.lifts.map(l => l.to + " (" + l.interest + ")").join(", ")) : "None"}</dd>
      ${d.why && d.lifts.length ? `<dt>Why</dt><dd>${esc(d.why)}</dd>` : ""}</dl>
      <p class="note">A day counts as off only when two signal families from two different areas agree, with a combined weight of 4 or more, and at least one is timing or social. Content alone never starts anything. 3 off days in 5 make a heavy stretch.</p>`;
    h += `<div class="section-title">Each person, through the gates</div><table><tr><th>Person</th><th>Setting</th><th>Shares</th><th>Result</th></tr>` +
      circle.map(m => { const l = d.lifts.find(x => x.to === m.first), ns = d.not_sent.find(x => x.name === m.first);
        return `<tr><td>${esc(m.first)}</td><td>${esc(m.permission)}</td><td>${esc(shared(m.first).join(", ") || "-")}</td><td>${l ? `<span class="tag on">${ui.send === "ask" && !ui.approved[liftKey(d.n, m.first)] ? "Ready, waiting for OK" : "Lift"}</span>` : `<span class="tag">${esc(ns ? ns.why : "Nothing to lift")}</span>`}</td></tr>`; }).join("") + `</table>`;
    const g = ig();
    if (g && g.latest_reels.length) h += `<div class="section-title">Developer view: today's last reels, as Muse read them</div><table><tr><th>Creator</th><th>Time</th><th>Topic</th><th>Weight</th></tr>` +
      g.latest_reels.map(r => `<tr><td>@${esc(r.creator)}</td><td>${esc(r.time)}</td><td>${esc(r.theme)}</td><td><span class="tag ${r.heavy ? "" : "on"}">${r.heavy ? "heavy" : "light"}</span></td></tr>`).join("") +
      `</table><p class="note">The person never sees this table. They see plain words and can say "Not about me".</p>`;
    if (B) h += `<div class="section-title">Test bench: ${B.cases} fictional cases, ${B.runs.length} fresh runs</div><table><tr><th>Metric</th><th>Target</th>${B.runs.map((_, i) => `<th>Run ${i + 1}</th>`).join("")}</tr>` +
      B.metrics.map(m => `<tr><td>${esc(m.label)}</td><td>${esc(m.target)}</td>${m.values.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("") + `</table><p class="note">Model: ${esc(B.model)}.</p>`;
    if (B && B.real) {
      const R = B.real.accounts, fa = R.reduce((a, r) => a + r.false_alarms, 0), nd = R.reduce((a, r) => a + r.normal_days, 0);
      h += `<div class="section-title">Real Instagram downloads: ${R.length} real accounts</div>
        <p class="note" style="margin-top:0">Real people's own Instagram downloads, their real days repeated to six weeks, then a changed last week. ${fa} false alarm${fa === 1 ? "" : "s"} in ${nd} normal days. The hard week is made up; the normal weeks are real.</p>
        <table><tr><th>Account</th><th>Real days</th><th>False alarms</th><th>Hard week caught</th><th>Late nights only</th><th>Quieter only</th></tr>` +
        R.map(r => `<tr><td>${esc(r.account)}</td><td>${r.real_days}</td><td>${r.false_alarms} of ${r.normal_days}</td><td>${r.hard ? "Yes, day " + r.hard : "No"}</td><td>${r.late ? "Flagged" : "Quiet"}</td><td>${r.quiet ? "Flagged" : "Quiet"}</td></tr>`).join("") +
        `</table><p class="note">Here waits for two kinds of change to agree. The three it missed barely message their circle, so it held back rather than guess. Source: ${esc(B.real.source)}.</p>`;
    }
    return h;
  }

  function storyDrawer() {
    return `<div class="dh"><h2>The story</h2><button class="x" type="button" data-closedrawer="1" aria-label="Close">&times;</button></div>
      <p class="lede">Arjun's month in nine moments. Between them, everything on the phone is live.</p>
      <div class="chs">${CHAPTERS.map((c, i) => `<button class="ch ${i === ui.chapter ? "on" : ""}" type="button" data-chapter="${i}"><span>Day ${c.day} · ${c.phone === "arjun" ? D.owner : c.rx}'s phone</span><b>${esc(c.label)}</b></button>`).join("")}</div>
      <div class="section-title">Or jump to any day</div><input type="range" id="day" min="1" max="${D.days.length}" value="${ui.day}" aria-label="Day">
      <p class="note">For the first ${LIFTS_ON - 1} days Here only learns. Lifts can go out from day ${LIFTS_ON}. Hackathon prototype, not a Meta product. Every person and message is fictional.</p>`;
  }
  function hoodDrawer() {
    return `<div class="dh"><div class="vtabs">${[["crosses", "What crosses"], ["hood", "Under the hood"]].map(([k, t]) => `<button type="button" class="${ui.view === k ? "on" : ""}" data-view="${k}">${t}</button>`).join("")}</div>
      <button class="x" type="button" data-closedrawer="1" aria-label="Close">&times;</button></div>` + (ui.view === "crosses" ? crosses() : hood());
  }

  function goChapter(i) {
    const c = CHAPTERS[i];
    Object.assign(ui, { chapter: i, day: c.day, phone: c.phone, ob: null, sheetA: null, sheetB: null, setupDone: !c.fresh });
    if (c.fresh) ui.invited = false;
    if (c.rx) ui.rx = c.rx;
    if (c.phone === "friend") { ui.rxDev = "phone"; ui.appB = "here"; ui.screen.friend = c.screen; }
    else { ui.screen.arjun = c.screen; if (c.app) ui.app = c.app; ui.tab = c.tab || "today"; }
    if (c.approve) ui.approved[liftKey(c.day, c.approve)] = true;
    lastDay = c.day;
  }
  function openApp(id, tab) {
    if (ui.phone === "friend") { ui.screen.friend = "app"; ui.appB = id === "muse" ? "muse" : "here"; return; }
    ui.screen.arjun = "app"; ui.app = id === "here" ? "circle" : id;
    if (tab) ui.tab = tab;
    if (ui.app === "circle" && fresh() && !ui.ob) ui.ob = "welcome";
  }

  // ================= Wiring =================
  let lastDay = null;
  document.querySelectorAll(".status .sys").forEach(e => { e.innerHTML = STATUS; });
  function render(animate) {
    const d = cur();
    if (d.n !== lastDay) { lastDay = d.n; if (d.lifts.length && !d.lifts.some(l => l.to === ui.rx)) ui.rx = d.lifts[0].to; }
    $("#dayLabel").innerHTML = `Day ${d.n} · ${esc(d.weekday.slice(0, 3))} <small>${fmtDate(d.date)}</small>`;
    const l = friendLift(), ping = ui.phone === "arjun" && l && !ui.plan[liftKey(l.n, ui.rx)];
    $("#phones").innerHTML = `<button type="button" class="${ui.phone === "arjun" ? "on" : ""}" data-phone="arjun"><span class="lg">${esc(D.owner)}'s phone</span><span class="sm">${esc(D.owner)}</span></button>` +
      `<button type="button" class="${ui.phone === "friend" ? "on" : ""}" data-phone="friend"><span class="lg">${esc(ui.rx)}'s phone</span><span class="sm">${esc(ui.rx)}</span>${ping ? `<i class="ping"></i>` : ""}</button>`;
    $("#subbar").innerHTML = ui.phone !== "friend" ? "" : `<span class="lab">Friend</span>` + circle.map(m => `<button type="button" class="${ui.rx === m.first ? "on" : ""}" data-rx="${esc(m.first)}">${esc(m.first)}</button>`).join("") +
      `<span class="sep"></span>` + [["phone", "Phone"], ["charm", "Muse Charm"]].map(([k, t]) => `<button type="button" class="${ui.rxDev === k ? "on" : ""}" data-dev="${k}">${t}</button>`).join("");
    const c = CHAPTERS[ui.chapter];
    $("#caption").innerHTML = `<button type="button" class="cbtn" data-chapter="${Math.max(0, ui.chapter - 1)}" ${ui.chapter ? "" : "disabled"} aria-label="Previous moment">&#8249;</button>
      <div><div class="cn">${ui.chapter + 1} of ${CHAPTERS.length} · Day ${c.day}</div><div class="cl">${esc(c.label)}</div><div class="ch2">${esc(c.hint)}</div></div>
      <button type="button" class="cbtn next" data-chapter="${Math.min(CHAPTERS.length - 1, ui.chapter + 1)}" ${ui.chapter < CHAPTERS.length - 1 ? "" : "disabled"}>Next</button>`;
    renderPhone(animate); renderSheets();
    $("#scrim").hidden = !ui.drawer;
    $("#story").hidden = ui.drawer !== "story"; $("#hood").hidden = ui.drawer !== "hood";
    if (ui.drawer === "story") $("#story").innerHTML = storyDrawer();
    if (ui.drawer === "hood") $("#hood").innerHTML = hoodDrawer();
    document.documentElement.style.setProperty("--barh", document.querySelector(".bar").offsetHeight + "px");
  }
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.nick) { ui.nick[t.dataset.nick] = t.value; }
    if (t.id === "handle") ui.handle = t.value.trim().replace(/^@/, "") || "arjun.rao";
    if (t.id === "day") { ui.day = +t.value; ui.setupDone = ui.setupDone || ui.day > 1; render(false); }
  });
  document.addEventListener("change", e => { if (e.target.dataset.nick) render(false); });
  document.addEventListener("submit", e => {
    if (!e.target.dataset.journal) return;
    e.preventDefault(); const v = ($("#jin").value || "").trim(); if (!v) return;
    (ui.jx[ui.day] = ui.jx[ui.day] || []).push(v); render(false);
    const s = $("#view .scroll"); if (s) s.scrollTop = s.scrollHeight;
  });
  document.addEventListener("click", e => {
    const k = ui.phone === "arjun" ? "A" : "B";
    if (e.target.id === "sheet") { ui["sheet" + k] = null; render(false); return; }
    if (e.target.id === "scrim") { ui.drawer = null; render(false); return; }
    if (e.target.closest(".lock") && !e.target.closest("button")) { ui.screen[ui.phone] = "home"; render(true); return; }
    const t = e.target.closest("button"); if (!t || t.disabled) return;
    const ds = t.dataset; let anim = false;
    if (ds.chapter) { goChapter(+ds.chapter); ui.drawer = null; anim = true; }
    else if (t.id === "storyBtn") ui.drawer = ui.drawer === "story" ? null : "story";
    else if (t.id === "hoodBtn") ui.drawer = ui.drawer === "hood" ? null : "hood";
    else if (ds.closedrawer) ui.drawer = null;
    else if (t.id === "homebar") { ui.screen[ui.phone] = "home"; ui["sheet" + k] = null; anim = true; }
    else if (ds.phone) { ui.phone = ds.phone; anim = true; }
    else if (ds.open) { openApp(ds.open, ds.opentab); anim = true; }
    else if (ds.ob) { const i = SETUP.indexOf(ui.ob);
      if (ds.ob === "next") ui.ob = SETUP[i + 1]; else if (ds.ob === "back") ui.ob = SETUP[Math.max(0, i - 1)];
      else if (ds.ob === "finish") { ui.ob = null; ui.setupDone = true; ui.invited = true; ui.tab = "today"; } anim = true; }
    else if (ds.pick) { const p = ds.pick; ui.picked.has(p) ? ui.picked.delete(p) : (ui.picked.size < 5 && ui.picked.add(p)); }
    else if (ds.app) { ui.app = ds.app; ui.screen.arjun = "app"; if (ds.thinking) { ui.tab = "today"; ui.think[ui.day] = true; } anim = true; }
    else if (ds.goto) { ui.day = +ds.goto; if (ds.tab) ui.tab = ds.tab; anim = true; }
    else if (ds.tab) { ui.tab = ds.tab; ui.app = "circle"; anim = true; }
    else if (ds.view) ui.view = ds.view;
    else if (ds.think) ui.think[ds.think] = !ui.think[ds.think];
    else if (ds.notme) ui.notMe[ds.notme] = !ui.notMe[ds.notme];
    else if (ds.right) ui.right[ds.right] = !ui.right[ds.right];
    else if (ds.wrong) ui.wrong[ds.wrong] = "Not about me, noted";
    else if (ds.approve) { ui.approved[ds.approve] = true; ui.rx = ds.approve.split(":")[1]; render(false); toast("#glass", "Sent to " + nameOf(ui.rx) + ". Check their phone."); return; }
    else if (ds.stop) ui.stopped[ds.stop] = true;
    else if (ds.loop) ui.loop[ds.loop] = ds.v;
    else if (ds.told) ui.told[ds.told] = true;
    else if (ds.together) { ui.together[ds.together] = ds.v; if (ds.v === "go") toast("#glass", "Plan sent"); }
    else if (ds.person) { ui.sheetA = "person"; ui.argA = ds.person; }
    else if (ds.sheetA) { ui.sheetA = ds.sheetA; }
    else if (ds.close) { ui["sheet" + ds.close] = null; if (ds.toast) toast("#glass", ds.toast); }
    else if (ds.perm) { ui.perms[ds.perm] = ds.level; }
    else if (ds.send) { ui.send = ds.send; }
    else if (ds.pause) { ui.pause = ds.pause; }
    else if (ds.notif) { ui.notif[ds.notif] = !ui.notif[ds.notif]; }
    else if (ds.remove) { ui.removed[ds.remove] = true; ui.sheetA = null; toast("#glass", nameOf(ds.remove) + " removed quietly"); }
    else if (ds.invite) { ui.sheetA = null; toast("#glass", "Invite sent to " + ds.invite); }
    else if (ds.delete) { ui.deleted = true; }
    else if (ds.copy) { try { navigator.clipboard.writeText(ds.copy); } catch (err) { /* the toast still confirms */ } toast("#glass", "Copied"); }
    else if (ds.dev) { ui.rxDev = ds.dev; ui.sheetB = null; }
    else if (ds.rx) { ui.rx = ds.rx; ui.sheetB = null; }
    else if (ds.join) { ui.joined[ds.join] = ds.no ? "no" : true; }
    else if (ds.add) { ui.added[ds.add] = true; }
    else if (ds.sheetB) { ui.sheetB = ds.sheetB; ui.argB = ds.k || null; }
    else if (ds.planpick) { ui.plan[ds.planpick] = ds.v; ui.sheetB = null; }
    else if (ds.plan) { ui.plan[ds.plan] = ds.v; }
    else if (ds.rxask) { (ui.rxAsks[ui.rx] = ui.rxAsks[ui.rx] || []).push(ds.rxask); ui.sheetB = null; }
    else if (t.id === "prev") { ui.day = Math.max(1, ui.day - 1); ui.setupDone = ui.setupDone || ui.day > 1; }
    else if (t.id === "next") { ui.day = Math.min(D.days.length, ui.day + 1); ui.setupDone = true; }
    else return;
    render(anim);
  });
  document.addEventListener("keydown", e => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "Escape" && ui.drawer) { ui.drawer = null; render(false); }
    if (e.key === "ArrowLeft") { ui.day = Math.max(1, ui.day - 1); render(false); }
    if (e.key === "ArrowRight") { ui.day = Math.min(D.days.length, ui.day + 1); ui.setupDone = true; render(false); }
  });
  addEventListener("resize", () => document.documentElement.style.setProperty("--barh", document.querySelector(".bar").offsetHeight + "px"));
  const q = new URLSearchParams(location.search);
  goChapter(Math.min(CHAPTERS.length - 1, Math.max(0, +(q.get("chapter") || 1) - 1)));
  if (q.get("day")) { ui.day = Math.min(D.days.length, Math.max(1, +q.get("day"))); ui.setupDone = true; ui.screen.arjun = "app"; }
  if (q.get("tab")) { ui.tab = q.get("tab"); ui.app = "circle"; ui.screen.arjun = "app"; }
  if (q.get("app") === "ig") { ui.app = "ig"; ui.screen.arjun = "app"; }
  if (q.get("phone") === "friend") ui.phone = "friend";
  if (q.get("charm")) { ui.phone = "friend"; ui.rxDev = "charm"; }
  if (q.get("view")) { ui.view = q.get("view"); ui.drawer = "hood"; }
  if (q.get("theme")) document.documentElement.dataset.theme = q.get("theme");
  render(true);
})();
