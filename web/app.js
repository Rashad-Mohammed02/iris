// Muse Circle prototype screens, drawn as a space inside Muse. Reads window.DEMO
// (written by scripts/run_demo.py) and window.BENCH (written by bench/export_web.py). No network calls.

(function () {
  const D = window.DEMO;
  const B = window.BENCH || null;
  const circle = D.settings.circle.map(m => Object.assign({ first: m.name.split(" ")[0] }, m));
  const LEVELS = ["Always", "When it matters", "Just this once", "Never"];
  const ui = {
    day: 26, tab: "today", view: "crosses", rx: "Sam",
    wrong: {}, right: {}, stopped: {}, perms: {}, interests: {}, pause: "on", told: {}, loop: {},
    send: D.settings.send_mode === "automatic" ? "auto" : "ask", approved: {},
    think: {}, sheet: null, sheetWho: null,
  };
  circle.forEach(m => { ui.perms[m.first] = m.permission; ui.interests[m.first] = new Set(m.allowed_interests || D.interests); });

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cur = () => D.days[ui.day - 1];
  const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const liftKey = (n, to) => n + ":" + to;
  const liftTime = n => ["8:52 PM", "9:14 PM", "7:40 PM", "9:03 PM"][n % 4];
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Plain line icons, drawn here so nothing is borrowed from Meta's own artwork.
  const svg = (p, extra) => `<svg class="i ${extra || ""}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const I = {
    menu: svg(`<path d="M5 9h14M5 15h14"/>`),
    compose: svg(`<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M17.5 3.5l3 3L12 15l-4 1 1-4z"/>`),
    more: svg(`<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>`),
    plus: svg(`<path d="M12 5v14M5 12h14"/>`),
    mic: svg(`<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>`),
    wave: svg(`<path d="M6 10v4M10 7v10M14 9v6M18 11v2"/>`),
    spark: svg(`<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" fill="currentColor" stroke="none"/>`, "spark"),
    chev: svg(`<path d="M9 6l6 6-6 6"/>`).replace('class="i ', 'style="width:14px;height:14px" class="i '),
    down: svg(`<path d="M6 9l6 6 6-6"/>`).replace('class="i ', 'style="width:14px;height:14px" class="i '),
    check: svg(`<path d="M5 12.5l4.5 4.5L19 7.5"/>`),
    up: svg(`<path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/>`),
    thumbDown: svg(`<g transform="rotate(180 12 12)"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/></g>`),
    copy: svg(`<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>`),
    power: svg(`<path d="M12 3v8M6.3 7a8 8 0 1 0 11.4 0"/>`),
    shield: svg(`<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>`),
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

  function face(size, extra) {
    return `<svg class="face ${extra || ""}" viewBox="0 0 30 30" width="${size}" height="${size}" aria-hidden="true">
      <circle class="f" cx="15" cy="15" r="14"/><circle class="e" cx="10.5" cy="13" r="1.8"/><circle class="e" cx="19.5" cy="13" r="1.8"/>
      <path d="M10.5 18.5 Q15 21.5 19.5 18.5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
  }

  const greet = () => "Good evening";  // lifts land around 9 PM in the demo
  const pauseLabel = () => ({ on: "On", day: "Paused today", week: "Paused this week" })[ui.pause];
  const sendLabel = () => ui.send === "ask" ? "Ask me first" : "Send on its own";

  // ---------------- Arjun's screens ----------------
  function today() {
    const d = cur(); let h = "";
    const thoughts = [];
    if (d.n < 7) thoughts.push(`Still learning your normal: day ${d.n} of 7. Lifts switch on at day 7.`);
    else if (d.signals.length && d.rule !== "normal") thoughts.push(`Compared with your own normal: ${d.signals.join(", ")}.`);
    else thoughts.push("Nothing off your normal today.");
    if (d.why && d.lifts.length) thoughts.push(`Why a lift: ${d.why}`);
    thoughts.push("Nothing here was sent to anyone.");
    h += `<button class="think" data-think="${d.n}">${I.spark} Show thinking ${ui.think[d.n] ? I.down : I.chev}</button>`;
    if (ui.think[d.n]) h += `<div class="thought">${thoughts.map(t => `<div>${esc(t)}</div>`).join("")}</div>`;

    h += `<p class="hello">${greet()}, ${esc(D.owner)}.${d.page ? "" : d.n < 7 ? " Muse is still getting to know your normal." : ""}</p>`;

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
        h += `<div class="fb" style="margin-top:-6px"><button class="${ui.right[k] ? "on" : ""}" data-right="${k}" aria-label="That's right">${I.up}</button><button data-wrong="${k}" aria-label="That's wrong">${I.thumbDown}</button><button aria-label="Copy">${I.copy}</button></div>`;
      }
    }

    d.lifts.forEach(l => {
      const k = liftKey(d.n, l.to);
      const head = (title, sub) => `<div class="top-row">${face(32)}<div><div class="who">${title}</div><div class="sub">${sub}</div></div></div>`;
      const sub = `${esc(l.interest)} · ${esc(ui.perms[l.to])}`;
      if (ui.stopped[k]) {
        h += `<div class="widget"><p>${ui.send === "ask" ? "Not sent" : "Stopped"}. Nothing went to ${esc(l.to)}, and ${esc(l.to)} won't know.</p></div>`;
      } else if (ui.pause !== "on") {
        h += `<div class="widget"><p class="muted">Lifts are paused. Nothing will go out.</p></div>`;
      } else if (ui.send === "ask" && ui.approved[k]) {
        h += `<div class="widget" id="lift-${esc(k)}">${head(`Sent to ${esc(l.to)}`, sub)}<p class="quote">"${esc(l.text)}"</p>
          <div class="row"><button class="btn small link" data-see="${esc(l.to)}">See what crosses</button></div></div>`;
      } else if (ui.send === "ask") {
        h += `<div class="widget" id="lift-${esc(k)}">${head(`A lift for ${esc(l.to)} is ready`, sub)}<p class="quote">"${esc(l.text)}"</p>
          <div class="row"><button class="btn primary" data-approve="${esc(k)}">Send</button><button class="btn" data-stop="${esc(k)}">Not this one</button><button class="btn small link" data-see="${esc(l.to)}">See what crosses</button></div>
          <div class="note">Nothing goes to ${esc(l.to)} until you tap Send. If you skip it, ${esc(l.to)} never knows.</div></div>`;
      } else {
        h += `<div class="widget" id="lift-${esc(k)}">${head(`Sending to ${esc(l.to)} in 10 minutes`, sub)}<p class="quote">"${esc(l.text)}"</p>
          <div class="row"><button class="btn" data-stop="${esc(k)}">Stop it</button><button class="btn small link" data-see="${esc(l.to)}">See what crosses</button></div>
          <div class="note">You don't need to do anything.</div></div>`;
      }
    });

    if (d.reveal) {
      h += `<div class="widget tone-blue"><div class="eyebrow">New today · ${esc(d.reveal.title)}</div><p style="margin-top:4px">${esc(d.reveal.text)}</p>`;
      const chips = d.reveal.suggested || d.reveal.interests;
      if (chips) h += `<div class="row">${chips.map(n => `<span class="chip">${esc(n)}</span>`).join("")}</div>`;
      h += `</div>`;
    }

    if (d.n >= 8 && d.signals.length && d.rule !== "normal") {
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
        h += done ? `<div class="thanks" style="margin-top:-6px">Noted. Only you see this.</div>` :
          `<div class="row" style="margin-top:-6px">${["Loved it", "It was nice", "A bit much"].map(o => `<button class="btn small" data-loop="${esc(d.n + p.about)}">${o}</button>`).join("")}</div>`;
      } else {
        const done = ui.told[d.n + p.kind + p.about];
        h += done ? `<div class="thanks" style="margin-top:-6px">Okay.</div>` :
          `<div class="row" style="margin-top:-6px"><button class="btn small" data-told="${esc(d.n + p.kind + p.about)}">${p.kind === "tell_them" ? "Tell them" : "Yes"}</button><button class="btn small" data-told="${esc(d.n + p.kind + p.about)}">Not now</button></div>`;
      }
    });

    if (!d.page && !d.reveal && !d.lifts.length && !d.prompts.length && !d.cards.length) h += `<p class="agent muted">Nothing else today. Enjoy it.</p>`;
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
    let h = `<div class="h">Your orbit</div><p class="muted" style="margin:0">Closer means more recent, never better.</p>`;
    h += `<div class="widget orbit-card"><div class="orbit-stage">${s}</div>
      <div class="carousel">${d.orbit.map(o => `<div class="pcard"><span class="tag">${esc(o.ring)}</span><b>${esc(o.name)} <span class="muted" style="font-weight:450">· ${esc(o.relation)}</span></b><span class="muted" style="font-size:13px">${esc(o.fact)}</span></div>`).join("")}</div></div>`;
    if (live.length) h += `<p class="agent">Muse is carrying a lift to ${esc(joinNames(live.map(l => l.to)))}.</p>`;
    if (ui.day >= 30) h += `<p class="agent">It's been a month. Still happy with who's in your orbit?</p><div class="row" style="margin-top:-6px"><button class="btn small">Keep it</button><button class="btn small">Change</button></div>`;
    setTimeout(() => {
      document.querySelectorAll(".messenger").forEach(g => {
        const [x, y] = pos[g.dataset.to] || [cx, cy];
        setTimeout(() => { g.style.transform = `translate(${x - 11 + 14}px, ${y - 11 - 18}px)`; }, 300 + 500 * +g.dataset.i);
      });
    }, 50);
    return h;
  }

  function journal() {
    const d = cur(), j = d.journal;
    if (!j) {
      const with_ = D.days.filter(x => x.journal).map(x => x.n);
      return `<p class="agent">Write anything. I'll use your week to understand who and what you mean, then help you find the word for it, one small question at a time.</p>
        <p class="muted" style="margin:0">Only you see this. No face, no audience.</p>
        <div class="row">${with_.map(n => `<button class="btn small" data-goto="${n}">See day ${n}</button>`).join("")}</div>`;
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
      h += `<div class="widget"><div class="who">In your words, for Dev</div>` + j.own_words.options.map(o => `<div class="draft">${esc(o)}</div>`).join("") +
        (j.own_words.left_out ? `<div class="note">Left out: ${esc(j.own_words.left_out)}.</div>` : "") +
        `<div class="row"><button class="btn small">Edit</button><button class="btn small">Copy</button></div>
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
         <div class="log-text">"${esc(l.text)}"</div><div class="log-why">Why: ${esc(d.why || "A good stretch.")}</div></div>` }); });
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
      h += `<div class="prow"><span class="avatar">${esc(m.first[0])}</span><div><b>${esc(m.first)}</b><div class="muted" style="font-size:13px">${esc(m.relation)}</div></div>
        <button class="perm" data-sheet="perm" data-who="${esc(m.first)}">${esc(ui.perms[m.first])} ${I.down}</button></div>
        <div class="ints">${D.interests.map(i => `<button class="chip ${ui.interests[m.first].has(i) ? "on" : ""}" data-int="${esc(m.first)}" data-i="${esc(i)}">${esc(i)}</button>`).join("")}</div>`;
    });
    h += `</div><p class="note" style="margin-top:0">Highlighted interests are the only things a person may ever hear about.</p>`;
    h += `<p class="agent">Every so often, just for you: is anyone pushing you to share more than you want to?</p>`;
    return h;
  }

  function levelHelp(l) {
    return { "Always": "Gets a lift whenever you're a little off your normal, and sometimes on good weeks.",
             "When it matters": "Only after a clearly heavy stretch.",
             "Just this once": "One lift, then it switches to Never.",
             "Never": "Never gets a lift. Private prompts to you still work." }[l];
  }

  // A picker that rises from the bottom, like Muse's own choice sheets.
  function sheet() {
    const layer = $("#sheet");
    if (!ui.sheet) { layer.className = "sheet-layer"; layer.innerHTML = ""; return; }
    let title, opts;
    if (ui.sheet === "pause") {
      title = "Lifts";
      opts = [["on", "On", "Lifts go out when your settings allow"], ["day", "Pause today", "Nothing goes out today"], ["week", "Pause this week", "Nothing goes out for 7 days"]]
        .map(([k, t, s]) => [ui.pause === k, `data-pause="${k}"`, t, s]);
    } else if (ui.sheet === "send") {
      title = "Before a lift is sent";
      opts = [["ask", "Ask me first", "Each lift waits until you tap Send"], ["auto", "Send on its own", "You get 10 minutes to stop it"]]
        .map(([k, t, s]) => [ui.send === k, `data-send="${k}"`, t, s]);
    } else {
      const who = ui.sheetWho;
      title = `When ${who} may get a lift`;
      opts = LEVELS.map(l => [ui.perms[who] === l, `data-perm="${esc(who)}" data-level="${esc(l)}"`, l, levelHelp(l)]);
    }
    layer.className = "sheet-layer open";
    layer.innerHTML = `<div class="sheet"><div class="sh-title">${esc(title)}</div>` +
      opts.map(([on, attr, t, s]) => `<button class="opt" ${attr}><span class="ck">${on ? I.check : ""}</span><span><b>${esc(t)}</b><span>${esc(s)}</span></span></button>`).join("") + `</div>`;
  }

  function composer(el, placeholder) {
    el.innerHTML = `<div class="ph">${esc(placeholder)}</div><div class="bar"><span class="ic">${I.plus}</span><span class="sp"></span>
      <span class="thinking">Thinking</span><span class="ic">${I.mic}</span><span class="ic go">${I.wave}</span></div>`;
  }

  // ---------------- The friend's side ----------------
  function receiver() {
    const d = cur();
    $("#rxPick").innerHTML = circle.map(m => `<button class="chip ${ui.rx === m.first ? "on" : ""}" data-rx="${esc(m.first)}">${esc(m.first)}</button>`).join("");
    $("#rxWho").textContent = ui.rx + "'s Muse";
    const l = allLifts(ui.day).filter(x => x.to === ui.rx && ui.day - x.n <= 2).pop();
    let h = `<p class="hello">${greet()}, ${esc(ui.rx)}.</p>`;
    if (l) {
      h += `<p class="agent">One thing from your circle tonight.</p>
        <div class="widget" id="rx-lift"><div class="eyebrow">Someone in your circle could use something small</div>
        <p class="quote" style="margin-top:6px">${esc(l.text)}</p>
        <div class="rx-sign">${face(24)}<span>Suggested by Muse. ${esc(D.owner)} didn't ask.</span></div>
        <div class="row"><button class="btn primary small">Plan something</button><button class="btn small">Not now</button></div></div>
        <div class="note" style="margin-top:0">That's everything ${esc(ui.rx)} sees: no feelings, no reasons, nothing ${esc(D.owner)} wrote.</div>`;
    } else {
      h += `<p class="agent">Your circle's quiet today. Nothing to do. Enjoy it.</p>`;
    }
    h += `<div class="note" style="margin-top:auto">No subscription needed to receive. Lifts can also arrive in Instagram.</div>`;
    $("#rxScreen").innerHTML = h;
  }

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
  document.querySelectorAll(".appbar .pair").forEach(e => { e.innerHTML = I.compose + I.more; });

  function render() {
    const d = cur();
    let newDay = false;
    if (d.n !== lastDay) {  // follow the day's lift to the friend who gets it
      newDay = lastDay !== null;
      lastDay = d.n;
      if (d.lifts.length && !d.lifts.some(l => l.to === ui.rx)) ui.rx = d.lifts[0].to;
    }
    $("#day").value = ui.day;
    $("#dayLabel").innerHTML = `Day ${d.n} · ${esc(d.weekday)} <small>${fmtDate(d.date)}</small>`;
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === ui.tab));
    document.querySelectorAll(".views button").forEach(b => b.classList.toggle("on", b.dataset.view === ui.view));
    $("#screen").innerHTML = TABS[ui.tab]();
    composer($("#composerA"), ui.tab === "journal" ? "Write anything..." : "Ask Muse...");
    composer($("#composerB"), "Ask Muse...");
    sheet();
    receiver();
    $("#panel").innerHTML = ui.view === "crosses" ? crosses() : hood();
    if (newDay && ui.send === "auto" && ui.tab === "today") {
      const l = d.lifts.find(x => x.to === ui.rx && delivered(d.n, x.to));
      if (l) fly(document.getElementById("lift-" + liftKey(d.n, l.to)), $("#rx-lift"), l.text);
    }
  }

  document.addEventListener("click", e => {
    if (e.target.id === "sheet") { ui.sheet = null; render(); return; }  // tap outside the sheet closes it
    const t = e.target.closest("button");
    if (!t) return;
    const ds = t.dataset;
    let flyKey = null;
    if (ds.tab) { ui.tab = ds.tab; ui.sheet = null; }
    else if (ds.view) ui.view = ds.view;
    else if (ds.think) ui.think[ds.think] = !ui.think[ds.think];
    else if (ds.right) ui.right[ds.right] = !ui.right[ds.right];
    else if (ds.wrong) ui.wrong[ds.wrong] = ds.quick ? "yes" : "open";
    else if (ds.wrongReason) ui.wrong[ds.k] = ds.wrongReason;
    else if (ds.stop) ui.stopped[ds.stop] = true;
    else if (ds.approve) { ui.approved[ds.approve] = true; ui.rx = ds.approve.split(":")[1]; flyKey = ds.approve; }
    else if (ds.sheet) { ui.sheet = ds.sheet; ui.sheetWho = ds.who || null; }
    else if (ds.send) { ui.send = ds.send; ui.sheet = null; }
    else if (ds.see) { ui.rx = ds.see; ui.view = "crosses"; }
    else if (ds.rx) ui.rx = ds.rx;
    else if (ds.goto) ui.day = +ds.goto;
    else if (ds.pause) { ui.pause = ds.pause; ui.sheet = null; }
    else if (ds.perm) { ui.perms[ds.perm] = ds.level; ui.sheet = null; }
    else if (ds.int) { const s = ui.interests[ds.int]; s.has(ds.i) ? s.delete(ds.i) : s.add(ds.i); }
    else if (ds.told) ui.told[ds.told] = true;
    else if (ds.loop) ui.loop[ds.loop] = true;
    else if (t.id === "prev") ui.day = Math.max(1, ui.day - 1);
    else if (t.id === "next") ui.day = Math.min(D.days.length, ui.day + 1);
    else return;
    render();
    if (flyKey) {
      const l = cur().lifts.find(x => liftKey(cur().n, x.to) === flyKey);
      if (l) fly(document.getElementById("lift-" + flyKey), $("#rx-lift"), l.text);
    }
  });
  $("#day").addEventListener("input", e => { ui.day = +e.target.value; render(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && ui.sheet) { ui.sheet = null; render(); return; }
    if (e.key === "ArrowLeft") { ui.day = Math.max(1, ui.day - 1); render(); }
    if (e.key === "ArrowRight") { ui.day = Math.min(D.days.length, ui.day + 1); render(); }
  });
  $("#day").max = D.days.length;
  const q = new URLSearchParams(location.search);
  if (q.get("day")) ui.day = Math.min(D.days.length, Math.max(1, +q.get("day")));
  if (q.get("tab") && TABS[q.get("tab")]) ui.tab = q.get("tab");
  if (q.get("view")) ui.view = q.get("view");
  if (q.get("send") === "auto") ui.send = "auto";
  if (q.get("theme")) document.documentElement.dataset.theme = q.get("theme");
  render();
})();
