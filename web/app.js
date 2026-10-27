// Muse Circle prototype screens, drawn as a space inside Muse. Reads window.DEMO
// (scripts/run_demo.py), window.BENCH (bench/export_web.py) and window.IG
// (scripts/export_instagram.py). No network calls.

(function () {
  // Safari mis-aims clicks and scrolling inside 3D-tilted elements, so the phones stay flat there.
  if (/^((?!chrome|chromium|android|crios|edg).)*safari/i.test(navigator.userAgent)) document.documentElement.classList.add("safari");
  const D = window.DEMO;
  const B = window.BENCH || null;
  const IG = window.IG || { days: [] };
  const circle = D.settings.circle.map(m => Object.assign({ first: m.name.split(" ")[0] }, m));
  const LEVELS = ["Always", "When it matters", "Just this once", "Never"];
  const ui = {
    day: 26, tab: "today", view: "crosses", rx: "Sam", app: "muse",
    wrong: {}, right: {}, stopped: {}, perms: {}, interests: {}, pause: "on", told: {}, loop: {},
    send: D.settings.send_mode === "automatic" ? "auto" : "ask", approved: {},
    think: {}, sheet: null, sheetWho: null, sheetB: null,
    picked: new Set(circle.map(m => m.first)), invited: false, joined: {}, added: {}, left: {},
    plan: {}, asks: {}, rxAsks: {}, flash: null, editing: false, kept: false,
    ob: null, igConn: null, notif: null, rxDev: "phone",
  };
  circle.forEach(m => { ui.perms[m.first] = m.permission; ui.interests[m.first] = new Set(m.allowed_interests || D.interests); });

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cur = () => D.days[ui.day - 1];
  const ig = () => IG.days[ui.day - 1];
  const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const liftKey = (n, to) => n + ":" + to;
  const liftTime = n => ["8:52 PM", "9:14 PM", "7:40 PM", "9:03 PM"][n % 4];
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LIFTS_ON = D.settings.lifts_switch_on_day || 7;
  const LANDS = 28;  // the day Sam acts on his lift in the demo story

  // The story, start to finish. Each step just moves the screens to the right place.
  const CHAPTERS = [
    { day: 1, label: "Arjun sets up Circle", app: "muse", tab: "today", rx: "Sam", ob: "welcome" },
    { day: 2, label: "Sam says yes", app: "muse", tab: "today", rx: "Sam" },
    { day: LIFTS_ON, label: "Lifts switch on", app: "muse", tab: "today", rx: "Sam" },
    { day: 23, label: "A rough night on Instagram", app: "ig", tab: "today", rx: "Sam" },
    { day: 23, label: "Muse writes a lift", app: "muse", tab: "today", rx: "Sam" },
    { day: LANDS, label: "Sam shows up", app: "ig", tab: "today", rx: "Sam" },
    { day: LANDS, label: "How did that feel?", app: "muse", tab: "journal", rx: "Sam" },
  ];

  // Plain line icons, drawn here so nothing is borrowed from Meta's own artwork.
  const svg = (p, extra) => `<svg class="i ${extra || ""}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const small = s => s.replace('class="i ', 'style="width:14px;height:14px" class="i ');
  const I = {
    menu: svg(`<path d="M5 9h14M5 15h14"/>`),
    compose: svg(`<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M17.5 3.5l3 3L12 15l-4 1 1-4z"/>`),
    more: svg(`<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>`),
    plus: svg(`<path d="M12 5v14M5 12h14"/>`),
    mic: svg(`<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>`),
    wave: svg(`<path d="M6 10v4M10 7v10M14 9v6M18 11v2"/>`),
    spark: svg(`<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" fill="currentColor" stroke="none"/>`, "spark"),
    chev: small(svg(`<path d="M9 6l6 6-6 6"/>`)),
    down: small(svg(`<path d="M6 9l6 6 6-6"/>`)),
    check: svg(`<path d="M5 12.5l4.5 4.5L19 7.5"/>`),
    up: svg(`<path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/>`),
    thumbDown: svg(`<g transform="rotate(180 12 12)"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/></g>`),
    copy: svg(`<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>`),
    power: svg(`<path d="M12 3v8M6.3 7a8 8 0 1 0 11.4 0"/>`),
    shield: svg(`<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>`),
    play: svg(`<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>`),
    eye: svg(`<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`),
    phone: svg(`<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/>`),
    exit: svg(`<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>`),
  };
  const STATUS = `<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg viewBox="0 0 16 12"><path d="M8 12l2.4-2.9a3.4 3.4 0 0 0-4.8 0z"/><path d="M8 5.6c2 0 3.8.8 5.1 2l1.4-1.6A9.6 9.6 0 0 0 8 3.4 9.6 9.6 0 0 0 1.5 6l1.4 1.6A7.4 7.4 0 0 1 8 5.6z"/></svg>
    <svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="23" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="20" height="8" rx="1.9"/><rect x="24.6" y="4" width="1.8" height="4" rx=".9" opacity=".45"/></svg>`;

  // A lift reaches the friend only if it wasn't stopped, lifts aren't paused, and,
  // when the person chose "Ask me first", they tapped Send.
  const delivered = (n, to) => !ui.stopped[liftKey(n, to)] && ui.pause === "on" && (ui.send === "auto" || ui.approved[liftKey(n, to)]);

  function allLifts(upto) {
    const out = [];
    D.days.slice(0, upto).forEach(d => d.lifts.forEach(l => out.push(Object.assign({ n: d.n, weekday: d.weekday, why: d.why }, l))));
    return out.filter(l => delivered(l.n, l.to));
  }

  // Muse's own little character carries every lift: cream, fuzzy, rosy-cheeked, always smiling.
  // Drawn here from public descriptions, not taken from Meta's artwork.
  document.body.insertAdjacentHTML("beforeend", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <filter id="fuzz" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/></filter>
    <radialGradient id="fur" cx="42%" cy="34%" r="70%"><stop offset="0" stop-color="#fbf5ea"/><stop offset=".7" stop-color="#f1e5d1"/><stop offset="1" stop-color="#e2d1b6"/></radialGradient></defs></svg>`);
  // For a local recording, drop your own avatar image at web/assets/avatar.png and it replaces the drawing.
  // The file is gitignored, so it never goes into the public repo or the published page.
  let AVATAR = null;
  const probe = new Image();
  probe.onload = () => { AVATAR = probe.src; render(); };
  probe.src = "assets/avatar.png";
  function face(size, extra) {
    if (AVATAR) return `<img class="face ${extra || ""}" src="${AVATAR}" alt="" style="width:${size}px;height:${size}px;object-fit:contain">`;
    return `<svg class="face ${extra || ""}" viewBox="0 0 60 60" style="width:${size}px;height:${size}px" aria-hidden="true">
      <g filter="url(#fuzz)" fill="url(#fur)"><path d="M27.5 14.5c-.6-4.2 1.6-7.4 5.2-8.2-1.3 2.4-1.2 4.8.4 7.6"/><ellipse cx="30" cy="34" rx="23" ry="21.5"/></g>
      <ellipse class="cheek" cx="18.5" cy="39" rx="4.6" ry="3"/><ellipse class="cheek" cx="41.5" cy="39" rx="4.6" ry="3"/>
      <g class="eyes"><ellipse cx="23.5" cy="31.5" rx="2.5" ry="3.1"/><ellipse cx="36.5" cy="31.5" rx="2.5" ry="3.1"/></g>
      <path class="mouth" d="M26.5 38.5q3.5 3.6 7 0"/></svg>`;
  }

  const greet = () => "Good evening";  // lifts land around 9 PM in the demo
  const pauseLabel = () => ({ on: "On", day: "Paused today", week: "Paused this week" })[ui.pause];
  const sendLabel = () => ui.send === "ask" ? "Ask me first" : "Send on its own";
  const flash = (k, text) => ui.flash && ui.flash.k === k ? `<span class="flash">${esc(text)}</span>` : "";
  const copy = text => { try { navigator.clipboard.writeText(text); } catch (e) { /* the label still confirms */ } };

  // ---------------- Arjun's Muse ----------------
  function today() {
    const d = cur(); let h = "";
    const thoughts = [];
    if (d.n < LIFTS_ON) thoughts.push(`Still learning your normal: day ${d.n} of ${LIFTS_ON}. Lifts switch on at day ${LIFTS_ON}.`);
    else if (d.signals.length && d.rule !== "normal") thoughts.push(`Compared with your own normal: ${d.signals.join(", ")}.`);
    else thoughts.push("Nothing off your normal today.");
    if (d.why && d.lifts.length) thoughts.push(`Why a lift: ${d.why}`);
    thoughts.push("Nothing here was sent to anyone.");
    h += `<button class="think" data-think="${d.n}">${I.spark} Show thinking ${ui.think[d.n] ? I.down : I.chev}</button>`;
    if (ui.think[d.n]) h += `<div class="thought">${thoughts.map(t => `<div>${esc(t)}</div>`).join("")}<button class="btn small link" data-app="ig" style="justify-self:start;padding-left:0">See the Instagram behind this ${I.chev}</button></div>`;

    h += `<p class="hello">${greet()}, ${esc(D.owner)}.${d.page ? "" : d.n < LIFTS_ON ? " Muse is still getting to know your normal." : ""}</p>`;

    d.cards.forEach(c => { h += `<div class="widget tone-warn"><div class="eyebrow">Just for you</div><p style="margin-top:4px">${esc(c.text)}</p></div>`; });

    if (d.page) {
      const k = "page" + d.n, w = ui.wrong[k];
      h += `<p class="agent">${esc(d.page)}</p>`;
      if (w === "open") {
        h += `<div class="row" style="margin-top:-6px">${["Late is normal for me", "Not what it was about", "Something else"].map(r =>
          `<button class="btn small" data-wrong-reason="${esc(r)}" data-k="${k}">${esc(r)}</button>`).join("")}</div>`;
      } else if (w) {
        h += `<div class="thanks" style="margin-top:-6px">Got it: "${esc(w)}". Nothing was sent to anyone. Muse will weigh that from now on.</div>`;
      } else {
        h += `<div class="fb" style="margin-top:-6px"><button class="${ui.right[k] ? "on" : ""}" data-right="${k}" aria-label="That's right">${I.up}</button><button data-wrong="${k}" aria-label="That's wrong">${I.thumbDown}</button><button data-copy="${k}" aria-label="Copy">${I.copy}</button>${flash(k, "Copied")}</div>`;
      }
    }

    d.lifts.forEach(l => {
      const k = liftKey(d.n, l.to);
      const head = title => `<div class="top-row">${face(32)}<div><div class="who">${title}</div><div class="sub">${esc(l.interest)} · ${esc(ui.perms[l.to])}</div></div></div>`;
      if (ui.stopped[k]) {
        h += `<div class="widget"><p>${ui.send === "ask" ? "Not sent" : "Stopped"}. Nothing went to ${esc(l.to)}, and ${esc(l.to)} won't know.</p></div>`;
      } else if (ui.pause !== "on") {
        h += `<div class="widget"><p class="muted">Lifts are paused. Nothing will go out.</p></div>`;
      } else if (ui.send === "ask" && ui.approved[k]) {
        h += `<div class="widget" id="lift-${esc(k)}">${head(`Sent to ${esc(l.to)}`)}<p class="quote">"${esc(l.text)}"</p>
          <div class="row"><button class="btn small link" data-see="${esc(l.to)}">See what crosses</button></div></div>`;
      } else if (ui.send === "ask") {
        h += `<div class="widget" id="lift-${esc(k)}">${head(`A lift for ${esc(l.to)} is ready`)}<p class="quote">"${esc(l.text)}"</p>
          <div class="row"><button class="btn primary" data-approve="${esc(k)}">Send</button><button class="btn" data-stop="${esc(k)}">Not this one</button><button class="btn small link" data-see="${esc(l.to)}">See what crosses</button></div>
          <div class="note">Nothing goes to ${esc(l.to)} until you tap Send. If you skip it, ${esc(l.to)} never knows.</div></div>`;
      } else {
        h += `<div class="widget" id="lift-${esc(k)}">${head(`Sending to ${esc(l.to)} in 10 minutes`)}<p class="quote">"${esc(l.text)}"</p>
          <div class="row"><button class="btn" data-stop="${esc(k)}">Stop it</button><button class="btn small link" data-see="${esc(l.to)}">See what crosses</button></div>
          <div class="note">You don't need to do anything.</div></div>`;
      }
    });

    if (d.reveal) {
      h += `<div class="widget tone-blue"><div class="eyebrow">New today · ${esc(d.reveal.title)}</div><p style="margin-top:4px">${esc(d.reveal.text)}</p>`;
      if (d.reveal.suggested) {  // day 1: Arjun chooses his circle and invites them
        h += `<div class="row">${d.reveal.suggested.map(n => `<button class="chip ${ui.picked.has(n) ? "on" : ""}" data-pick="${esc(n)}">${esc(n)}</button>`).join("")}</div>`;
        h += ui.invited
          ? `<div class="thanks">Invites sent to ${esc(joinNames([...ui.picked]))}. Nobody is in until they say yes.</div>`
          : `<div class="row"><button class="btn primary small" data-invite="1" ${ui.picked.size ? "" : "disabled"}>Invite ${ui.picked.size}</button></div>`;
      } else if (d.reveal.interests) {
        h += `<div class="row">${d.reveal.interests.map(n => `<span class="chip">${esc(n)}</span>`).join("")}</div>`;
      }
      h += `</div>`;
    }

    if (d.n > LIFTS_ON && d.signals.length && d.rule !== "normal") {
      const w = ui.wrong["off" + d.n];
      h += `<div class="widget tone-sun"><div class="eyebrow">Just for you · a little off your normal</div><p style="margin-top:4px">${esc(cap(d.signals.join(", ")))}.</p>`;
      h += w ? `<div class="thanks">Thanks. Muse won't count that next time.</div>`
             : `<div class="row"><button class="btn small" data-wrong="off${d.n}" data-quick="1">That's wrong</button></div>`;
      h += `<div class="note">Nothing was sent to anyone. Only you see this, compared with your own normal.</div></div>`;
    }

    d.prompts.forEach(p => {
      h += `<p class="agent">${esc(p.text)}</p>`;
      if (p.kind === "close_the_loop") {
        const done = ui.loop[d.n + p.about];
        h += done ? `<div class="thanks" style="margin-top:-6px">Noted: "${esc(done)}". Only you see this.</div>` :
          `<div class="row" style="margin-top:-6px">${["Loved it", "It was nice", "A bit much"].map(o => `<button class="btn small" data-loop="${esc(d.n + p.about)}" data-v="${o}">${o}</button>`).join("")}</div>`;
      } else {
        const done = ui.told[d.n + p.kind + p.about];
        h += done ? `<div class="thanks" style="margin-top:-6px">Okay.</div>` :
          `<div class="row" style="margin-top:-6px"><button class="btn small" data-told="${esc(d.n + p.kind + p.about)}">${p.kind === "tell_them" ? "Tell them" : "Yes"}</button><button class="btn small" data-told="${esc(d.n + p.kind + p.about)}">Not now</button></div>`;
      }
    });

    (ui.asks[d.n] || []).forEach(q => { h += `<div class="bubble me">${esc(q)}</div><p class="agent">${esc(answer(q, d))}</p>`; });

    if (!d.page && !d.reveal && !d.lifts.length && !d.prompts.length && !d.cards.length && !(ui.asks[d.n] || []).length) h += `<p class="agent muted">Nothing else today. Enjoy it.</p>`;
    return h;
  }

  // "Ask Muse" questions, answered from this day's real demo data (no model call in the page).
  const ASK = ["Why did Muse send a lift today?", "What did you notice about me?", "Who can get a lift from me?", "What do you read on my Instagram?"];
  function answer(q, d) {
    if (q === ASK[0]) {
      if (!d.lifts.length) {
        if (d.n < LIFTS_ON) return `None today. I'm still learning your normal, and lifts switch on at day ${LIFTS_ON}.`;
        const why = d.not_sent.find(x => x.why !== "Nothing to lift");
        return why ? `No lift today. For ${why.name}: ${why.why.toLowerCase()}.` : "No lift today. Nothing looked off your normal.";
      }
      const sent = d.lifts.filter(l => delivered(d.n, l.to)).map(l => l.to), waiting = d.lifts.filter(l => !delivered(d.n, l.to) && !ui.stopped[liftKey(d.n, l.to)]).map(l => l.to);
      return `${d.why} So I wrote one line each for ${joinNames(d.lifts.map(l => l.to))}, about one thing you like. They never see why.` +
        (sent.length ? ` Sent to ${joinNames(sent)}.` : "") + (waiting.length ? ` Waiting for your OK: ${joinNames(waiting)}.` : "");
    }
    if (q === ASK[1]) return d.n < LIFTS_ON ? "Not much yet. I need a week to learn what normal looks like for you." :
      d.signals.length && d.rule !== "normal" ? `Compared with your own normal: ${d.signals.join(", ")}. Only you see this.` : "Nothing off your normal today.";
    if (q === ASK[2]) return circle.map(m => `${m.first}: ${ui.perms[m.first]}`).join(". ") + ". You can change any of these in People, and nobody is told.";
    return "What kind of reels you watch and when, what you save, who you message and when, and how late you're up. Never the words in anyone's messages, your photos or where you are.";
  }

  function instagram() {
    const g = ig();
    if (!g) return `<p class="agent muted">No Instagram data for this day.</p>`;
    const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    let h = `<div class="ig-head"><b>Today on Instagram</b><span class="muted">Day ${g.n}</span></div>
      <div class="stats"><div><b>${g.reels_watched}</b><span>reels watched</span></div><div><b>${esc(g.last_active || "-")}</b><span>last active</span></div><div><b>${Math.round(g.heavy_share * 100)}%</b><span>heavy reels</span></div></div>`;
    h += `<div class="h">Latest reels</div><div class="reels">${g.latest_reels.map(r =>
      `<div class="reel ${r.heavy ? "heavy" : ""}" style="--h:${hue(r.theme)}"><span class="play">${I.play}</span><span class="rt">${esc(r.theme)}</span><span class="rc">@${esc(r.creator)}</span><span class="rtime">${esc(r.time)}</span></div>`).join("")}</div>`;
    if (g.saved.length) h += `<div class="h">Saved</div>` + g.saved.map(s => `<div class="thread"><span class="avatar sq" style="--h:${hue(s.theme)}">${I.play}</span><div><b>@${esc(s.creator)}</b><div class="muted">${esc(s.theme)} · ${esc(s.time)}</div></div></div>`).join("");
    // On the day Sam acts on his lift, his thread is the story: it's just Sam, being Sam.
    h += `<div class="h">Messages</div>` + g.threads.map(t => {
      const star = g.n === LANDS && t.first === "Sam";
      return `<div class="thread ${star ? "star" : ""}"><span class="avatar">${esc(t.group ? "#" : t.first[0])}</span><div><b>${esc(t.group ? t.name : t.first)}</b><div class="muted">${esc(t.last)} · ${esc(t.time)} · ${t.sent + t.received} messages today</div>${star ? `<div class="star-note">Sam reached out about the race. To ${esc(D.owner)}, it's just Sam.</div>` : ""}</div>${t.last === "New message" ? `<span class="dot"></span>` : ""}</div>`;
    }).join("");
    h += `<div class="widget tone-blue"><div class="eyebrow">What Muse reads here</div><p style="margin-top:4px">What kind of reels and when, and who Arjun talks to and when. Never what anyone wrote. Message text is dropped before Muse sees anything.</p>
      <div class="row"><button class="btn small primary" data-app="muse" data-thinking="1">See what Muse made of this</button></div></div>`;
    h += `<p class="note" style="margin-top:0">Fictional account and reels, in the same format as a real Instagram data export.</p>`;
    return h;
  }

  function orbit() {
    const d = cur(), R = { close: 72, around: 116, farther: 154 }, cx = 170, cy = 170;
    const angles = [-90, -18, 54, 126, 198];
    const pos = {};
    d.orbit.forEach((o, i) => {
      const a = angles[i] * Math.PI / 180, r = R[o.ring];
      pos[o.name] = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
    let s = `<svg class="orbit" viewBox="0 0 340 340" role="img" aria-label="Your orbit">`;
    Object.entries(R).forEach(([k, r]) => {
      s += `<circle class="ring" cx="${cx}" cy="${cy}" r="${r}"/><text class="ring-label" text-anchor="middle" x="${cx}" y="${cy + r + 11}">${k}</text>`;
    });
    s += `<circle class="sun" cx="${cx}" cy="${cy}" r="26"/><text class="sunname" x="${cx}" y="${cy + 4}">${esc(D.owner)}</text>`;
    d.orbit.forEach(o => {
      const [x, y] = pos[o.name];
      s += `<circle class="planet" cx="${x}" cy="${y}" r="20"/><text class="pname" x="${x}" y="${y + 4}">${esc(o.name)}</text>`;
    });
    const live = d.lifts.filter(l => delivered(d.n, l.to));
    live.forEach((l, i) => {
      s += `<g class="messenger" data-to="${esc(l.to)}" data-i="${i}" style="transform: translate(${cx + 16}px, ${cy - 40}px)">
        <foreignObject width="22" height="22">${face(22)}</foreignObject></g>`;
    });
    s += `</svg>`;
    let h = `<div class="h">Your orbit</div><p class="muted" style="margin:0">Closer means you wrote to them more recently. Never better or worse.</p>`;
    h += `<div class="widget orbit-card"><div class="orbit-stage">${s}</div>
      <div class="carousel">${d.orbit.map(o => `<div class="pcard"><span class="tag">${esc(o.ring)}</span><b>${esc(o.name)} <span class="muted" style="font-weight:450">· ${esc(o.relation)}</span></b><span class="muted" style="font-size:13px">${esc(o.fact)}</span></div>`).join("")}</div></div>`;
    if (live.length) h += `<p class="agent">Muse is carrying a lift to ${esc(joinNames(live.map(l => l.to)))}.</p>`;
    if (ui.day >= 30) {
      h += `<p class="agent">It's been a month. Still happy with who's in your orbit?</p>`;
      h += ui.kept ? `<div class="thanks" style="margin-top:-6px">Kept as it is.</div>` :
        `<div class="row" style="margin-top:-6px"><button class="btn small" data-keep="1">Keep it</button><button class="btn small" data-tab="people">Change</button></div>`;
    }
    setTimeout(() => {
      document.querySelectorAll(".messenger").forEach(g => {
        const [x, y] = pos[g.dataset.to] || [cx, cy];
        setTimeout(() => { g.style.transform = `translate(${x - 11 + 14}px, ${y - 11 - 18}px)`; }, 300 + 500 * +g.dataset.i);
      });
    }, 50);
    return h;
  }

  const ENTRY_DAYS = () => D.days.filter(x => x.journal).map(x => x.n);
  function journal() {
    const d = cur(), j = d.journal;
    if (!j) {
      return `<p class="agent">Write anything. I'll use your week to understand who and what you mean, then help you find the word for it, one small question at a time.</p>
        <p class="muted" style="margin:0">Only you see this. No face, no audience.</p>
        <div class="row">${ENTRY_DAYS().map(n => `<button class="btn small" data-goto="${n}">See day ${n}</button>`).join("")}</div>`;
    }
    let h = `<p class="muted" style="margin:0;text-align:center;font-size:12.5px">Day ${d.n} · only you see this</p>`;
    j.turns.forEach((t, i) => {
      h += `<div class="bubble me">${esc(t.user)}</div>`;
      if (t.connection) h += `<div class="think">${I.spark} Connected this to your week</div>`;
      h += `<p class="agent">${esc(t.reply)}</p>`;
      const next = (j.turns[i + 1] || {}).user || "";
      const words = t.feeling_words && t.feeling_words.length ? t.feeling_words : t.chips || [];
      const chips = [];
      if (t.about_chip && i === 1) chips.push(`<span class="chip on">${esc(t.about_chip)}</span>`);
      words.forEach(w => chips.push(`<span class="chip ${next.toLowerCase().includes(w.toLowerCase()) ? "on" : ""}">${esc(w)}</span>`));
      if (chips.length && t.step !== "safety") h += `<div class="bubble-extra">${chips.join("")}</div>`;
    });
    if (j.own_words && j.own_words.options) {
      h += `<div class="widget"><div class="who">In your words, for Dev</div>` + j.own_words.options.map(o => `<div class="draft" ${ui.editing ? 'contenteditable="true"' : ""}>${esc(o)}</div>`).join("") +
        (j.own_words.left_out ? `<div class="note">Left out: ${esc(j.own_words.left_out)}.</div>` : "") +
        `<div class="row"><button class="btn small" data-edit="1">${ui.editing ? "Done" : "Edit"}</button><button class="btn small" data-copy="own${d.n}">Copy</button>${flash("own" + d.n, "Copied")}</div>
         <div class="note">Muse never sends this. You do, if you want to.</div></div>`;
    }
    return h;
  }

  function lifts() {
    let h = `<div class="h">Lifts</div><p class="muted" style="margin:0">Every lift, to whom, and why. Only you see this.</p>`;
    h += `<div class="tiles">
      <button class="tile" data-sheet="pause">${I.power}<div><b>Lifts</b><span>${pauseLabel()}</span></div></button>
      <button class="tile" data-sheet="send">${I.shield}<div><b>Before sending</b><span>${sendLabel()}</span></div></button></div>`;
    const items = [];
    D.days.slice(0, ui.day).forEach(d => {
      d.lifts.forEach(l => { if (!ui.stopped[liftKey(d.n, l.to)]) items.push({ n: d.n, html:
        `<div class="log-item"><div class="log-meta"><span>${esc(d.weekday)} · Day ${d.n} · ${liftTime(d.n)}</span><b>${delivered(d.n, l.to) ? "To" : "Waiting for your OK:"} ${esc(l.to)}</b></div>
         <div class="log-text">"${esc(l.text)}"</div><div class="log-why">Why: ${esc(d.why || "A good stretch.")}</div>
         ${delivered(d.n, l.to) ? "" : `<div class="row" style="margin-top:8px"><button class="btn small primary" data-approve="${esc(liftKey(d.n, l.to))}">Send</button><button class="btn small" data-stop="${esc(liftKey(d.n, l.to))}">Not this one</button></div>`}</div>` }); });
      const held = d.log.filter(x => x.kind === "held").map(x => x.text.replace(/^Held a lift to (.*): one per week\.$/, "$1"));
      if (held.length) items.push({ n: d.n, html:
        `<div class="log-item held">Day ${d.n} · Held lifts to ${esc(joinNames(held))}: one per person per week.</div>` });
    });
    h += `<div class="list">${items.length ? items.reverse().map(i => i.html).join("") : `<p class="empty">No lifts yet. Muse is learning your normal.</p>`}</div>`;
    h += `<div class="note">At most one lift per person per week. ${ui.send === "ask" ? "Each lift waits for you to tap Send." : "Every lift waits 10 minutes so you can stop it."}</div>`;
    return h;
  }

  function people() {
    let h = `<div class="h">Your people</div><p class="muted" style="margin:0">Nobody can see what you chose. Changing it never tells anyone.</p><div>`;
    circle.forEach(m => {
      h += `<div class="prow"><span class="avatar">${esc(m.first[0])}</span><div><b>${esc(m.first)}</b><div class="muted" style="font-size:13px">${esc(m.relation)}${ui.left[m.first] ? " · left your circle" : ""}</div></div>
        <button class="perm" data-sheet="perm" data-who="${esc(m.first)}">${esc(ui.perms[m.first])} ${I.down}</button></div>
        <div class="ints">${D.interests.map(i => `<button class="chip ${ui.interests[m.first].has(i) ? "on" : ""}" data-int="${esc(m.first)}" data-i="${esc(i)}">${esc(i)}</button>`).join("")}</div>`;
    });
    h += `</div><p class="note" style="margin-top:0">Highlighted interests are the only things a person may ever hear about.</p>`;
    h += `<p class="agent">Every so often, just for you: is anyone pushing you to share more than you want to?</p>`;
    h += ui.told.pressure ? `<div class="thanks" style="margin-top:-6px">Thanks. Only you see this.</div>` :
      `<div class="row" style="margin-top:-6px"><button class="btn small" data-told="pressure">No, all good</button><button class="btn small" data-told="pressure">Yes, someone is</button></div>`;
    return h;
  }

  function levelHelp(l) {
    return { "Always": "Gets a lift whenever you're a little off your normal, and sometimes on good weeks.",
             "When it matters": "Only after a clearly heavy stretch.",
             "Just this once": "One lift, then it switches to Never.",
             "Never": "Never gets a lift. Private prompts to you still work." }[l];
  }

  // Pickers that rise from the bottom, like Muse's own choice sheets.
  function sheetBody(kind) {
    const d = cur();
    const o = (on, attr, t, s) => ({ on, attr, t, s });
    switch (kind) {
      case "pause": return ["Lifts", [["on", "On", "Lifts go out when your settings allow"], ["day", "Pause today", "Nothing goes out today"], ["week", "Pause this week", "Nothing goes out for 7 days"]]
        .map(([k, t, s]) => o(ui.pause === k, `data-pause="${k}"`, t, s))];
      case "send": return ["Before a lift is sent", [["ask", "Ask me first", "Each lift waits until you tap Send"], ["auto", "Send on its own", "You get 10 minutes to stop it"]]
        .map(([k, t, s]) => o(ui.send === k, `data-send="${k}"`, t, s))];
      case "perm": return [`When ${ui.sheetWho} may get a lift`, LEVELS.map(l => o(ui.perms[ui.sheetWho] === l, `data-perm="${esc(ui.sheetWho)}" data-level="${esc(l)}"`, l, levelHelp(l)))];
      case "menu": return ["Circle", [
        o(null, `data-tab="today"`, "Today", "Your page, lifts and what Muse noticed"),
        o(null, `data-tab="journal"`, "Journal", "Write it out, privately"),
        o(null, `data-tab="people"`, "Your people", "Who's in, and when they may get a lift"),
        o(null, `data-app="ig"`, "Instagram", "The activity Muse reads from"),
        o(null, `data-sheet="reads"`, "What Muse reads", "And what it never reads")]];
      case "more": return ["Options", [
        o(null, `data-sheet="pause"`, "Lifts", pauseLabel()),
        o(null, `data-sheet="send"`, "Before sending", sendLabel()),
        o(null, `data-sheet="reads"`, "What Muse reads", "And what it never reads")]];
      case "reads": return ["What Muse reads", null,
        `<div class="info"><b>Reads</b><p>What kind of reels you watch and when, what you save, who you message and when, how late you're up, and what you write in your journal here.</p>
         <b>Never reads</b><p>The words in anyone's messages, your photos, or where you are.</p>
         <b>Never shares</b><p>Anything at all, except one short lift you allowed, to one person you chose.</p></div>`];
      case "ask": return ["Ask Muse", ASK.map(q => o(null, `data-ask="${esc(q)}"`, q, ""))];
      case "write": return ["Journal", ENTRY_DAYS().map(n => o(null, `data-goto="${n}" data-tab="journal"`, `Open your entry from day ${n}`, D.days[n - 1].weekday))
        .concat([o(null, "", "New entries are typed live in the full app", "This demo shows entries Muse answered earlier, on Meta's model")])];
      // The friend's side
      case "rxmenu": return ["Circles you're in", [o(null, `data-leave="${esc(ui.rx)}"`, `Leave ${D.owner}'s circle`, `${D.owner} isn't told why. You just stop getting lifts for ${D.owner}.`)]];
      case "rxask": return ["Ask Muse", RXASK.map(q => o(null, `data-rxask="${esc(q)}"`, q, ""))];
      case "plan": return [`Something small for ${D.owner}`, [
        o(null, `data-planpick="race"`, "Plan the race watch", "Muse reminds you on race day"),
        o(null, `data-planpick="reel"`, `Send ${D.owner} an F1 reel`, "Opens Instagram with a few you'd like"),
        o(null, `data-planpick="text"`, `Message ${D.owner}`, "Just you, in your own words")]];
    }
    return ["", []];
  }

  function drawSheet(layerSel, kind) {
    const layer = $(layerSel);
    if (!kind) { layer.className = "sheet-layer"; layer.innerHTML = ""; return; }
    const [title, opts, html] = sheetBody(kind);
    layer.className = "sheet-layer open";
    layer.innerHTML = `<div class="sheet"><div class="sh-title">${esc(title)}</div>` + (html || "") +
      (opts || []).map(x => `<button class="opt" ${x.attr} ${x.attr ? "" : "disabled"}><span class="ck">${x.on ? I.check : ""}</span><span><b>${esc(x.t)}</b>${x.s ? `<span>${esc(x.s)}</span>` : ""}</span></button>`).join("") + `</div>`;
  }

  function composer(el, placeholder, attr) {
    el.innerHTML = `<button class="composer-btn" ${attr}><span class="ph">${esc(placeholder)}</span><span class="bar"><span class="ic">${I.plus}</span><span class="sp"></span>
      <span class="thinking">Thinking</span><span class="ic">${I.mic}</span><span class="ic go">${I.wave}</span></span></button>`;
  }

  // ---------------- First run: setting up Circle inside Muse ----------------
  const STEPS = ["welcome", "age", "connect", "notify", "circle", "people", "send", "done"];
  const IG_GLYPH = svg(`<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/>`);
  function setup() {
    const step = ui.ob, at = STEPS.indexOf(step);
    const dots = at > 0 && at < STEPS.length - 1 ? `<div class="ob-dots">${STEPS.slice(1, -1).map((_, i) => `<i class="${i < at ? "on" : ""}"></i>`).join("")}</div>` : "";
    const back = at > 0 && at < STEPS.length - 1 ? `<button class="btn small link ob-back" data-ob="back">Back</button>` : "";
    const next = (label, dis) => `<button class="btn primary ob-next" data-ob="next" ${dis ? "disabled" : ""}>${label || "Next"}</button>`;
    let h = `<div class="ob">${dots}`;
    if (step === "welcome") {
      h += `<div class="ob-hero">${face(96, "bob")}<div class="ob-title">Circle</div><div class="muted">A space in Muse</div></div>
        <p class="agent">When you're quietly running low, the few people closest to you find out, without you having to ask. And without them learning anything private.</p>
        <p class="agent">They just get one small, doable idea, like watching the race with you.</p>${next("Get started")}`;
    } else if (step === "age") {
      h += `<div class="ob-h">First, your age</div><p class="agent">Circle notices how your nights and your reels go. That's not something Muse does for anyone under 18.</p>
        <div class="ob-stack"><button class="btn primary" data-ob="next">I'm 18 or older</button><button class="btn" data-ob="minor">I'm under 18</button></div>`;
    } else if (step === "minor") {
      h += `<div class="ob-h">Circle isn't for under 18</div><p class="agent">Everything else in Muse still is. If something's heavy, you can always talk to me, and I can point you to people who help.</p>
        <div class="ob-stack"><button class="btn" data-ob="age">Go back</button></div>`;
    } else if (step === "connect") {
      h += `<div class="ob-h">Connect Instagram</div><p class="agent">Circle needs one connector. It compares your Instagram with your own normal, nobody else's.</p>
        <div class="widget conn"><div class="top-row"><span class="avatar sq ig">${IG_GLYPH}</span><div><div class="who">Instagram</div><div class="sub">Connector · asked by Circle</div></div></div>
          <div class="info" style="padding:0"><b>Circle will read</b><p>What kind of reels you watch and when, what you save, who you message and when.</p>
          <b>Circle will never read</b><p>The words in your messages, your photos or where you are.</p></div>
          <div class="ob-stack"><button class="btn primary" data-ob="next" data-conn="always">Always allow</button><button class="btn" data-ob="next" data-conn="once">Allow once</button><button class="btn" data-ob="noig">Don't allow</button></div>
        </div><p class="note" style="margin-top:0">You can disconnect any time in Settings, Connectors.</p>`;
    } else if (step === "noig") {
      h += `<div class="ob-h">Circle can't notice without it</div><p class="agent">That's fine. Without Instagram, Circle can't tell when you're off your normal, so no lifts. The journal still works, just for you.</p>
        <div class="ob-stack"><button class="btn primary" data-ob="connect">Connect after all</button><button class="btn" data-ob="journal-only">Use the journal only</button></div>`;
    } else if (step === "notify") {
      h += `<div class="ob-h">Stay in the loop</div><p class="agent">Muse only taps you for two things: your page at night, and a lift waiting for your OK.</p>
        <div class="alert-dim"><div class="alert"><b>"Muse" Would Like to Send You Notifications</b><p>Your nightly page, and lifts that need your OK.</p>
        <div class="alert-btns"><button data-ob="next" data-notif="no">Don't Allow</button><button data-ob="next" data-notif="yes"><b>Allow</b></button></div></div></div>`;
    } else if (step === "circle") {
      h += `<div class="ob-h">Who's in your corner?</div><p class="agent">Here are people from your Close Friends. Pick up to five. Each one is asked, and nobody is in until they say yes.</p>
        <div class="row">${circle.map(m => `<button class="chip ${ui.picked.has(m.first) ? "on" : ""}" data-pick="${esc(m.first)}">${esc(m.first)}</button>`).join("")}</div>
        <p class="note">${ui.picked.size} of 5 picked.</p>${next("Next", !ui.picked.size)}`;
    } else if (step === "people") {
      h += `<div class="ob-h">When may each of them get a lift?</div><p class="agent">And what may they ever hear about? Nobody sees what you chose.</p><div>`;
      circle.filter(m => ui.picked.has(m.first)).forEach(m => {
        h += `<div class="prow"><span class="avatar">${esc(m.first[0])}</span><div><b>${esc(m.first)}</b><div class="muted" style="font-size:13px">${esc(m.relation)}</div></div>
          <button class="perm" data-sheet="perm" data-who="${esc(m.first)}">${esc(ui.perms[m.first])} ${I.down}</button></div>
          <div class="ints">${D.interests.map(i => `<button class="chip ${ui.interests[m.first].has(i) ? "on" : ""}" data-int="${esc(m.first)}" data-i="${esc(i)}">${esc(i)}</button>`).join("")}</div>`;
      });
      h += `</div>${next()}`;
    } else if (step === "send") {
      h += `<div class="ob-h">Before a lift goes out</div><p class="agent">Muse writes it. You decide how it leaves.</p><div class="ob-stack">` +
        [["ask", "Ask me first", "Each lift waits until you tap Send"], ["auto", "Send on its own", "You get 10 minutes to stop it"]].map(([k, t, sub]) =>
          `<button class="opt card-opt ${ui.send === k ? "on" : ""}" data-send-ob="${k}"><span class="ck">${ui.send === k ? I.check : ""}</span><span><b>${t}</b><span>${sub}</span></span></button>`).join("") +
        `</div>${next()}`;
    } else if (step === "done") {
      h += `<div class="ob-hero">${face(64, "bob")}<div class="ob-title">You're set</div></div>
        <p class="agent">Invites sent to ${esc(joinNames([...ui.picked]))}. For the next week I just learn your normal. Lifts switch on at day ${LIFTS_ON}, and nothing leaves your phone until then.</p>
        <button class="btn primary ob-next" data-ob="finish">Go to Today</button>`;
    }
    return h + back + `</div>`;
  }

  // ---------------- The friend's side ----------------
  const RXASK = ["Why did I get this?", `What does ${D.owner} see?`];
  function rxAnswer(q) {
    return q === RXASK[0] ? `Muse doesn't say, and can't. ${D.owner} chose to let you get the odd lift. That's all Muse will tell you.`
      : `Nothing about what you do with it. If you plan something, it just looks like you being you.`;
  }

  function receiver() {
    const d = cur(), who = ui.rx;
    $("#rxPick").innerHTML = circle.map(m => `<button class="chip ${who === m.first ? "on" : ""}" data-rx="${esc(m.first)}">${esc(m.first)}</button>`).join("");
    $("#rxWho").textContent = who + "'s phone";
    const l = allLifts(ui.day).filter(x => x.to === who && ui.day - x.n <= 2).pop();
    $("#devB").innerHTML = `<button class="${ui.rxDev === "phone" ? "on" : ""}" data-dev="phone">Phone</button><button class="${ui.rxDev === "charm" ? "on" : ""}" data-dev="charm">Muse Charm</button>`;
    document.querySelector(".device-wrap.right").classList.toggle("charm", ui.rxDev === "charm");
    if (ui.rxDev === "charm") {
      // The same lift, on a pocket device: one line, one tap, nothing else.
      const k = l && liftKey(l.n, who), plan = k && ui.plan[k];
      $("#rxScreen").innerHTML = l && !ui.left[who]
        ? `<div class="charm-screen" id="rx-lift">${face(58, "bob")}<p class="charm-text">${esc(l.text)}</p>` +
          (plan === "no" ? `<div class="charm-small">Okay. ${esc(D.owner)} won't know.</div>` : plan ? `<div class="charm-small">${plan === "race" ? "Reminder set for race day." : "Done. It's all you from here."}</div>`
            : `<div class="charm-btns"><button data-sheet-b="plan" data-k="${esc(k)}">Plan</button><button data-plan="${esc(k)}" data-v="no">Not now</button></div>`) + `</div>`
        : `<div class="charm-screen">${face(58, "bob")}<p class="charm-text muted">All quiet in your circle.</p><div class="charm-small">Hold to talk to Muse</div></div>`;
      return;
    }
    let h = `<p class="hello">${greet()}, ${esc(who)}.</p>`;
    if (ui.left[who]) {
      h += `<p class="agent">You left ${esc(D.owner)}'s circle. No more lifts for ${esc(D.owner)}.</p>`;
    } else if (ui.day <= 2 && (ui.invited || ui.day === 2)) {
      // Day 1-2: the invite. Nobody is in a circle until they say yes.
      if (!ui.joined[who]) {
        h += `<div class="widget"><div class="top-row"><span class="avatar">${esc(D.owner[0])}</span><div><div class="who">${esc(D.owner)} asked you into his circle</div><div class="sub">Up to five people</div></div></div>
          <p>Now and then, Muse may suggest one small thing to do for ${esc(D.owner)}. You'll never see why, and ${esc(D.owner)} never sees what you do with it.</p>
          <div class="row"><button class="btn primary small" data-join="${esc(who)}">Join</button><button class="btn small" data-join="${esc(who)}" data-no="1">Not now</button></div></div>`;
      } else if (ui.joined[who] === "no") {
        h += `<p class="agent">Okay. The invite stays open if you change your mind.</p><div class="row" style="margin-top:-6px"><button class="btn small" data-join="${esc(who)}">Join after all</button></div>`;
      } else {
        h += `<p class="agent">You're in ${esc(D.owner)}'s circle.</p>`;
        h += ui.added[who] ? `<div class="thanks" style="margin-top:-6px">${esc(D.owner)} is in yours too.</div>` :
          `<p class="agent">Want ${esc(D.owner)} in yours? Circles only work both ways.</p><div class="row" style="margin-top:-6px"><button class="btn small primary" data-add="${esc(who)}">Add ${esc(D.owner)}</button><button class="btn small" data-add="${esc(who)}" data-no="1">Later</button></div>`;
      }
    } else if (l) {
      const k = liftKey(l.n, who), plan = ui.plan[k];
      h += `<p class="agent">One thing from your circle tonight.</p>
        <div class="widget" id="rx-lift"><div class="eyebrow">Someone in your circle could use something small</div>
        <p class="quote" style="margin-top:6px">${esc(l.text)}</p>
        <div class="rx-sign">${face(24)}<span>Suggested by Muse. ${esc(D.owner)} didn't ask.</span></div>`;
      h += plan === "no" ? `<div class="thanks">Okay. ${esc(D.owner)} won't know.</div>`
        : plan ? `<div class="thanks">${esc(planText(plan))}</div>`
        : `<div class="row"><button class="btn primary small" data-sheet-b="plan" data-k="${esc(k)}">Plan something</button><button class="btn small" data-plan="${esc(k)}" data-v="no">Not now</button></div>`;
      h += `</div><div class="note" style="margin-top:0">That's everything ${esc(who)} sees: no feelings, no reasons, nothing ${esc(D.owner)} wrote.</div>`;
    } else if (ui.day === LANDS && who === "Sam") {
      const k = Object.keys(ui.plan).find(x => x.endsWith(":Sam"));
      const p = k ? ui.plan[k] : "race";
      if (p !== "no") h += `<div class="widget tone-blue"><div class="eyebrow">Reminder you set</div><p style="margin-top:4px">${p === "race" ? `Race day. Watching it with ${esc(D.owner)}?` : `You said you'd check in with ${esc(D.owner)}.`}</p></div>`;
      h += `<p class="agent">That's all from Muse. The rest is just you and ${esc(D.owner)}.</p>`;
    } else {
      h += `<p class="agent">Your circle's quiet today. Nothing to do. Enjoy it.</p>`;
    }
    (ui.rxAsks[who] || []).forEach(q => { h += `<div class="bubble me">${esc(q)}</div><p class="agent">${esc(rxAnswer(q))}</p>`; });
    h += `<div class="note" style="margin-top:auto">No subscription needed to receive. Lifts can also arrive in Instagram.</div>`;
    $("#rxScreen").innerHTML = h;
  }

  const planText = p => ({
    race: `Planned. Muse will remind you on race day. ${D.owner} won't know this came from Muse.`,
    reel: `Opening Instagram. Pick a reel ${D.owner} would like and send it as you.`,
    text: `Go for it. Write it your way. Muse stays out of it.`,
  })[p];

  // A small card that travels from Arjun's phone to the friend's, so you can see the lift cross.
  function fly(from, to, text) {
    if (calm || !from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const f = document.createElement("div");
    f.className = "flyer";
    f.innerHTML = face(22) + `<span>${esc(text.length > 54 ? text.slice(0, 52) + "..." : text)}</span>`;
    f.style.left = a.left + 12 + "px"; f.style.top = a.top + 12 + "px";
    document.body.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      f.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.96)`;
      f.style.opacity = "0";
    }));
    setTimeout(() => f.remove(), 1500);
  }

  function chapters() {
    const active = ui.ob ? 0 : CHAPTERS.reduce((a, c, i) => (!c.ob && c.day === ui.day && c.app === ui.app && (c.tab === ui.tab || c.app === "ig") ? i : a), -1);
    $("#chapters").innerHTML = `<span class="ch-lead">The story</span>` + CHAPTERS.map((c, i) =>
      `<button class="ch ${i === active ? "on" : ""}" data-chapter="${i}"><span>Day ${c.day}</span>${esc(c.label)}</button>`).join("");
  }

  // ---------------- Side panel ----------------
  function crosses() {
    const d = cur();
    const today_ = d.lifts.map(x => Object.assign({ n: d.n }, x));  // today's lifts, sent or still waiting for an OK
    const l = today_.find(x => x.to === ui.rx) || allLifts(ui.day).filter(x => ui.day - x.n <= 2).find(x => x.to === ui.rx) || today_[0] || allLifts(ui.day).pop();
    if (!l) {
      return `<h2>What crosses today: nothing</h2><p class="lede">${d.n < 7 ? "Muse is still learning his normal. Lifts switch on at day 7." : "Nothing about Arjun leaves his phone today."}</p>` + whyNot(d);
    }
    const src = D.days[l.n - 1];
    const stays = [];
    if (src.page) stays.push(`His Daily Page: "${src.page}"`);
    if (src.signals.length) stays.push(`Signals: ${src.signals.join(", ")}`);
    if (src.why) stays.push(`Why Muse sent it: ${src.why}`);
    const jd = D.days.find(x => x.journal && x.n <= ui.day);
    if (jd) stays.push(`His journal: "${jd.journal.turns[0].user}"`);
    stays.push("What his reels were about, and who he's gone quiet with");
    stays.push("Everyone else in his circle");
    const c = l.check || {};
    const checks = [
      [!(l.lint || []).length, "Plain-text check: no feeling, reason, therapy, needy or AI words, no names, no private terms"],
      [c.leak === false, "Muse leak check: nothing private given away, not even a hint"],
      [c.harmless_if_wrong !== false, "Harmless if wrong: fine even on a perfectly good week"],
      [c.voice_ok !== false, "Voice: short, warm, one interest, one small gesture"],
    ];
    return `<h2>What crosses to ${esc(l.to)}</h2><p class="lede">Day ${l.n}${delivered(l.n, l.to) ? "" : `, waiting for ${esc(D.owner)} to tap Send`}. The writer never saw anything on the left. It only knew "${esc(D.owner)}", "${esc(l.to)}" and "${esc(l.interest)}".</p>
      <div class="split">
        <div class="col stays"><h4>Stays with ${esc(D.owner)}</h4><ul>${stays.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>
        <div class="col crosses"><h4>Crosses to ${esc(l.to)}</h4><ul>
          <li>"${esc(l.text)}"</li><li>One interest he allowed for ${esc(l.to)}: ${esc(l.interest)}</li><li>That it came from Muse, not from ${esc(D.owner)}</li></ul></div>
      </div>
      <div class="checks">${checks.map(([ok, t]) => `<div class="check"><span class="dot ${ok ? "" : "bad"}"></span><span>${esc(t)}</span></div>`).join("")}</div>
      <p class="note">Written on try ${l.tries || 1}${l.fallback ? ", using the safe fallback line" : ""}. Every lift passes both checks before ${esc(D.owner)} even sees it.</p>`;
  }

  function whyNot(d) {
    if (!d.not_sent.length) return "";
    return `<div class="section-title">Who would have been eligible</div><table><tr><th>Person</th><th>Result</th></tr>` +
      d.not_sent.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.why)}</td></tr>`).join("") + `</table>`;
  }

  function hood() {
    const d = cur();
    let h = `<h2>Under the hood · day ${d.n}</h2><p class="lede">Plain code measures; Muse reads and writes; plain code enforces every permission and safety rule.</p>
      <dl class="kv">
        <dt>1. Instagram rule</dt><dd>${d.signals.length ? esc(cap(d.signals.join(", "))) : "Nothing off his normal"} <span class="muted">(${esc(d.rule)})</span></dd>
        <dt>2. Muse read</dt><dd>${d.families_off && d.families_off.length ? esc(d.families_off.join(", ").replace(/_/g, " ")) : "No signal families off"}</dd>
        <dt>3. Decision</dt><dd>${esc(d.stretch.replace("_", " "))}</dd>
        <dt>4. Lifts</dt><dd>${d.lifts.length ? esc(d.lifts.map(l => l.to).join(", ")) : "None"}</dd>
      </dl>`;
    h += `<div class="section-title">Each person, through the gates</div><table><tr><th>Person</th><th>Setting</th><th>Result</th></tr>` +
      circle.map(m => {
        const l = d.lifts.find(x => x.to === m.first), ns = d.not_sent.find(x => x.name === m.first);
        return `<tr><td>${esc(m.first)}</td><td>${esc(m.permission)}</td><td>${l ? `<span class="pill ok">${ui.send === "ask" && !ui.approved[liftKey(d.n, m.first)] ? "Lift ready, waiting for OK" : "Lift queued"}</span>` : `<span class="pill no">${esc(ns ? ns.why : "Nothing to lift")}</span>`}</td></tr>`;
      }).join("") + `</table>`;
    if (B) {
      h += `<div class="section-title">Test bench: ${B.cases} fictional cases, ${B.runs.length} fresh runs</div><table><tr><th>Metric</th><th>Target</th>${B.runs.map((_, i) => `<th>Run ${i + 1}</th>`).join("")}</tr>` +
        B.metrics.map(m => `<tr><td>${esc(m.label)}</td><td>${esc(m.target)}</td>${m.values.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("") + `</table>`;
      h += `<p class="note">Cases cover heavy weeks, normal weeks, good weeks, permission edges, crisis and safety, and leak traps (a breakup, a hidden biopsy, money trouble, a friend's secret, a layoff). Model: ${esc(B.model)}.</p>`;
    }
    return h;
  }

  function joinNames(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------------- Wiring ----------------
  const TABS = { today, orbit, journal, lifts, people };
  let lastDay = null;
  document.querySelectorAll(".status .sys").forEach(e => { e.innerHTML = STATUS; });
  document.querySelectorAll(".appbar .menu").forEach(e => { e.innerHTML = I.menu; });
  $("#pairA").innerHTML = `<button data-compose="1" aria-label="New journal entry">${I.compose}</button><button data-sheet="more" aria-label="More">${I.more}</button>`;

  function render() {
    const d = cur();
    let newDay = false;
    if (d.n !== lastDay) {  // follow the day's lift to the friend who gets it
      newDay = lastDay !== null;
      lastDay = d.n;
      if (d.lifts.length && !d.lifts.some(l => l.to === ui.rx)) ui.rx = d.lifts[0].to;
    }
    const isIG = ui.app === "ig" && !ui.ob, isOB = !!ui.ob;
    $("#day").value = ui.day;
    $("#dayLabel").innerHTML = `Day ${d.n} · ${esc(d.weekday)} <small>${fmtDate(d.date)}</small>`;
    $("#appA").innerHTML = `<button class="${isIG ? "" : "on"}" data-app="muse">Muse</button><button class="${isIG ? "on" : ""}" data-app="ig">Instagram</button>`;
    $("#titleA").textContent = isOB ? "Set up Circle" : isIG ? "Instagram" : "Circle";
    $("#tabs").style.display = isIG || isOB ? "none" : "";
    $("#pairA").style.visibility = isIG || isOB ? "hidden" : "";
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === ui.tab));
    document.querySelectorAll(".views button").forEach(b => b.classList.toggle("on", b.dataset.view === ui.view));
    $("#screen").innerHTML = isOB ? setup() : isIG ? instagram() : TABS[ui.tab]();
    $("#composerA").style.display = isIG || isOB ? "none" : "";
    composer($("#composerA"), ui.tab === "journal" ? "Write anything..." : "Ask Muse...", ui.tab === "journal" ? `data-sheet="write"` : `data-sheet="ask"`);
    composer($("#composerB"), "Ask Muse...", `data-sheet-b="rxask"`);
    drawSheet("#sheet", ui.sheet);
    drawSheet("#sheetB", ui.sheetB);
    receiver();
    chapters();
    $("#panel").innerHTML = ui.view === "crosses" ? crosses() : hood();
    if (newDay && ui.send === "auto" && ui.tab === "today" && !isIG) {
      const l = d.lifts.find(x => x.to === ui.rx && delivered(d.n, x.to));
      if (l) fly(document.getElementById("lift-" + liftKey(d.n, l.to)), $("#rx-lift"), l.text);
    }
  }

  let planFor = null;  // which lift the friend's "Plan something" sheet is about
  document.addEventListener("click", e => {
    if (e.target.id === "sheet") { ui.sheet = null; render(); return; }  // tap outside a sheet closes it
    if (e.target.id === "sheetB") { ui.sheetB = null; render(); return; }
    const t = e.target.closest("button");
    if (!t || t.disabled) return;
    const ds = t.dataset;
    let flyKey = null, scrollTop = false;
    const closeA = () => { ui.sheet = null; };
    if (ds.chapter) {
      const c = CHAPTERS[+ds.chapter];
      Object.assign(ui, { day: c.day, app: c.app, tab: c.tab, rx: c.rx, sheet: null, sheetB: null, ob: c.ob || null });
      if (c.ob) ui.invited = false;
      lastDay = c.day;  // keep the chosen friend
      scrollTop = true;
    }
    else if (ds.ob) {
      const at = STEPS.indexOf(ui.ob);
      if (ds.conn) ui.igConn = ds.conn;
      if (ds.notif) ui.notif = ds.notif;
      if (ds.ob === "next") ui.ob = STEPS[at + 1];
      else if (ds.ob === "back") ui.ob = STEPS[Math.max(0, at - 1)];
      else if (ds.ob === "finish") Object.assign(ui, { ob: null, invited: true, day: 1, tab: "today", app: "muse" });
      else if (ds.ob === "journal-only") Object.assign(ui, { ob: null, day: 1, tab: "journal", app: "muse" });
      else ui.ob = ds.ob;
      closeA(); scrollTop = true;
    }
    else if (ds.sendOb) ui.send = ds.sendOb;
    else if (ds.dev) { ui.rxDev = ds.dev; ui.sheetB = null; }
    else if (ds.app) { ui.app = ds.app; closeA(); if (ds.thinking) { ui.tab = "today"; ui.think[ui.day] = true; } scrollTop = true; }
    else if (ds.goto) { ui.day = +ds.goto; if (ds.tab) ui.tab = ds.tab; closeA(); }
    else if (ds.tab) { ui.tab = ds.tab; ui.app = "muse"; closeA(); scrollTop = true; }
    else if (ds.view) ui.view = ds.view;
    else if (ds.think) ui.think[ds.think] = !ui.think[ds.think];
    else if (ds.right) ui.right[ds.right] = !ui.right[ds.right];
    else if (ds.wrong) ui.wrong[ds.wrong] = ds.quick ? "yes" : "open";
    else if (ds.wrongReason) ui.wrong[ds.k] = ds.wrongReason;
    else if (ds.copy) {
      const d = cur();
      copy(ds.copy.startsWith("own") ? (d.journal.own_words.options || []).join("\n\n") : d.page || "");
      ui.flash = { k: ds.copy }; setTimeout(() => { ui.flash = null; render(); }, 1400);
    }
    else if (ds.edit) ui.editing = !ui.editing;
    else if (ds.keep) ui.kept = true;
    else if (ds.stop) ui.stopped[ds.stop] = true;
    else if (ds.approve) { ui.approved[ds.approve] = true; ui.rx = ds.approve.split(":")[1]; flyKey = ds.approve; }
    else if (ds.sheet) { ui.sheet = ds.sheet; if (ds.who) ui.sheetWho = ds.who; }
    else if (ds.sheetB) { ui.sheetB = ds.sheetB === "menu" ? "rxmenu" : ds.sheetB; if (ds.k) planFor = ds.k; }
    else if (ds.send) { ui.send = ds.send; closeA(); }
    else if (ds.pause) { ui.pause = ds.pause; closeA(); }
    else if (ds.perm) { ui.perms[ds.perm] = ds.level; closeA(); }
    else if (ds.ask) { (ui.asks[ui.day] = ui.asks[ui.day] || []).push(ds.ask); ui.tab = "today"; closeA(); }
    else if (ds.compose) { ui.tab = "journal"; ui.sheet = "write"; }
    else if (ds.pick) { ui.picked.has(ds.pick) ? ui.picked.delete(ds.pick) : ui.picked.add(ds.pick); }
    else if (ds.invite) ui.invited = true;
    else if (ds.join) ui.joined[ds.join] = ds.no ? "no" : true;
    else if (ds.add) ui.added[ds.add] = !ds.no;
    else if (ds.leave) { ui.left[ds.leave] = true; ui.sheetB = null; }
    else if (ds.planpick) { if (planFor) ui.plan[planFor] = ds.planpick; ui.sheetB = null; }
    else if (ds.plan) ui.plan[ds.plan] = ds.v;
    else if (ds.rxask) { (ui.rxAsks[ui.rx] = ui.rxAsks[ui.rx] || []).push(ds.rxask); ui.sheetB = null; }
    else if (ds.see) { ui.rx = ds.see; ui.view = "crosses"; }
    else if (ds.rx) { ui.rx = ds.rx; ui.sheetB = null; }
    else if (ds.int) { const s = ui.interests[ds.int]; s.has(ds.i) ? s.delete(ds.i) : s.add(ds.i); }
    else if (ds.told) ui.told[ds.told] = true;
    else if (ds.loop) ui.loop[ds.loop] = ds.v || true;
    else if (t.id === "prev") ui.day = Math.max(1, ui.day - 1);
    else if (t.id === "next") ui.day = Math.min(D.days.length, ui.day + 1);
    else return;
    render();
    if (scrollTop) $("#screen").scrollTop = 0;
    const star = ds.chapter && $("#screen .thread.star");
    if (star) $("#screen").scrollTop = star.offsetTop - $("#screen").offsetTop - 120;
    if (ds.ask) { const s = $("#screen"); s.scrollTop = s.scrollHeight; }
    if (flyKey) {
      const l = cur().lifts.find(x => liftKey(cur().n, x.to) === flyKey);
      if (l) fly(document.getElementById("lift-" + flyKey), $("#rx-lift"), l.text);
    }
  });
  $("#day").addEventListener("input", e => { ui.day = +e.target.value; render(); });
  document.addEventListener("keydown", e => {
    if (e.target.isContentEditable) return;
    if (e.key === "Escape" && (ui.sheet || ui.sheetB)) { ui.sheet = ui.sheetB = null; render(); return; }
    if (e.key === "ArrowLeft") { ui.day = Math.max(1, ui.day - 1); render(); }
    if (e.key === "ArrowRight") { ui.day = Math.min(D.days.length, ui.day + 1); render(); }
  });
  $("#day").max = D.days.length;
  const q = new URLSearchParams(location.search);
  if (q.get("day")) ui.day = Math.min(D.days.length, Math.max(1, +q.get("day")));
  if (q.get("tab") && TABS[q.get("tab")]) ui.tab = q.get("tab");
  if (q.get("app") === "ig") ui.app = "ig";
  if (q.get("view")) ui.view = q.get("view");
  if (q.get("send") === "auto") ui.send = "auto";
  if (q.get("theme")) document.documentElement.dataset.theme = q.get("theme");
  if (q.get("charm")) ui.rxDev = "charm";
  if (!q.get("day") && !q.get("tab") && !q.get("app")) Object.assign(ui, { day: 1, ob: "welcome" });
  render();
})();
