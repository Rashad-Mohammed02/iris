// Muse Circle prototype screens. Reads window.DEMO (written by scripts/run_demo.py)
// and window.BENCH (written by bench/export_web.py). No network calls.

(function () {
  const D = window.DEMO;
  const B = window.BENCH || null;
  const circle = D.settings.circle.map(m => Object.assign({ first: m.name.split(" ")[0] }, m));
  const LEVELS = ["Always", "When it matters", "Just this once", "Never"];
  const ui = {
    day: 26, tab: "today", view: "crosses", rx: "Sam",
    wrong: {}, stopped: {}, perms: {}, interests: {}, pause: "on", told: {}, loop: {},
  };
  circle.forEach(m => { ui.perms[m.first] = m.permission; ui.interests[m.first] = new Set(m.allowed_interests || D.interests); });

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cur = () => D.days[ui.day - 1];
  const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const liftKey = (n, to) => n + ":" + to;
  const liftTime = n => ["8:52 PM", "9:14 PM", "7:40 PM", "9:03 PM"][n % 4];

  function allLifts(upto) {
    const out = [];
    D.days.slice(0, upto).forEach(d => d.lifts.forEach(l => out.push(Object.assign({ n: d.n, weekday: d.weekday, why: d.why }, l))));
    return out.filter(l => !ui.stopped[liftKey(l.n, l.to)]);
  }

  function face(size, extra) {
    return `<svg class="face ${extra || ""}" viewBox="0 0 30 30" width="${size}" height="${size}" aria-hidden="true">
      <circle class="f" cx="15" cy="15" r="14"/><circle class="e" cx="10.5" cy="13" r="1.8"/><circle class="e" cx="19.5" cy="13" r="1.8"/>
      <path d="M10.5 18.5 Q15 21.5 19.5 18.5" stroke="var(--surface)" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
  }

  // ---------------- Arjun's screens ----------------
  function today() {
    const d = cur(); let h = "";
    const phase = d.n < 7 ? "Learning your normal" : "";
    h += `<div class="date">${esc(d.weekday)}<small>Day ${d.n} · ${fmtDate(d.date)}${phase ? " · " + phase : ""}</small></div>`;

    d.cards.forEach(c => { h += `<div class="card safety"><div class="eyebrow">Just for you</div><p>${esc(c.text)}</p></div>`; });

    if (d.reveal) {
      h += `<div class="card reveal"><div class="eyebrow">New today · ${esc(d.reveal.title)}</div><p>${esc(d.reveal.text)}</p>`;
      if (d.reveal.suggested) h += `<div class="row">${d.reveal.suggested.map(n => `<span class="chip on">${esc(n)}</span>`).join("")}</div>`;
      if (d.reveal.interests) h += `<div class="row">${d.reveal.interests.map(n => `<span class="chip on">${esc(n)}</span>`).join("")}</div>`;
      h += `</div>`;
    }

    if (d.page) {
      const w = ui.wrong["page" + d.n];
      h += `<div class="card"><h3>Your page</h3><p class="page-text">${esc(d.page)}</p>`;
      if (w === "open") {
        h += `<div class="row">${["Late is normal for me", "Not what it was about", "Something else"].map(r =>
          `<button class="btn small" data-wrong-reason="${esc(r)}" data-k="page${d.n}">${esc(r)}</button>`).join("")}</div>`;
      } else if (w) {
        h += `<div class="thanks">Got it: "${esc(w)}". Muse will weigh that from now on, and it won't count as a sign.</div>`;
      } else {
        h += `<div class="row"><button class="btn small" data-right>That's right</button><button class="btn small wrong" data-wrong="page${d.n}">That's wrong</button></div>`;
      }
      h += `</div>`;
    }

    if (d.n >= 8 && d.signals.length && d.rule !== "normal") {
      const w = ui.wrong["off" + d.n];
      h += `<div class="card off"><div class="eyebrow">A little off your normal</div><p>${esc(cap(d.signals.join(", ")))}.</p>`;
      h += w ? `<div class="thanks">Thanks. Muse won't count that next time.</div>`
             : `<div class="row"><button class="btn small wrong" data-wrong="off${d.n}" data-quick="1">That's wrong</button></div>`;
      h += `<div class="note">Only you see this. Compared with your own normal, never anyone else's.</div></div>`;
    }

    d.lifts.forEach(l => {
      const k = liftKey(d.n, l.to);
      if (ui.stopped[k]) {
        h += `<div class="card"><p>Stopped. Nothing went to ${esc(l.to)}, and ${esc(l.to)} won't know.</p></div>`;
      } else if (ui.pause !== "on") {
        h += `<div class="card"><p class="muted">Lifts are paused. Nothing will go out.</p></div>`;
      } else {
        h += `<div class="card liftcard"><div class="eyebrow">Sending a lift to ${esc(l.to)} in 10 minutes</div>
          <p style="margin-top:6px">"${esc(l.text)}"</p>
          <div class="row"><button class="btn small" data-stop="${esc(k)}">Stop it</button><button class="btn small" data-see="${esc(l.to)}">See what crosses</button></div>
          <div class="note">You don't need to do anything. ${esc(l.to)} is set to "${esc(ui.perms[l.to])}".</div></div>`;
      }
    });

    d.prompts.forEach(p => {
      if (p.kind === "close_the_loop") {
        const done = ui.loop[d.n + p.about];
        h += `<div class="card"><p>${esc(p.text)}</p>` + (done ? `<div class="thanks">Noted. Only you see this.</div>` :
          `<div class="row">${["Loved it", "It was nice", "A bit much"].map(o => `<button class="btn small" data-loop="${esc(d.n + p.about)}">${o}</button>`).join("")}</div>`) + `</div>`;
      } else {
        const done = ui.told[d.n + p.kind + p.about];
        h += `<div class="card"><p>${esc(p.text)}</p>` + (done ? `<div class="thanks">Okay.</div>` :
          `<div class="row"><button class="btn small" data-told="${esc(d.n + p.kind + p.about)}">${p.kind === "tell_them" ? "Tell them" : "Yes"}</button><button class="btn small" data-told="${esc(d.n + p.kind + p.about)}">Not now</button></div>`) + `</div>`;
      }
    });

    if (!d.page && !d.reveal && !d.lifts.length && !d.prompts.length) h += `<div class="empty">Nothing today. Enjoy it.</div>`;
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
    let svg = `<svg class="orbit" viewBox="0 0 340 340" role="img" aria-label="Your orbit">`;
    Object.entries(R).forEach(([k, r]) => {
      svg += `<circle class="ring" cx="${cx}" cy="${cy}" r="${r}"/><text class="ring-label" text-anchor="middle" x="${cx}" y="${cy + r + 11}">${k}</text>`;
    });
    svg += `<circle class="sun" cx="${cx}" cy="${cy}" r="26"/><text class="sunname" x="${cx}" y="${cy + 4}">${esc(D.owner)}</text>`;
    d.orbit.forEach(o => {
      const [x, y] = pos[o.name];
      svg += `<circle class="planet" cx="${x}" cy="${y}" r="20"/><text class="pname" x="${x}" y="${y + 4}">${esc(o.name)}</text>`;
    });
    const live = d.lifts.filter(l => !ui.stopped[liftKey(d.n, l.to)] && ui.pause === "on");
    live.forEach((l, i) => {
      svg += `<g class="messenger" data-to="${esc(l.to)}" data-i="${i}" style="transform: translate(${cx + 16}px, ${cy - 40}px)">
        <foreignObject width="22" height="22">${face(22)}</foreignObject></g>`;
    });
    svg += `</svg>`;
    let h = `<div class="date">Your orbit<small>Closer means more recent, never better.</small></div><div class="orbit-wrap">${svg}</div>`;
    if (live.length) h += `<p class="note" style="text-align:center;margin-top:-4px">Muse is carrying a lift to ${esc(live.map(l => l.to).join(" and "))}.</p>`;
    h += `<div class="people-list">` + d.orbit.map(o =>
      `<div class="person"><div><b>${esc(o.name)}</b> <span class="muted">· ${esc(o.relation)}</span><div class="muted" style="font-size:13px">${esc(o.fact)}</div></div><span class="ring-tag">${esc(o.ring)}</span></div>`).join("") + `</div>`;
    if (ui.day >= 30) h += `<div class="card"><p>It's been a month. Still happy with who's in your orbit?</p><div class="row"><button class="btn small">Keep it</button><button class="btn small">Change</button></div></div>`;
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
      return `<div class="date">Journal<small>Only you see this. No face, no audience.</small></div>
        <div class="card"><p class="muted">Write anything. Muse uses your week to understand who and what you mean, then helps you find the word for it, one small question at a time.</p></div>
        <div class="empty">No entry today.<div class="row" style="justify-content:center">${with_.map(n => `<button class="btn small" data-goto="${n}">See day ${n}</button>`).join("")}</div></div>`;
    }
    let h = `<div class="date">Journal<small>Day ${d.n} · only you see this</small></div>`;
    j.turns.forEach((t, i) => {
      h += `<div class="bubble me">${esc(t.user)}</div>`;
      if (t.connection) h += `<div class="connection">Muse connected this to your week</div>`;
      h += `<div class="bubble muse">${esc(t.reply)}</div>`;
      const next = (j.turns[i + 1] || {}).user || "";
      const words = t.feeling_words && t.feeling_words.length ? t.feeling_words : t.chips || [];
      const chips = [];
      if (t.about_chip && i === 1) chips.push(`<span class="chip on">${esc(t.about_chip)}</span>`);
      words.forEach(w => chips.push(`<span class="chip ${next.toLowerCase().includes(w.toLowerCase()) ? "on" : ""}">${esc(w)}</span>`));
      if (chips.length && t.step !== "safety") h += `<div class="bubble-extra">${chips.join("")}</div>`;
    });
    if (j.own_words && j.own_words.options) {
      h += `<div class="card"><h3>In your words, for Dev</h3>` + j.own_words.options.map(o => `<div class="draft">${esc(o)}</div>`).join("") +
        (j.own_words.left_out ? `<div class="note">Left out: ${esc(j.own_words.left_out)}.</div>` : "") +
        `<div class="row"><button class="btn small">Edit</button><button class="btn small">Copy</button></div>
         <div class="note">Muse never sends this. You do, if you want to.</div></div>`;
    }
    return h;
  }

  function lifts() {
    let h = `<div class="date">Sent for you<small>Every lift, to whom, and why. Only you see this.</small></div>`;
    h += `<div class="seg" style="grid-template-columns:repeat(3,1fr)">${[["on", "Lifts on"], ["day", "Pause a day"], ["week", "Pause a week"]].map(([k, t]) =>
      `<button data-pause="${k}" class="${ui.pause === k ? "on" : ""}">${t}</button>`).join("")}</div>`;
    const items = [];
    D.days.slice(0, ui.day).forEach(d => {
      d.lifts.forEach(l => { if (!ui.stopped[liftKey(d.n, l.to)]) items.push({ n: d.n, html:
        `<div class="log-item"><div class="log-meta"><span>${esc(d.weekday)} · Day ${d.n} · ${liftTime(d.n)}</span><b>To ${esc(l.to)}</b></div>
         <div class="log-text">"${esc(l.text)}"</div><div class="log-why">Why: ${esc(d.why || "A good stretch.")}</div></div>` }); });
      const held = d.log.filter(x => x.kind === "held").map(x => x.text.replace(/^Held a lift to (.*): one per week\.$/, "$1"));
      if (held.length) items.push({ n: d.n, html:
        `<div class="log-item held">Day ${d.n} · Held lifts to ${esc(joinNames(held))}: one per person per week.</div>` });
    });
    h += `<div class="card" style="padding:4px 14px">${items.length ? items.reverse().map(i => i.html).join("") : `<p class="empty">No lifts yet. Muse is learning your normal.</p>`}</div>`;
    h += `<div class="note">At most one lift per person per week. Every lift waits 10 minutes so you can stop it.</div>`;
    return h;
  }

  function people() {
    let h = `<div class="date">Your people<small>Nobody can see what you chose. Changing it never tells anyone.</small></div>`;
    circle.forEach(m => {
      h += `<div class="card"><div><b>${esc(m.first)}</b> <span class="muted">· ${esc(m.relation)}</span></div>
        <div class="seg">${LEVELS.map(l => `<button data-perm="${esc(m.first)}" data-level="${esc(l)}" class="${ui.perms[m.first] === l ? "on" : ""}">${esc(l)}</button>`).join("")}</div>
        <div class="note">${esc(levelHelp(ui.perms[m.first]))}</div>
        <div class="row">${D.interests.map(i => `<button class="chip ${ui.interests[m.first].has(i) ? "on" : ""}" data-int="${esc(m.first)}" data-i="${esc(i)}">${esc(i)}</button>`).join("")}</div>
        <div class="note">Interests ${esc(m.first)} may ever hear about.</div></div>`;
    });
    h += `<div class="card"><p class="muted">Every so often, just for you: is anyone pushing you to share more than you want to?</p></div>`;
    return h;
  }

  function levelHelp(l) {
    return { "Always": "Gets a lift whenever you're a little off your normal, and sometimes on good weeks.",
             "When it matters": "Only after a clearly heavy stretch.",
             "Just this once": "One lift, then it switches to Never.",
             "Never": "Never gets a lift. Private prompts to you still work." }[l];
  }

  // ---------------- The friend's side ----------------
  function receiver() {
    const d = cur();
    $("#rxPick").innerHTML = circle.map(m => `<button class="chip ${ui.rx === m.first ? "on" : ""}" data-rx="${esc(m.first)}">${esc(m.first)}</button>`).join("");
    $("#rxWho").textContent = ui.rx + "'s Muse";
    const l = allLifts(ui.day).filter(x => x.to === ui.rx && ui.day - x.n <= 2 && ui.pause === "on").pop();
    let h = `<div class="rx-head">Your circle today<div class="muted" style="font-size:13px;font-weight:450">${esc(d.weekday)}, ${fmtDate(d.date)}</div></div>`;
    if (l) {
      h += `<div class="card liftcard"><div class="eyebrow">One person in your circle could use something small</div>
        <p class="rx-lift">${esc(l.text)}</p>
        <div class="rx-sign">${face(26)}<span>Suggested by Muse. ${esc(D.owner)} didn't ask.</span></div>
        <div class="row"><button class="btn small primary">Plan something</button><button class="btn small">Not now</button></div></div>
        <div class="note">That's everything ${esc(ui.rx)} sees: no feelings, no reasons, nothing ${esc(D.owner)} wrote.</div>`;
    } else {
      h += `<div class="card"><p>Your circle's quiet today. Nothing to do. Enjoy it.</p></div>`;
    }
    h += `<div class="note" style="margin-top:auto">No subscription needed to receive. Lifts can also arrive in Instagram through Meta AI.</div>`;
    $("#rxScreen").innerHTML = h;
  }

  // ---------------- Side panel ----------------
  function crosses() {
    const d = cur();
    const l = allLifts(ui.day).filter(x => ui.day - x.n <= 2).find(x => x.to === ui.rx) || d.lifts[0] || allLifts(ui.day).pop();
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
    return `<h2>What crosses to ${esc(l.to)}</h2><p class="lede">Day ${l.n}. The writer never saw anything on the left. It only knew "${esc(D.owner)}", "${esc(l.to)}" and "${esc(l.interest)}".</p>
      <div class="split">
        <div class="col stays"><h4>Stays with ${esc(D.owner)}</h4><ul>${stays.map(s => `<li>${esc(s)}</li>`).join("")}</ul></div>
        <div class="col crosses"><h4>Crosses to ${esc(l.to)}</h4><ul>
          <li>"${esc(l.text)}"</li><li>One interest he allowed for ${esc(l.to)}: ${esc(l.interest)}</li><li>That it came from Muse, not from ${esc(D.owner)}</li></ul></div>
      </div>
      <div class="checks">${checks.map(([ok, t]) => `<div class="check"><span class="dot ${ok ? "" : "bad"}"></span><span>${esc(t)}</span></div>`).join("")}</div>
      <p class="note">Written on try ${l.tries || 1}${l.fallback ? ", using the safe fallback line" : ""}. Every lift passes both checks before it can be queued.</p>`;
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
        return `<tr><td>${esc(m.first)}</td><td>${esc(m.permission)}</td><td>${l ? `<span class="pill ok">Lift queued</span>` : `<span class="pill no">${esc(ns ? ns.why : "Nothing to lift")}</span>`}</td></tr>`;
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
  function render() {
    const d = cur();
    if (d.n !== lastDay) {  // follow the day's lift to the friend who gets it
      lastDay = d.n;
      if (d.lifts.length && !d.lifts.some(l => l.to === ui.rx)) ui.rx = d.lifts[0].to;
    }
    $("#day").value = ui.day;
    $("#dayLabel").innerHTML = `Day ${d.n} · ${esc(d.weekday)} <small>${fmtDate(d.date)}</small>`;
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === ui.tab));
    document.querySelectorAll(".views button").forEach(b => b.classList.toggle("on", b.dataset.view === ui.view));
    $("#screen").innerHTML = TABS[ui.tab]();
    receiver();
    $("#panel").innerHTML = ui.view === "crosses" ? crosses() : hood();
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("button");
    if (!t) return;
    const ds = t.dataset;
    if (ds.tab) ui.tab = ds.tab;
    else if (ds.view) ui.view = ds.view;
    else if (ds.wrong) ui.wrong[ds.wrong] = ds.quick ? "yes" : "open";
    else if (ds.wrongReason) ui.wrong[ds.k] = ds.wrongReason;
    else if (ds.stop) ui.stopped[ds.stop] = true;
    else if (ds.see) { ui.rx = ds.see; ui.view = "crosses"; }
    else if (ds.rx) ui.rx = ds.rx;
    else if (ds.goto) ui.day = +ds.goto;
    else if (ds.pause) ui.pause = ds.pause;
    else if (ds.perm) ui.perms[ds.perm] = ds.level;
    else if (ds.int) { const s = ui.interests[ds.int]; s.has(ds.i) ? s.delete(ds.i) : s.add(ds.i); }
    else if (ds.told) ui.told[ds.told] = true;
    else if (ds.loop) ui.loop[ds.loop] = true;
    else if (t.id === "prev") ui.day = Math.max(1, ui.day - 1);
    else if (t.id === "next") ui.day = Math.min(D.days.length, ui.day + 1);
    else return;
    render();
  });
  $("#day").addEventListener("input", e => { ui.day = +e.target.value; render(); });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") { ui.day = Math.max(1, ui.day - 1); render(); }
    if (e.key === "ArrowRight") { ui.day = Math.min(D.days.length, ui.day + 1); render(); }
  });
  $("#day").max = D.days.length;
  const q = new URLSearchParams(location.search);
  if (q.get("day")) ui.day = Math.min(D.days.length, Math.max(1, +q.get("day")));
  if (q.get("tab") && TABS[q.get("tab")]) ui.tab = q.get("tab");
  if (q.get("view")) ui.view = q.get("view");
  if (q.get("theme")) document.documentElement.dataset.theme = q.get("theme");
  render();
})();
