"""Daily signals from the owner's own events, and a personal baseline for each.

Plain Python, no AI. Everything is compared only to the owner's own normal.
"""

import json
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"

WEEKEND = {4, 5}  # Fri and Sat nights run later for most people; compare like with like


def load_events(path=OUT / "events.jsonl"):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def load_profile(path=OUT / "profile.json"):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _night_hour(h):
    """Hours after 5 AM wrap past midnight: 01:30 becomes 25.5."""
    return h + 24 if h < 5 else h


def daily_signals(events, profile):
    circle = [c["name"] for c in profile["circle"] if c.get("has_thread")]
    days = defaultdict(lambda: {
        "reels": 0, "heavy_reels": 0, "last_active": None, "heavy_sent": 0, "reels_sent_to": defaultdict(int),
        "sent": defaultdict(int), "received": defaultdict(int), "delays": defaultdict(list), "lengths": defaultdict(list),
    })
    for e in events:
        d = days[e["day"]]
        nh = _night_hour(e["hour"])
        if e["type"] in ("reel_watched", "reel_sent", "message_sent", "post_liked", "post_saved", "story_liked"):
            d["last_active"] = nh if d["last_active"] is None else max(d["last_active"], nh)
        if e["type"] == "reel_watched":
            d["reels"] += 1
            d["heavy_reels"] += 1 if e.get("heavy") else 0
        elif e["type"] == "reel_sent":
            d["reels_sent_to"][e["to"]] += 1
            # a heavy reel sent counts if we know its theme; look it up from what was watched
        elif e["type"] == "message_sent" and not e.get("group"):
            d["sent"][e["to"]] += 1
            if e.get("reply_delay_s") is not None:
                d["delays"][e["to"]].append(e["reply_delay_s"] / 60)
            if e.get("length"):
                d["lengths"][e["to"]].append(e["length"])
        elif e["type"] == "message_received" and not e.get("group"):
            d["received"][e["thread"]] += 1

    # Theme of sent reels comes from the same (simulated) theme source as watched reels
    url_heavy = {e["url"]: e.get("heavy") for e in events if e["type"] == "reel_watched" and e.get("url")}
    for e in events:
        if e["type"] == "reel_sent" and url_heavy.get(e.get("url")):
            days[e["day"]]["heavy_sent"] += 1

    rows = []
    for day in sorted(days):
        d = days[day]
        wd = date.fromisoformat(day).weekday()
        row = {
            "day": day,
            "weekend": wd in WEEKEND,
            "reels": d["reels"],
            "heavy_share": round(d["heavy_reels"] / d["reels"], 3) if d["reels"] else 0.0,
            "last_active": d["last_active"],
            "heavy_sent": d["heavy_sent"],
            "reels_sent_to": dict(d["reels_sent_to"]),
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


def _mad(xs, m):
    return median([abs(x - m) for x in xs]) if xs else 0.0


def stats(values):
    vals = [v for v in values if v is not None]
    if len(vals) < 3:
        return None
    m = median(vals)
    return {"median": m, "mad": _mad(vals, m), "max": max(vals), "n": len(vals)}


def baseline_for(rows, i, window=21, min_days=7):
    """The owner's normal before day i, from up to `window` prior days."""
    prior = rows[max(0, i - window):i]
    if len(prior) < min_days:
        return None
    today_weekend = rows[i]["weekend"]
    same_kind = [r for r in prior if r["weekend"] == today_weekend]
    b = {
        "days": len(prior),
        "last_active": stats([r["last_active"] for r in (same_kind if len(same_kind) >= 3 else prior)]),
        "heavy_share": stats([r["heavy_share"] for r in prior]),
        "heavy_sent": stats([r["heavy_sent"] for r in prior]),
        "reels": stats([r["reels"] for r in prior]),
        "people": {},
    }
    for p in rows[i]["people"]:
        sent_days = [r["people"][p]["sent"] for r in prior]
        b["people"][p] = {
            "delay_min": stats([r["people"][p]["delay_min"] for r in prior]),
            "length": stats([r["people"][p]["length"] for r in prior]),
            "talk_rate": sum(1 for s in sent_days if s > 0) / len(sent_days),
            "sent": stats(sent_days),
        }
    return b
