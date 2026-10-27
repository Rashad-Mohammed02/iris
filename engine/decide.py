"""Who gets a lift, if anyone. Muse reads; this file enforces.

Every gate below is plain code, in a fixed order, so no model output can talk
its way past a permission, a pause or a safety stop.

A "situation" is one person's moment: their name and age, their circle (with
each member's permission and allowed interests), and their pattern (signal
conclusions, private writing, settings). The test bench cases use the same
shape, and engine/demo.py builds one from the Instagram export.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import lift as lift_writer  # noqa: E402
from engine import safety  # noqa: E402
from engine.read import read as muse_read  # noqa: E402

LEARNING_DAYS = 14  # matches engine/baseline.py: nothing is judged in the first two weeks
UNDO_MINUTES = 10
SEND_MODES = ("ask_first", "automatic")  # the person's choice; asking first is the default


def is_paused(situation):
    settings = json.dumps(situation["pattern"].get("settings", {})).lower()
    return bool(situation.get("paused")) or "paused" in settings


def allows(member, stretch, good_broad=True):
    """What this member's permission allows for this stretch: 'support', 'good' or None."""
    level = member.get("permission", "Never")
    if level == "Just this once":
        level = "Never" if member.get("just_this_once_used") else "Just this once"
    if stretch == "good":
        return "good" if level == "Always" and good_broad else None
    if stretch == "clearly_heavy" and level in ("Always", "When it matters", "Just this once"):
        return "support"
    if stretch == "off_normal" and level in ("Always", "Just this once"):
        return "support"
    return None


def decide(situation, reading=None, write_lifts=True):
    user, pattern, circle = situation["user"], situation["pattern"], situation["circle"]
    out = {"user": user["name"], "lifts": [], "not_sent": [], "cards": [], "prompts": [], "log": [],
           "state_after": {}, "read": None, "stretch": "none"}

    def skip_all(why):
        out["not_sent"] += [{"name": m["name"], "why": why} for m in circle]
        return out

    # 1. Adults only: no reading at all.
    if safety.is_minor(user, pattern):
        out["cards"].append({"kind": "minor", "text": safety.CARDS["minor"]})
        return skip_all("Adults only")

    # 2. Still learning their normal.
    if pattern.get("learning_day", 99) <= LEARNING_DAYS:  # days 1 to 14 only learn
        return skip_all("Still learning their normal")

    r = reading or muse_read(situation)
    out["read"] = r
    stretch = r["stretch"]
    if r.get("context_explains") and stretch in ("off_normal", "clearly_heavy"):
        stretch = "none"
    if situation.get("rule_stretch") and stretch in ("off_normal", "clearly_heavy"):
        # When the Instagram rule ran (the demo), Muse may soften its verdict but never escalate it.
        order = ["none", "off_normal", "clearly_heavy"]
        stretch = order[min(order.index(stretch), order.index(situation["rule_stretch"]))]
    out["stretch"] = stretch

    # 3. Crisis: no lifts to anyone, help to the person only.
    if r["crisis"] != "none":
        out["cards"].append({"kind": "crisis", "text": safety.CARDS[r["crisis"]]})
        return skip_all("Serious is never automatic")

    # 4. Fear and pressure. Nothing automatic goes to anyone while either is open.
    #    Someone you fear is removed quietly; a setting someone pressured you into is held at its old level.
    if r["fear_flag"] or r["pressure_flag"]:
        for n in r["pressured_on"]:
            out["state_after"][n] = {"effective_permission": "Never", "notified": False, "held": True}
        for n in r["afraid_of"]:
            if n not in r["pressured_on"]:
                out["state_after"][n] = {"in_circle": False, "notified": False}
        if r["pressure_flag"]:
            out["cards"].append({"kind": "pressure", "text": safety.CARDS["pressure"], "when": "later, privately"})
        if r["fear_flag"]:
            out["cards"].append({"kind": "fear", "text": safety.CARDS["fear"]})
        return skip_all("Serious is never automatic")

    # 6. Pause wins over every permission, and nobody nags to unpause.
    if is_paused(situation):
        return skip_all("Pause is on")

    # 7. Per person.
    to_write = []
    for m in circle:
        kind = allows(m, stretch, r.get("good_broad", False))
        if not m.get("mutual", True):
            out["not_sent"].append({"name": m["name"], "why": "Not mutual yet"})
        elif kind is None:
            why = f"{m.get('permission', 'Never')} does not cover this" if stretch != "none" else "Nothing to lift"
            out["not_sent"].append({"name": m["name"], "why": why})
        elif not lift_writer.pick_interest(m, pattern):
            # A lift without an allowed interest has nothing safe to say. Ask the person privately instead.
            out["not_sent"].append({"name": m["name"], "why": "No interest allowed for them yet"})
            out["prompts"].append({"kind": "choose_interests", "about": m["name"],
                                   "text": f"Choose what {m['name']} may hear about, so a lift can reach them."})
        elif m.get("lifts_last_7_days", 0) >= 1:
            out["not_sent"].append({"name": m["name"], "why": "Already had a lift this week"})
            out["log"].append({"kind": "held", "text": f"Held a lift to {m['name']}: one per week."})
        else:
            to_write.append((m, kind))

    if write_lifts and to_write:
        # One at a time, so each friend's line is worded differently from the ones already written today.
        today = []
        for m, kind in to_write:
            recent = situation.get("recent_lines", {}).get(m["name"], []) + today
            w = lift_writer.write(situation, m, kind, recent)
            if w is None:
                # Every allowed interest would hint at something private this week. Send nothing.
                out["not_sent"].append({"name": m["name"], "why": "No interest was safe to mention this week"})
                continue
            today.append(w["text"])
            if situation.get("send_mode", "ask_first") == "automatic":
                w.update(status="queued", undo_minutes=UNDO_MINUTES)
            else:
                w.update(status="waiting_for_ok")  # nothing leaves until the person taps Send
            out["lifts"].append(w)
            out["log"].append({"kind": "lift", "to": w["to"], "text": w["text"],
                               "why": r.get("log_reason", "") if w["kind"] == "support" else "A good stretch."})
    elif to_write:
        out["lifts"] = [{"to": m["name"], "kind": k} for m, k in to_write]

    # 8. Private prompts to the person (never auto-sent; permission doesn't matter here).
    if stretch in ("off_normal", "clearly_heavy") and not to_write:
        for m in circle:
            if m.get("permission") == "Just this once" and m.get("just_this_once_used"):
                out["prompts"].append({"kind": "offer_again", "about": m["name"],
                                       "text": f"Want {m['name']} to get a lift again? Only if you'd like."})
    for n in r.get("loop_closed_with", []):
        out["prompts"].append({"kind": "close_the_loop", "about": n,
                               "text": f"{n} sent you something. How did that feel?"})
    if stretch in ("good", "none"):
        for n in r.get("good_with", []):
            out["prompts"].append({"kind": "tell_them", "about": n,
                                   "text": f"You and {n} have been on a good run. Tell them?"})
    return out
