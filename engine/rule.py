"""The "off your normal" rule. Plain Python, no AI.

Follows research/SIGNALS-RESEARCH.md, Part 5:

- Signals are grouped into families, and each family belongs to a domain:
  timing (when), content (what he chose) or social (how he relates to his people).
- A day is off only when at least two families agree, from at least two
  domains, with a combined weight of 4 or more. At least one of them must be
  timing or social, so content can add weight but never start anything.
- "Gone quiet with one person" never counts unless his reply rhythm or his
  messaging is also off. Supporting families add weight but can't be one of the two.
- Nothing is judged in the first 14 days, and days already flagged are left out
  of the baseline so a hard stretch never becomes the new normal.

- Suppressor (research Part 5, rule 5): reconnecting with someone he had gone
  quiet with lowers the day's weight by 2. Writing back is the opposite of withdrawing.

Heavy stretch: 3 of the last 5 days off, and still going (today is off).
"When it matters" fires only on a heavy stretch.
Lighter stretch: 2 of the last 3 days off, still going, for "Always".
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.baseline import baseline_for, daily_signals, load_events, load_profile, wakes_in  # noqa: E402

OUT = ROOT / "out"

# family: (domain, weight, supporting_only)
FAMILIES = {
    "S1_reply_rhythm": ("social", 3, False),
    "S2_messaging": ("social", 3, False),
    "S3_quiet_with_one": ("social", 2, False),
    "S4_reel_sending": ("social", 2, False),
    "T1_rest": ("timing", 3, False),
    "T2_daytime_binge": ("timing", 2, False),
    "T3_sessions": ("timing", 1, True),
    "T4_volume": ("timing", 1, True),
    "C1_heavy_content": ("content", 2, False),
    "C3_interest_drift": ("content", 2, False),
}
# Which family each plain signal belongs to
SIGNAL_FAMILY = {
    "later_to_sleep": "T1_rest", "shorter_rest": "T1_rest", "longer_rest": "T1_rest", "woke_in_night": "T1_rest",
    "daytime_binge": "T2_daytime_binge", "more_sessions": "T3_sessions", "more_reels": "T4_volume",
    "slower_replies": "S1_reply_rhythm", "fewer_messages": "S2_messaging", "more_messages": "S2_messaging",
    "shorter_replies": "S2_messaging", "fewer_starts": "S2_messaging", "gone_quiet": "S3_quiet_with_one",
    "sending_heavy_reels": "S4_reel_sending", "heavier_reels": "C1_heavy_content", "interest_fading": "C3_interest_drift",
}

LATER_MIN_HOURS = 1.5      # his rest starts at least 90 minutes later than usual for this kind of night
SHORTER_MIN_HOURS = 1.5    # at least 90 minutes less rest than usual
LONGER_MIN_HOURS = 3.0     # much more rest than usual counts too (research links oversleeping with low mood)
DAYTIME_FACTOR = 1.6       # daytime reels well above your usual for this kind of day
HEAVY_MIN = 0.15           # heavy share at least 15 points above your usual
SLOW_FACTOR = 4.0          # replies at least 4x slower than usual
SLOW_MIN_MINUTES = 60
SHORT_FACTOR = 0.6         # messages at least 40% shorter than usual
VOLUME_LOW, VOLUME_HIGH = 0.5, 1.8   # messages to your circle well below or well above usual
QUIET_TALK_RATE = 0.6      # you usually message them on at least 60% of days
DRIFT_MIN = 0.15           # your usual loves drop at least 15 points as a share of reels


def _spread(b, floor):
    return max(floor, 3 * b["mad"])


def off_signals(row, base, prev=None):
    off, evidence = [], {}
    if base is None:
        return off, evidence

    def flag(name, ev):
        off.append(name)
        evidence[name] = ev

    # ---- Timing: the night's rest (the longest stretch with no activity) ----
    b = base["rest_start"]
    if row["rest_start"] is not None and b and row["rest_start"] > b["median"] + _spread(b, LATER_MIN_HOURS):
        flag("later_to_sleep", {"rest_start": row["rest_start"], "usual": round(b["median"], 2)})
    b = base["rest_hours"]
    if row["rest_hours"] is not None and b:
        if row["rest_hours"] < b["median"] - _spread(b, SHORTER_MIN_HOURS):
            flag("shorter_rest", {"hours": row["rest_hours"], "usual": round(b["median"], 2)})
        elif row["rest_hours"] > b["median"] + _spread(b, LONGER_MIN_HOURS):
            flag("longer_rest", {"hours": row["rest_hours"], "usual": round(b["median"], 2)})
    if row["night_points"] is not None and base["rest_window"] and base["wakes"]:
        w = wakes_in(row["night_points"], *base["rest_window"])
        if w >= 1 and w > base["wakes"]["p90"]:
            flag("woke_in_night", {"times": w, "usual_window": [round(x, 2) for x in base["rest_window"]]})
    b = base["day_reels"]
    if b and b["median"] and row["day_reels"] > max(DAYTIME_FACTOR * b["median"], b["median"] + 3 * b["mad"]):
        flag("daytime_binge", {"day_reels": row["day_reels"], "usual": b["median"]})
    b = base["sessions"]
    if b and row["sessions"] > b["median"] + max(5, 3 * b["mad"]):
        flag("more_sessions", {"sessions": row["sessions"], "usual": b["median"]})
    b = base["reels"]
    if b and b["median"] and row["reels"] > max(1.5 * b["median"], b["median"] + 3 * b["mad"]):
        flag("more_reels", {"reels": row["reels"], "usual": b["median"]})

    # ---- Content ----
    b = base["chosen_heavy"]
    if b and row["chosen_heavy"] > max(b["p90"], b["median"] + HEAVY_MIN):
        flag("heavier_reels", {"share": row["chosen_heavy"], "usual": round(b["median"], 3)})
    b = base["top_share"]
    if b and row["reels"]:
        share = sum(row["themes"].get(t, 0) for t in base["top_themes"]) / row["reels"]
        if share < min(b["p10"], b["median"] - DRIFT_MIN):
            flag("interest_fading", {"share": round(share, 3), "usual": round(b["median"], 3), "loves": base["top_themes"]})

    # ---- Social ----
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
        flag("slower_replies", slower)
    b = base["circle_sent"]
    if b and b["median"] >= 4:
        if row["circle_sent"] < VOLUME_LOW * b["median"]:
            flag("fewer_messages", {"sent": row["circle_sent"], "usual": b["median"]})
        elif row["circle_sent"] > VOLUME_HIGH * b["median"] and row["circle_sent"] > b["max"]:
            flag("more_messages", {"sent": row["circle_sent"], "usual": b["median"]})
    if len(shorter) >= 2:
        flag("shorter_replies", shorter)
    b = base["starts"]
    if b and b["median"] >= 2 and row["starts"] <= max(0, b["median"] - _spread(b, 2)):
        flag("fewer_starts", {"starts": row["starts"], "usual": b["median"]})
    if quiet:
        flag("gone_quiet", quiet)
    b = base["heavy_sent"]
    if row["heavy_sent"] >= 2 and (not b or row["heavy_sent"] > b["max"]):
        flag("sending_heavy_reels", {"count": row["heavy_sent"], "to": row["reels_sent_to"]})
    return off, evidence


RECONNECT_RELIEF = 2


def judge(off, relief=0):
    """Which families count today, and whether the day is off (research Part 5, rules 2, 4 and 5)."""
    fams = {SIGNAL_FAMILY[s] for s in off}
    if "S3_quiet_with_one" in fams and not fams & {"S1_reply_rhythm", "S2_messaging"}:
        fams.discard("S3_quiet_with_one")  # quiet with one person is context, not evidence, on its own
    required = [f for f in fams if not FAMILIES[f][2]]
    domains = {FAMILIES[f][0] for f in required}
    weight = sum(FAMILIES[f][1] for f in fams) - relief
    off_day = (len(required) >= 2 and len(domains) >= 2 and weight >= 4
               and any(FAMILIES[f][0] in ("timing", "social") for f in required))
    return sorted(fams), weight, off_day


def evaluate(events=None, profile=None):
    events = events if events is not None else load_events()
    profile = profile if profile is not None else load_profile()
    rows = daily_signals(events, profile)
    out, flagged = [], set()
    for i, row in enumerate(rows):
        base = baseline_for(rows, i, exclude=flagged)
        off, ev = off_signals(row, base, rows[i - 1] if i > 0 else None)
        # Writing again to someone he'd gone quiet with in the last few days is reconnecting.
        was_quiet = {p for x in out[max(0, i - 5):i] for p in x["evidence"].get("gone_quiet", [])}
        back = sorted(p for p in was_quiet if row["people"].get(p, {}).get("sent"))
        back = sorted(set(back) | (set(row["reconnected_with"]) & set(row["people"])))
        fams, weight, off_day = judge(off, RECONNECT_RELIEF if back else 0)
        if off_day:
            flagged.add(i)
        out.append({"day": row["day"], "learning": base is None, "off_signals": off, "evidence": ev,
                    "families": fams, "weight": weight, "off_day": off_day,
                    "reconnected_with": back})
    for i, r in enumerate(out):
        last5 = out[max(0, i - 4):i + 1]
        last3 = out[max(0, i - 2):i + 1]
        still_going = r["off_day"]
        r["heavy_stretch"] = sum(x["off_day"] for x in last5) >= 3 and still_going
        r["lighter_stretch"] = sum(x["off_day"] for x in last3) >= 2 and still_going
        quiet_with = set()
        for x in out[max(0, i - 2):i + 1]:
            quiet_with.update(x["evidence"].get("gone_quiet", []))
        r["quiet_with"] = sorted(quiet_with - set(r["reconnected_with"]))
    return out


def main():
    res = evaluate()
    OUT.mkdir(exist_ok=True)
    (OUT / "rule.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    for n, r in enumerate(res, 1):
        flag = "HEAVY" if r["heavy_stretch"] else ("light" if r["lighter_stretch"] else
               ("OFF" if r["off_day"] else ("learning" if r["learning"] else "")))
        print(f"{n:>2} {r['day']}  {flag:<8} w{r['weight']:<2} {', '.join(r['off_signals'])}"
              + (f"  quiet: {', '.join(r['quiet_with'])}" if r["quiet_with"] else "")
              + (f"  reconnected: {', '.join(r['reconnected_with'])}" if r["reconnected_with"] else ""))


if __name__ == "__main__":
    main()
