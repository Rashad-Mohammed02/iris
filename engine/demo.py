"""Turn Arjun's Instagram export into what each part of Here reads on a
given day: the situation for a lift decision, the journal's context, the orbit,
and the plain facts behind the Daily Page.

Everything here comes from his own side of the data (see data/parse_export.py).
"""

import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.baseline import baseline_for, daily_signals, load_events, load_profile  # noqa: E402
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

    # ---- what the lift engine reads ------------------------------------
    def situation(self, i, state=None):
        state = state or {}
        row, rule, base = self.rows[i], self.rule[i], baseline_for(self.rows, i)
        recent = self.days[max(0, i - WINDOW + 1):i + 1]
        idx = range(max(0, i - WINDOW + 1), i + 1)
        signals = {
            "rest": {
                "short_or_late_nights": sum(any(s in self.rule[j]["off_signals"] for s in ("later_to_sleep", "shorter_rest"))
                                            for j in idx),
                "woke_in_night": sum("woke_in_night" in self.rule[j]["off_signals"] for j in idx),
                "of_days": len(recent),
                "usual_rest_hours": round(base["rest_hours"]["median"], 1) if base and base["rest_hours"] else None,
                "recent_rest_hours": [self.rows[j]["rest_hours"] for j in idx],
            },
            "reel_themes": {"recent": self.themes(recent, heavy=True), "baseline": self.themes(self.days[:21], heavy=False)},
            "heavy_reel_share": {"recent": round(median(self.rows[j]["heavy_share"] for j in idx), 2),
                                 "usual": round(base["heavy_share"]["median"], 2) if base else None},
            "reels_sent_to": [{"to": n.split()[0], "count": self.reels_sent(n, recent)}
                              for n in row["people"] if self.reels_sent(n, recent)],
            "reply_rhythm": {n.split()[0]: f["evidence"] for j in idx for f in [self.rule[j]]
                             for n in f["evidence"].get("slower_replies", []) + f["evidence"].get("shorter_replies", [])},
            "quiet_with": [{"name": n.split()[0],
                            "days_since_you_wrote": i - (self.last_sent(n, i) or 0)} for n in rule["quiet_with"]],
            "interests": [{"topic": t, "status": "current"} for t in self.interests],
            "crisis_content": self.crisis_content(self.days[i]),
        }
        signals["reply_rhythm"] = sorted({n.split()[0] for j in idx for k in ("slower_replies", "shorter_replies")
                                          for n in self.rule[j]["evidence"].get(k, [])})
        sent_week = state.get("lifts_sent", [])
        circle = []
        for m in self.settings["circle"]:
            circle.append({
                "name": m["name"].split()[0], "relation": m["relation"], "permission": m["permission"],
                "mutual": m["mutual"], "language": "en",
                "lifts_last_7_days": sum(1 for l in sent_week if l["to"] == m["name"].split()[0] and i - l["day"] < 7),
                "just_this_once_used": any(l["to"] == m["name"].split()[0] for l in sent_week)
                                       and m["permission"] == "Just this once",
                "allowed_interests": self.shared_interests(m["name"], i),
            })
        stretch = "clearly_heavy" if rule["heavy_stretch"] else ("off_normal" if rule["lighter_stretch"] else "none")
        return {
            "id": f"demo-day-{i + 1}",
            "user": {"name": self.first, "age": self.settings["age"]},
            "circle": circle,
            "pattern": {"learning_day": i + 1, "window": f"last {len(recent)} days vs his own normal",
                        "signals": signals, "journal": state.get("journal", {}).get(i, []),
                        "settings": {"pause": "all lifts paused"} if state.get("paused") else {}},
            "rule_stretch": stretch,
            "send_mode": self.settings.get("send_mode", "ask_first"),
            "corrections": state.get("corrections", []),
            "recent_lines": {},
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
                        "fact": fact, "permission": m["permission"]})
        return out

    # ---- the Daily Page's raw facts (private) ---------------------------
    def day_facts(self, i):
        row, base = self.rows[i], baseline_for(self.rows, i)
        d = self.days[i]
        talked = sorted(((p["sent"], n.split()[0]) for n, p in row["people"].items() if p["sent"]), reverse=True)
        groups = Counter(e["to"] for e in self.by_day.get(d, []) if e["type"] == "message_sent" and e.get("group"))
        late = "later_to_sleep" in self.rule[i]["off_signals"]
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
            ls = self.last_sent(q, i)
            if ls is not None and i - ls >= 2:
                week.append(f"You haven't written to {q.split()[0]} since {weekday(self.days[ls])}.")
        if facts["reels_sent_to"]:
            week.append("Sent reels to " + ", ".join(facts["reels_sent_to"]) + " today.")
        week.append("Reels lately: mostly " + ", ".join(facts["reel_themes_today"]).lower() + ".")
        return {"person": self.first,
                "circle": [{"name": o["name"], "relation": o["relation"], "facts": o["fact"]} for o in orbit],
                "week": week, "interests": self.interests, "named_before": list(named_before)}
