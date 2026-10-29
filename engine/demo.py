"""Turn Arjun's Instagram export and his simulated connector feeds into what
each part of Iris reads on a given day: the v2 situation for a note decision,
the journal's context, the orbit, and the plain facts behind the Daily Page.

Everything here comes from his own side of the data (see data/parse_export.py).
People outside his 5 are never named in anything that goes to Muse.
"""

import json
import re
import sys
from collections import Counter
from datetime import date, timedelta
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.baseline import baseline_for, daily_signals, load_events, load_profile  # noqa: E402
from engine.connectors import Feeds  # noqa: E402
from engine.rule import evaluate  # noqa: E402

OUT = ROOT / "out"
SETTINGS = ROOT / "data" / "demo_settings.json"
THEMES = ROOT / "data" / "demo_export" / "_simulated" / "reel_theme_hints.json"
WINDOW = 5  # the "recent" window, in days


def clock(h):
    """25.5 -> '1:30 AM'."""
    h = h % 24
    hh, mm = int(h), int(round((h - int(h)) * 60)) % 60
    return f"{(hh % 12) or 12}:{mm:02d} {'AM' if hh < 12 else 'PM'}"


# What the rule found off his own normal, in plain words (shown to Muse and in his private log).
SIGNAL_WORDS = {
    "later_to_sleep": "getting to sleep later than usual",
    "shorter_rest": "shorter nights than usual",
    "longer_rest": "sleeping much longer than usual",
    "woke_in_night": "up in the middle of your usual rest",
    "daytime_binge": "a lot more scrolling during the day",
    "more_sessions": "picking up your phone more often",
    "more_reels": "more reels than usual",
    "heavier_reels": "heavier reels than usual",
    "interest_fading": "less of what you usually love",
    "sending_heavy_reels": "sending heavier reels",
    "slower_replies": "slower replies",
    "shorter_replies": "shorter replies",
    "fewer_messages": "fewer messages to your people",
    "more_messages": "a lot more messages than usual",
    "fewer_starts": "starting fewer conversations",
    "gone_quiet": "gone quiet with someone",
}

REST_WORDS = {"later_to_sleep": "got to sleep later than usual", "shorter_rest": "a shorter night than usual",
              "longer_rest": "slept much longer than usual", "woke_in_night": "up for a while in the middle of the night"}


def weekday(day):
    return date.fromisoformat(day).strftime("%A")


class Demo:
    def __init__(self):
        self.events = load_events()
        self.profile = load_profile()
        self.rows = daily_signals(self.events, self.profile)
        self.rule = evaluate(self.events, self.profile)
        self.settings = json.loads(SETTINGS.read_text())
        hints = json.loads(THEMES.read_text()) if THEMES.exists() else {"themes": {}}
        self.theme_label = {k: v["label"] for k, v in hints["themes"].items()}
        self.heavy = {k for k, v in hints["themes"].items() if v.get("heavy")}
        ip = OUT / "interests.json"
        found = json.loads(ip.read_text()) if ip.exists() else []
        self.interests = [i["name"] for i in found]
        # reel theme -> interest name, from where each interest was found ("reel:f1" -> "F1")
        self.theme_interest = {src[5:]: i["name"] for i in found for src in i.get("from", []) if src.startswith("reel:")}
        url_theme = {}
        for e in self.events:
            if e["type"] == "reel_watched" and e.get("url"):
                url_theme[e["url"]] = e.get("theme")
        self.url_theme = url_theme
        self.days = [r["day"] for r in self.rows]
        self.by_day = {}
        for e in self.events:
            self.by_day.setdefault(e["day"], []).append(e)
        # Only the people he put in his Iris circle are ever named to Muse. Everyone else he talks to,
        # and every group chat, stays out of what Muse reads (they never agreed to anything).
        self.circle = {m["name"] for m in self.settings["circle"]}
        self.settings_names = [m["name"] for m in self.settings["circle"]]
        self.feeds = Feeds.demo()   # SIMULATED calendar and Spotify feeds (data/demo_connectors/)
        self._outsiders = self.outsiders()
        self.owner = self.profile["owner"]["name"]
        self.first = self.owner.split()[0]

    # ---- small helpers -------------------------------------------------
    def themes(self, days, heavy=None, top=3):
        c = Counter(e["theme"] for d in days for e in self.by_day.get(d, [])
                    if e["type"] == "reel_watched" and e.get("theme")
                    and (heavy is None or (e["theme"] in self.heavy) == heavy))
        return [self.theme_label.get(t, t) for t, _ in c.most_common(top)]

    def last_contact(self, name, upto):
        """Index of the last day on or before `upto` with a 1:1 message either way."""
        for j in range(upto, -1, -1):
            p = self.rows[j]["people"].get(name)
            if p and (p["sent"] or p["received"]):
                return j
        return None

    def shared_interests(self, name, upto, top=2, min_count=3):
        """What he and this friend share, from the reels he sends them. Only his own side, never theirs."""
        c = Counter()
        for d in self.days[:upto + 1]:
            for e in self.by_day.get(d, []):
                if e["type"] == "reel_sent" and e.get("to") == name:
                    interest = self.theme_interest.get(self.url_theme.get(e.get("url")))
                    if interest:
                        c[interest] += 1
        return [i for i, n in c.most_common(top) if n >= min_count]

    def crisis_content(self, day):
        """Crisis-themed reels today: watched, and chosen (saved or sent)."""
        from engine.safety import CRISIS_THEMES
        evs = self.by_day.get(day, [])
        watched = sum(1 for e in evs if e["type"] == "reel_watched" and e.get("theme") in CRISIS_THEMES)
        chosen = sum(1 for e in evs if e["type"] in ("post_saved", "reel_sent")
                     and (e.get("theme") or self.url_theme.get(e.get("url"))) in CRISIS_THEMES)
        return {"watched": watched, "chosen": chosen}

    def reels_sent(self, name, days):
        return sum(1 for d in days for e in self.by_day.get(d, []) if e["type"] == "reel_sent" and e.get("to") == name)

    # ---- what the v2 engine reads ---------------------------------------
    def outsiders(self):
        """Everyone he talks to or meets who isn't in his Iris 5, and every group chat's name.
        They never agreed to anything, so their names never reach Muse."""
        people, groups = set(), set()
        for t in self.profile["threads"]:
            people.update(o for o in t["others"] if o not in self.circle)
            if t["group"]:
                groups.add(t["title"])
        for e in self.feeds.events:
            people.update(w for w in e.get("with", []) if w not in self.circle)
        firsts = {c.split()[0] for c in self.circle}
        words = set(groups)
        for n in people:
            words.add(n)
            if n.split() and n.split()[0] not in firsts:
                words.add(n.split()[0])
        return sorted((w for w in words if w), key=len, reverse=True)

    def scrub(self, text):
        for n in self._outsiders:
            text = re.sub(r"(?<!\w)" + re.escape(n) + r"(?!\w)", "someone", text, flags=re.I)
        return text

    def _usual(self, i, fn, window=28):
        past = [fn(j) for j in range(max(0, i - window), i)]
        return round(median(past)) if past else None

    def _events(self, day):
        out = []
        for e in self.feeds.events_on(day):
            inner = [w.split()[0] for w in e.get("with", []) if w in self.circle]
            outside = sum(1 for w in e.get("with", []) if w not in self.circle)
            out.append({"title": self.scrub(e["title"]), "kind": e["kind"], "all_day": e.get("all_day", False),
                        "time": None if e.get("all_day") else e["start"][11:16], "status": e.get("status", "confirmed"),
                        "with": inner + (["someone outside your 5"] * min(outside, 1))})
        return out

    def day_input(self, i):
        """One day as Muse reads it: see, hear, talk, happens, and what the rule found off his normal."""
        d, row, base = self.days[i], self.rows[i], baseline_for(self.rows, i)
        dd = date.fromisoformat(d)
        evs = self.by_day.get(d, [])
        circle_first = {n: n.split()[0] for n in self.circle}
        sent_today = lambda j: sum(1 for e in self.by_day.get(self.days[j], []) if e["type"] == "message_sent")
        own = [self.scrub(e["own_words"]) for e in sorted(evs, key=lambda e: e["ts"])
               if e["type"] == "message_sent" and e.get("own_words") and not e.get("group") and e["to"] in self.circle]
        with5 = {}
        for n in self.settings_names:
            with5[circle_first[n]] = {"sent": row["people"].get(n, {}).get("sent", 0),
                                      "usual": self._usual(i, lambda j: self.rows[j]["people"].get(n, {}).get("sent", 0)),
                                      "reels_sent": row["reels_sent_to"].get(n, 0)}
        return {
            "date": d, "weekday": weekday(d), "use_day": i + 1,
            "see": {
                "reels_watched": row["reels"], "usual_reels": round(base["reels"]["median"]) if base else None,
                "themes_today": self.themes([d], heavy=False, top=4),
                "heavy_themes": self.themes([d], heavy=True, top=3),
                "heavy_share": round(row["heavy_share"], 2),
                "usual_heavy_share": round(base["heavy_share"]["median"], 2) if base else None,
                "saved": sum(1 for e in evs if e["type"] == "post_saved"),
                "reels_sent_outside_your_5": sum(c for n, c in row["reels_sent_to"].items() if n not in self.circle),
                "crisis_content": self.crisis_content(d),
            },
            "hear": self.feeds.listening(d),
            "talk": {
                "messages_you_sent": sent_today(i), "usual": self._usual(i, sent_today),
                "with_your_5": with5,
                "outside_your_5": sum(1 for e in evs if e["type"] == "message_sent" and e["to"] not in self.circle),
                "own_words": list(dict.fromkeys(own))[:60],   # his own lines today, each once
            },
            "happens": {
                "yesterday": self._events((dd - timedelta(days=1)).isoformat()),
                "today": self._events(d),
                "tomorrow": self._events((dd + timedelta(days=1)).isoformat()),
            },
            "normal": [SIGNAL_WORDS[s] for s in self.rule[i]["off_signals"] if s in SIGNAL_WORDS],
        }

    def situation(self, i, recent_notes=None):
        """The v2 situation for engine/decide.py on day i (0-based)."""
        s = self.settings
        return {
            "id": f"demo-day-{i + 1}",
            "user": {"name": self.first, "age": s["age"], "country": s.get("country", "US")},
            "settings": {"note_time": s.get("note_time", "18:00"), "send_mode": s.get("send_mode", "auto"),
                         "sources": s.get("sources", {})},
            "circle": [{"name": m["name"].split()[0], "relation": m["relation"], "setting": m["setting"],
                        "mutual": m["mutual"], "nearby": m.get("nearby", True), "language": "en",
                        "allowed_interests": m["allowed_interests"]} for m in s["circle"]],
            "day": self.day_input(i),
            "feeds": self.feeds,
            "recent_notes": recent_notes or {},
        }

    def last_sent(self, name, upto):
        for j in range(upto, -1, -1):
            p = self.rows[j]["people"].get(name)
            if p and p["sent"]:
                return j
        return None

    # ---- the orbit ------------------------------------------------------
    def orbit(self, i):
        """Rings by how recently YOU wrote to them: distance, never a ranking."""
        out = []
        for m in self.settings["circle"]:
            n, first = m["name"], m["name"].split()[0]
            ls = self.last_sent(n, i)
            if self.reels_sent(n, [self.days[i]]):
                ls = i  # a reel is talking too
            gap = None if ls is None else i - ls
            ring = "close" if gap is not None and gap <= 3 else ("around" if gap is not None and gap <= 14 else "farther")
            if gap is None:
                fact = "No messages yet."
            elif gap == 0:
                fact = "Talked today."
            elif gap == 1:
                fact = "Last talked yesterday."
            else:
                fact = f"Last talked {weekday(self.days[ls])}."
            if self.reels_sent(n, [self.days[i]]):
                fact += f" You sent {first} a reel today."
            out.append({"name": first, "full_name": n, "relation": m["relation"], "ring": ring,
                        "fact": fact, "setting": m.get("setting")})
        return out

    # ---- the Daily Page's raw facts (private) ---------------------------
    def day_facts(self, i):
        row, base = self.rows[i], baseline_for(self.rows, i)
        d = self.days[i]
        talked = sorted(((p["sent"], n.split()[0]) for n, p in row["people"].items() if p["sent"]), reverse=True)
        groups = Counter(e["to"] for e in self.by_day.get(d, []) if e["type"] == "message_sent" and e.get("group"))
        off = self.rule[i]["off_signals"]
        late = "later_to_sleep" in off
        top_group = groups.most_common(1)[0][0] if groups else None
        members = next((t["others"] for t in self.profile["threads"] if t["title"] == top_group), [])
        return {
            "day": f"{weekday(d)}, day {i + 1}",
            # The time only counts when it's later than his own usual for this kind of night.
            "up_later_than_usual": late,
            "last_active": clock(row["last_active"]) if late else None,
            "usual_last_active": clock(base["rest_start"]["median"]) if late and base and base["rest_start"] else None,
            "reels_watched": row["reels"],
            "usual_reels": round(base["reels"]["median"]) if base and base["reels"] else None,
            "reel_themes_today": self.themes([d], top=3),
            "talked_most_with": [n for _, n in talked[:2]],
            "reels_sent_to": {n.split()[0]: c for n, c in row["reels_sent_to"].items()},
            "busiest_group_chat": {"name": top_group, "members": [m.split()[0] for m in members]} if top_group else None,
            "quiet_with": [q.split()[0] for q in self.rule[i]["quiet_with"]],
            "interests_today": [t for t in self.themes([d], heavy=False, top=2)],
            # Plain words for the page, each already measured against his own normal. No clock times.
            "rest": [REST_WORDS[s] for s in REST_WORDS if s in off],
            "scrolled_more_in_the_day": "daytime_binge" in off,
        }

    # ---- the journal's context -----------------------------------------
    def journal_context(self, i, named_before=()):
        orbit = self.orbit(i)
        facts = self.day_facts(i)
        week = []
        r = self.rule[i]
        if "later_to_sleep" in r["off_signals"] or "shorter_rest" in r["off_signals"]:
            week.append("Getting to sleep later than usual this week.")
        for q in self.rule[i]["quiet_with"]:
            if q not in self.circle:
                continue
            ls = self.last_sent(q, i)
            if ls is not None and i - ls >= 2:
                week.append(f"You haven't written to {q.split()[0]} since {weekday(self.days[ls])}.")
        sent_to = self.rows[i]["reels_sent_to"]
        if sent_to:
            named = [n.split()[0] for n in sent_to if n in self.circle]
            others = "other people" if any(n not in self.circle for n in sent_to) else None
            week.append("Sent reels to " + ", ".join(named + ([others] if others else [])) + " today.")
        week.append("Reels lately: mostly " + ", ".join(facts["reel_themes_today"]).lower() + ".")
        return {"person": self.first, "country": self.settings.get("country", "US"),
                "circle": [{"name": o["name"], "relation": o["relation"], "facts": o["fact"]} for o in orbit],
                "week": week, "interests": self.interests, "named_before": list(named_before)}
