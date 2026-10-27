"""Does the rule stay quiet on real people's normal weeks, and catch a hard one?

Uses real Instagram downloads from the Utrecht University set of generated
packages (researchers' own accounts, used for one to two weeks; CC BY 4.0,
https://doi.org/10.5281/zenodo.4472606). Fetch them with
scripts/fetch_real_exports.py.

Two weeks is shorter than Circle's learning period, so each person's real days
are repeated, in order, to make six weeks. Then the last week is changed:

- hard:  their nights keep going, scrolling reels until 1 to 2:30 AM, AND they send
         70% fewer messages (two areas change together, so this should be caught)
- late:  only the late-night scrolling, like a party week (one area, should NOT be caught)
- quiet: only fewer messages, like a busy week (one area, should NOT be caught)

The weeks are real people's rhythms, looped. The changes are made up. Plain
code only, no model calls.

    python3 bench/real_rhythms.py [path/to/extracted/exports]
"""

import json
import random
import sys
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from data.parse_export import Clock, parse  # noqa: E402
from engine.rule import evaluate  # noqa: E402

DEFAULT = ROOT / "data" / "real_exports"
TZ = "Europe/Amsterdam"
WEEKS = 6
MIN_DAYS, MIN_ACTIVITY = 8, 60


def loop(events, tz, days_out=WEEKS * 7):
    """Repeat the person's active days, in order, to fill `days_out` days."""
    clock = Clock(tz)
    by_day = {}
    for e in events:
        by_day.setdefault(e["day"], []).append(e)
    src = sorted(by_day)
    start = date.fromisoformat(src[0])
    out = []
    for k in range(days_out):
        s = src[k % len(src)]
        shift = (start + timedelta(days=k) - date.fromisoformat(s)).days * 86400
        for e in by_day[s]:
            ts = e["ts"] + shift
            loc = clock.local(ts)
            out.append(dict(e, ts=ts, day=clock.day(ts), hour=round(loc.hour + loc.minute / 60, 2)))
    out.sort(key=lambda e: e["ts"])
    return out


def change(events, tz, first_day, kind, seed=7):
    """Change the last week: late-night scrolling, fewer messages, or both."""
    clock, rnd = Clock(tz), random.Random(seed)
    out = []
    for e in events:
        if e["day"] >= first_day and kind in ("hard", "quiet") and e["type"] in ("message_sent", "reel_sent") and rnd.random() < 0.7:
            continue  # writes to people far less
        out.append(e)
    if kind in ("hard", "late"):
        for d in sorted({e["day"] for e in events if e["day"] >= first_day}):
            # Reels from about 1 AM to 2:30 AM, which still counts toward that day (days run 5 AM to 5 AM).
            night = date.fromisoformat(d) + timedelta(days=1)
            for k in range(14):
                hh = 1 + k * 0.11 + rnd.random() * 0.05
                from datetime import datetime
                ts = datetime(night.year, night.month, night.day, int(hh), int((hh % 1) * 60), tzinfo=clock.tz).timestamp()
                lt = clock.local(ts)
                out.append({"ts": ts, "day": clock.day(ts), "hour": round(lt.hour + lt.minute / 60, 2), "type": "reel_watched",
                            "creator": "late.night.feed", "url": "", "theme": None, "heavy": False})
    out.sort(key=lambda e: e["ts"])
    return out


def run_one(export):
    events, profile = parse(export, tz=TZ)
    owner = profile["owner"]["username"]
    activity = sum(1 for e in events if e["type"] in ("message_sent", "reel_sent", "reel_watched"))
    if len(profile["days"]) < MIN_DAYS or activity < MIN_ACTIVITY:
        return None
    looped = loop(events, TZ)
    days = sorted({e["day"] for e in looped})
    hard_start = days[-7]
    row = {"account": owner, "real_days": len(profile["days"]),
           "real_events": dict(Counter(e["type"] for e in events)), "circle": len(profile["circle"])}
    base = evaluate(looped, profile)
    judged = [r for r in base if not r["learning"] and r["day"] < hard_start]
    row["normal_days_judged"] = len(judged)
    row["false_alarm_days"] = sum(r["off_day"] for r in judged)
    row["false_alarm_stretches"] = sum(r["heavy_stretch"] or r["lighter_stretch"] for r in judged)
    for kind in ("hard", "late", "quiet"):
        res = evaluate(change(looped, TZ, hard_start, kind), profile)
        week = [r for r in res if r["day"] >= hard_start]
        caught = [i for i, r in enumerate(week, 1) if r["heavy_stretch"] or r["lighter_stretch"]]
        row[kind] = {"off_days": sum(r["off_day"] for r in week), "caught": bool(caught),
                     "first_caught_day": caught[0] if caught else None,
                     "families": sorted({f for r in week for f in r["families"]})}
    return row


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    exports = sorted(p for p in root.iterdir() if p.is_dir())
    rows = [r for r in (run_one(p) for p in exports) if r]
    skipped = len(exports) - len(rows)
    out = ROOT / "bench" / "results"
    out.mkdir(parents=True, exist_ok=True)
    (out / "real_rhythms.json").write_text(json.dumps(rows, indent=1))
    lines = ["# Real rhythms: the rule on real Instagram downloads", "",
             f"{len(rows)} accounts from the Utrecht University set of Instagram packages had enough activity ({skipped} too little).",
             "Each person's real days were looped to six weeks; the last week was then changed. See bench/real_rhythms.py.", "",
             "| Account | Real days | Normal days judged | False alarms | Hard week caught | Late nights only flagged | Quieter only flagged |",
             "|---|---|---|---|---|---|---|"]
    for r in rows:
        h = r["hard"]
        lines.append(f"| {r['account']} | {r['real_days']} | {r['normal_days_judged']} | {r['false_alarm_days']} | "
                     f"{'yes, day ' + str(h['first_caught_day']) if h['caught'] else 'no'} | "
                     f"{'yes' if r['late']['caught'] else 'no'} | {'yes' if r['quiet']['caught'] else 'no'} |")
    fa = sum(r["false_alarm_days"] for r in rows)
    nd = sum(r["normal_days_judged"] for r in rows)
    hc = sum(r["hard"]["caught"] for r in rows)
    one = sum(r["late"]["caught"] + r["quiet"]["caught"] for r in rows)
    lines += ["", f"False alarms on normal days: {fa} of {nd}. Hard weeks caught: {hc} of {len(rows)}. "
                  f"One-area weeks wrongly flagged: {one} of {2 * len(rows)}."]
    (out / "real_rhythms.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
