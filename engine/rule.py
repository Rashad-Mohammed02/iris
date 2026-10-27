"""The "off your normal" rule. Plain Python, no AI.

A day is off on a signal only when it is clearly outside the owner's own
normal. Staying up late is never a signal by itself, only later than *your*
usual (a tester told us: "that's a normal week for me").

Heavy stretch: at least 3 of the last 5 days off on 2+ signals, and still going
(today is off). "When it matters" fires only on a heavy stretch.
Lighter stretch: 2 of the last 3 days off on 2+ signals, for "Always".
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.baseline import baseline_for, daily_signals, load_events, load_profile  # noqa: E402

OUT = ROOT / "out"

# How far outside your normal counts as "off" (absolute floors stop tiny changes firing)
LATE_MIN_HOURS = 1.0       # at least an hour later than your usual for this kind of night
HEAVY_SHARE_MIN = 0.15     # heavy reels at least 15 points above your usual share
SLOW_FACTOR = 4.0          # replies at least 4x slower than your usual for that person
SLOW_MIN_MINUTES = 60
SHORT_FACTOR = 0.6         # your messages to them at least 40% shorter than usual
QUIET_TALK_RATE = 0.6      # you usually message them on at least 60% of days


def off_signals(row, base, prev=None):
    off, evidence = [], {}
    if base is None:
        return off, evidence

    la, b = row["last_active"], base["last_active"]
    if la is not None and b:
        threshold = b["median"] + max(LATE_MIN_HOURS, 3 * b["mad"])
        if la > threshold:
            off.append("later_than_usual")
            evidence["later_than_usual"] = {"last_active": la, "usual": round(b["median"], 2)}

    hs, b = row["heavy_share"], base["heavy_share"]
    if b and hs > b["median"] + max(HEAVY_SHARE_MIN, 3 * b["mad"]):
        off.append("heavier_reels")
        evidence["heavier_reels"] = {"share": hs, "usual": round(b["median"], 3)}

    b = base["heavy_sent"]
    if row["heavy_sent"] >= 2 and (not b or row["heavy_sent"] > b["max"]):
        off.append("sending_heavy_reels")
        evidence["sending_heavy_reels"] = {"count": row["heavy_sent"], "to": row["reels_sent_to"]}

    slower, shorter, quiet = [], [], []
    for p, today in row["people"].items():
        pb = base["people"].get(p)
        if not pb:
            continue
        d, db = today["delay_min"], pb["delay_min"]
        if d is not None and db and d > max(SLOW_FACTOR * db["median"], db["median"] + SLOW_MIN_MINUTES):
            slower.append(p)
        ln, lb = today["length"], pb["length"]
        if ln is not None and lb and ln < SHORT_FACTOR * lb["median"]:
            shorter.append(p)
        before = prev["people"].get(p) if prev else None
        if (pb["talk_rate"] >= QUIET_TALK_RATE and before
                and today["sent"] == 0 and before["sent"] == 0
                and today["received"] + before["received"] > 0):
            quiet.append(p)  # you usually talk, they reached out, and you haven't replied for two days
    if len(slower) >= 2:
        off.append("slower_replies")
        evidence["slower_replies"] = slower
    if len(shorter) >= 2:
        off.append("shorter_replies")
        evidence["shorter_replies"] = shorter
    if quiet:
        off.append("gone_quiet")
        evidence["gone_quiet"] = quiet
    return off, evidence


def evaluate(events=None, profile=None):
    events = events if events is not None else load_events()
    profile = profile if profile is not None else load_profile()
    rows = daily_signals(events, profile)
    out = []
    for i, row in enumerate(rows):
        base = baseline_for(rows, i)
        off, ev = off_signals(row, base, rows[i - 1] if i > 0 else None)
        out.append({"day": row["day"], "learning": base is None, "off_signals": off, "evidence": ev,
                    "off_day": len(off) >= 2})
    for i, r in enumerate(out):
        last5 = out[max(0, i - 4):i + 1]
        last3 = out[max(0, i - 2):i + 1]
        still_going = r["off_day"]
        r["heavy_stretch"] = sum(x["off_day"] for x in last5) >= 3 and still_going
        r["lighter_stretch"] = sum(x["off_day"] for x in last3) >= 2 and still_going
        quiet_with = set()
        for x in out[max(0, i - 2):i + 1]:
            quiet_with.update(x["evidence"].get("gone_quiet", []))
        r["quiet_with"] = sorted(quiet_with)
    return out


def main():
    res = evaluate()
    OUT.mkdir(exist_ok=True)
    (OUT / "rule.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    for n, r in enumerate(res, 1):
        flag = "HEAVY" if r["heavy_stretch"] else ("light" if r["lighter_stretch"] else ("learning" if r["learning"] else ""))
        print(f"{n:>2} {r['day']}  {flag:<8} {', '.join(r['off_signals'])}" + (f"  quiet: {', '.join(r['quiet_with'])}" if r["quiet_with"] else ""))


if __name__ == "__main__":
    main()
