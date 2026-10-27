"""Daily signals from the owner's own events, and a personal baseline for each.

Plain Python, no AI. Everything is compared only to the owner's own normal.
The signal families follow research/SIGNALS-RESEARCH.md, Part 5: timing (when),
content (what he chose) and social (how he relates to his people).
"""

import json
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"

WEEKEND = {4, 5}          # Fri and Sat nights run later for most people; compare like with like
DAY_BLOCK = (9, 17)       # "daytime" for the daytime binge family
REST_WINDOW = (18, 38)    # where the night's rest is looked for: 6 PM to 2 PM next day, on the night-hour clock
WAKE_BURST_GAP_H = 0.5    # activity this far apart counts as separate times awake
LATEST_REST_START = 31    # night rest starts by 7 AM (31 on the night-hour clock)
DAY_STARTS = 29           # 5 AM: activity after this is the next morning
SESSION_GAP_H = 10 / 60   # a new session starts after 10 quiet minutes
NEW_CONVO_GAP_H = 3       # a message after 3 quiet hours in a thread starts a conversation
LEARNING_DAYS = 14        # nothing is judged before two weeks of normal (research Part 3)


def load_events(path=OUT / "events.jsonl"):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def load_profile(path=OUT / "profile.json"):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _night_hour(h):
    """Hours after 5 AM wrap past midnight: 01:30 becomes 25.5."""
    return h + 24 if h < 5 else h


ACTIVE = ("reel_watched", "reel_sent", "message_sent", "post_liked", "post_saved", "story_liked")


def daily_signals(events, profile):
    circle = [c["name"] for c in profile["circle"] if c.get("has_thread")]
    days = defaultdict(lambda: {
        "reels": 0, "heavy_reels": 0, "day_reels": 0, "times": [], "themes": Counter(),
        "saved": 0, "heavy_saved": 0, "heavy_sent": 0, "reels_sent": 0, "reels_sent_to": defaultdict(int),
        "sent": defaultdict(int), "received": defaultdict(int), "delays": defaultdict(list), "lengths": defaultdict(list),
        "starts": 0, "reconnects": [],
    })
    url_heavy = {e["url"]: e.get("heavy") for e in events if e["type"] == "reel_watched" and e.get("url")}
    last_in_thread = {}
    for e in sorted(events, key=lambda e: e["ts"]):
        d = days[e["day"]]
        if e["type"] in ACTIVE:
            d["times"].append(_night_hour(e["hour"]))
        if e["type"] == "reel_watched":
            d["reels"] += 1
            d["heavy_reels"] += 1 if e.get("heavy") else 0
            d["day_reels"] += 1 if DAY_BLOCK[0] <= e["hour"] < DAY_BLOCK[1] else 0
            if e.get("theme") and not e.get("heavy"):
                d["themes"][e["theme"]] += 1
        elif e["type"] == "post_saved":
            d["saved"] += 1
            d["heavy_saved"] += 1 if e.get("heavy") else 0
        elif e["type"] == "reel_sent":
            d["reels_sent"] += 1
            d["reels_sent_to"][e["to"]] += 1
            d["heavy_sent"] += 1 if url_heavy.get(e.get("url")) else 0
        elif e["type"] == "message_sent" and not e.get("group"):
            d["sent"][e["to"]] += 1
            if e.get("reply_delay_s") is not None:
                d["delays"][e["to"]].append(e["reply_delay_s"] / 60)
            if e.get("reconnect"):
                d["reconnects"].append(e["to"])
            if e.get("length"):
                d["lengths"][e["to"]].append(e["length"])
            prev = last_in_thread.get(e["to"])
            if e["to"] in circle and (prev is None or (e["ts"] - prev) / 3600 >= NEW_CONVO_GAP_H):
                d["starts"] += 1
        elif e["type"] == "message_received" and not e.get("group"):
            d["received"][e["thread"]] += 1
        if e["type"] in ("message_sent", "reel_sent", "message_received") and not e.get("group"):
            last_in_thread[e.get("to") or e.get("thread")] = e["ts"]

    rows = []
    ordered = sorted(days)
    for n, day in enumerate(ordered):
        d = days[day]
        wd = date.fromisoformat(day).weekday()
        times = sorted(d["times"])
        rest = night_rest(times, sorted(days[ordered[n + 1]]["times"]) if n + 1 < len(ordered) else None)
        sessions = (1 + sum(1 for a, b in zip(times, times[1:]) if b - a >= SESSION_GAP_H)) if times else 0
        chosen = 3 * d["saved"] + 3 * d["reels_sent"] + d["reels"]
        heavy_chosen = 3 * d["heavy_saved"] + 3 * d["heavy_sent"] + d["heavy_reels"]
        circle_delays = [x for p in circle for x in d["delays"].get(p, [])]
        circle_lengths = [x for p in circle for x in d["lengths"].get(p, [])]
        row = {
            "day": day,
            "weekend": wd in WEEKEND,
            "reels": d["reels"],
            "heavy_share": round(d["heavy_reels"] / d["reels"], 3) if d["reels"] else 0.0,
            "chosen_heavy": round(heavy_chosen / chosen, 3) if chosen else 0.0,
            "last_active": times[-1] if times else None,
            "first_active": times[0] if times else None,
            # The night's rest: the longest stretch with no activity at all, a common phone-based stand-in for sleep.
            "rest_hours": rest and rest["hours"], "rest_start": rest and rest["start"], "rest_end": rest and rest["end"],
            "night_points": rest and rest["points"],
            "day_reels": d["day_reels"],
            "sessions": sessions,
            "themes": dict(d["themes"]),
            "heavy_sent": d["heavy_sent"],
            "reels_sent_to": dict(d["reels_sent_to"]),
            "circle_sent": sum(d["sent"].get(p, 0) for p in circle),
            "circle_delay": round(median(circle_delays), 1) if circle_delays else None,
            "circle_length": round(median(circle_lengths), 1) if circle_lengths else None,
            "starts": d["starts"],
            "reconnected_with": sorted(set(d["reconnects"])),
            "people": {},
        }
        for p in circle:
            row["people"][p] = {
                "sent": d["sent"].get(p, 0),
                "received": d["received"].get(p, 0),
                "delay_min": round(median(d["delays"][p]), 1) if d["delays"].get(p) else None,
                "length": round(median(d["lengths"][p]), 1) if d["lengths"].get(p) else None,
            }
        rows.append(row)
    return rows


def night_rest(today, tomorrow):
    """The longest gap in his own activity between 6 PM and 2 PM the next day.

    Times are on the night-hour clock (01:30 is 25.5). Returns hours, when it
    started and ended, and every activity point in the window (to spot waking up
    in the middle of it). None when the next day's data isn't there yet.
    """
    if tomorrow is None:
        return None
    pts = [h for h in today if h >= REST_WINDOW[0]] + [h + 24 for h in tomorrow if h + 24 < REST_WINDOW[1]]
    pts = sorted(pts)
    if not any(x < LATEST_REST_START for x in pts) or not any(x >= DAY_STARTS for x in pts):
        return None  # no evening or no morning activity: can't tell when he slept, so don't guess
    # Only gaps with activity on both sides count, and night rest starts by 7 AM.
    gaps = [(b - a, a) for a, b in zip(pts, pts[1:]) if a < LATEST_REST_START]
    if not gaps:
        return None
    gap, start = max(gaps)
    return {"hours": round(gap, 2), "start": round(start, 2), "end": round(start + gap, 2), "points": [round(x, 2) for x in pts]}


def wakes_in(points, start, end):
    """How many separate times he was active inside his usual rest window."""
    inside = sorted(x for x in (points or []) if start < x < end)
    if not inside:
        return 0
    return 1 + sum(1 for a, b in zip(inside, inside[1:]) if b - a >= WAKE_BURST_GAP_H)


def _mad(xs, m):
    return median([abs(x - m) for x in xs]) if xs else 0.0


def stats(values):
    vals = [v for v in values if v is not None]
    if len(vals) < 3:
        return None
    m = median(vals)
    s = sorted(vals)
    return {"median": m, "mad": _mad(vals, m), "max": s[-1], "min": s[0], "n": len(vals),
            "p90": s[min(len(s) - 1, int(0.9 * len(s)))], "p10": s[int(0.1 * len(s))]}


def baseline_for(rows, i, window=28, min_days=LEARNING_DAYS, exclude=()):
    """The owner's normal before day i, from up to `window` prior days.

    Days in `exclude` (already flagged as off) are left out, so a hard stretch
    never becomes the new normal.
    """
    start = max(0, i - window)
    prior = [r for k, r in enumerate(rows[start:i], start=start) if k not in exclude]
    if i < min_days or len(prior) < min_days - 2:
        return None
    same_kind = [r for r in prior if r["weekend"] == rows[i]["weekend"]]
    kind = same_kind if len(same_kind) >= 4 else prior
    theme_totals = Counter()
    for r in prior:
        theme_totals.update(r["themes"])
    top = [t for t, _ in theme_totals.most_common(3)]
    top_share = [sum(r["themes"].get(t, 0) for t in top) / r["reels"] for r in prior if r["reels"]]
    b = {
        "days": len(prior),
        "last_active": stats([r["last_active"] for r in kind]),
        "first_active": stats([r["first_active"] for r in kind]),
        "rest_hours": stats([r["rest_hours"] for r in kind]),
        "rest_start": stats([r["rest_start"] for r in kind]),
        "rest_end": stats([r["rest_end"] for r in kind]),
        "day_reels": stats([r["day_reels"] for r in kind]),
        "sessions": stats([r["sessions"] for r in kind]),
        "reels": stats([r["reels"] for r in kind]),
        "heavy_share": stats([r["heavy_share"] for r in prior]),
        "chosen_heavy": stats([r["chosen_heavy"] for r in prior]),
        "heavy_sent": stats([r["heavy_sent"] for r in prior]),
        "top_themes": top,
        "top_share": stats(top_share),
        "circle_sent": stats([r["circle_sent"] for r in kind]),
        "circle_delay": stats([r["circle_delay"] for r in prior]),
        "circle_length": stats([r["circle_length"] for r in prior]),
        "starts": stats([r["starts"] for r in kind]),
        "people": {},
    }
    if b["rest_start"] and b["rest_end"]:
        # His usual rest window, trimmed by half an hour each side, and how often he's usually up inside it
        b["rest_window"] = (b["rest_start"]["median"] + 0.5, b["rest_end"]["median"] - 0.5)
        b["wakes"] = stats([wakes_in(r["night_points"], *b["rest_window"]) for r in prior if r["night_points"] is not None])
    else:
        b["rest_window"], b["wakes"] = None, None
    for p in rows[i]["people"]:
        sent_days = [r["people"][p]["sent"] for r in prior]
        b["people"][p] = {
            "delay_min": stats([r["people"][p]["delay_min"] for r in prior]),
            "length": stats([r["people"][p]["length"] for r in prior]),
            "talk_rate": sum(1 for s in sent_days if s > 0) / len(sent_days),
            "sent": stats(sent_days),
        }
    return b
