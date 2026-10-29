"""Muse reads one person's day: one plain mood, the moment behind it in general
words (for the person's own log; friends never see it), how big it is, any crisis, and a good fit for each friend.

Iris v2. Any direction counts: happy, proud, tired, low, calm. The read stays
with the person. Code (engine/decide.py) turns it into notes, so Muse judges
and Python enforces. Everything Muse returns is checked here before use.

The day it reads has four parts, each already compared with the person's own
normal (engine/demo.py builds it from the export and the connector feeds; the
bench gives it directly):
  see      what they watched, saved and sent on Instagram
  hear     what they played on Spotify
  talk     their own side of their DMs: how much, with whom among their 5, a few of their own lines
  happens  their calendar: yesterday, today, tomorrow
  normal   what the plain-code rule found off their own normal, in plain words
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse, safety  # noqa: E402
from engine.actions import TYPES  # noqa: E402
from engine.voice import phrase_ok  # noqa: E402

PROMPT = ROOT / "prompts" / "day_v1.txt"

# One plain word for the day, and which way it points. Code uses the direction to pick a fallback action.
MOODS = {
    "happy": "up", "buzzing": "up", "proud": "up", "excited": "up", "grateful": "up", "relieved": "up",
    "calm": "flat", "content": "flat", "okay": "flat", "busy": "flat", "focused": "flat",
    "tired": "down", "stressed": "down", "nervous": "down", "low": "down", "sad": "down", "restless": "down",
}
SIZES = ["ordinary", "notable", "big"]
GENERIC_MOMENT = {"ordinary": "an ordinary day", "notable": "a full day", "big": "a big day"}

SCHEMA = {
    "title": "day_read",
    "type": "object",
    "properties": {
        "mood": {"type": "string", "enum": list(MOODS)},
        "moment": {"type": "string"},
        "size": {"type": "string", "enum": SIZES},
        "crisis": {"type": "string", "enum": ["none", "suicide", "self_harm"]},
        "why": {"type": "string"},
        "fits": {"type": "array", "items": {
            "type": "object",
            "properties": {"name": {"type": "string"}, "interest": {"type": "string"},
                           "action": {"type": "string", "enum": list(TYPES)}, "surprise": {"type": "boolean"}},
            "required": ["name", "interest", "action", "surprise"]}},
    },
    "required": ["mood", "moment", "size", "crisis", "why", "fits"],
}


def own_words(day):
    return list((day.get("talk") or {}).get("own_words", []))


def private_terms(day, allowed=()):
    """Specific words from the day that must never reach a friend: titles, places, tracks, proper nouns."""
    terms = set()
    for e in (day.get("happens") or {}).get("events", []):
        for field in ("title", "location"):
            for w in re.findall(r"\b[A-Za-z][A-Za-z']{2,}\b", e.get(field) or ""):
                if w[0].isupper() or field == "location":
                    terms.add(w)
    hear = day.get("hear") or {}
    for t in hear.get("top_tracks", []):
        terms.update([t.get("track", ""), t.get("artist", "")])
    if hear.get("on_repeat"):
        terms.add(hear["on_repeat"])
    for line in own_words(day):
        for w in re.findall(r"(?<!^)(?<![.!?]\s)\b[A-Z][a-zA-Z]{2,}\b", line):
            terms.add(w)
    for t in (day.get("see") or {}).get("heavy_themes", []):
        terms.add(t)
    common = {"The", "And", "With", "Day", "Week", "Lunch", "Dinner", "Work", "Study", "Block", "Trip", "Weekend"}
    keep = " | ".join(a.lower() for a in allowed)
    return sorted(t for t in terms if t and t not in common and t.lower() not in keep)


def eligible_brief(situation, friends):
    return {
        "person": situation["user"]["name"],
        "day": situation["day"],
        "friends": [{"name": m["name"], "relation": m.get("relation", ""), "setting": m.get("setting"),
                     "shared_interests": m.get("allowed_interests", [])} for m in friends],
        "corrections": situation.get("corrections", []),
    }


def read_day(situation, friends, effort="medium"):
    """Muse's read of the day, checked. `friends` are the circle members who could get a note today."""
    day = situation["day"]
    r = muse.ask(PROMPT.read_text(), json.dumps(eligible_brief(situation, friends), ensure_ascii=False),
                 schema=SCHEMA, effort=effort, label="day")

    # Mood: one of the plain words, or a neutral one.
    r["mood"] = r.get("mood") if r.get("mood") in MOODS else "okay"
    r["direction"] = MOODS[r["mood"]]
    r["size"] = r.get("size") if r.get("size") in SIZES else "ordinary"

    # Moment: general words only. Anything specific is swapped for a plain one, in code.
    allowed = {i for m in friends for i in m.get("allowed_interests", [])}
    names = [m["name"] for m in situation["circle"]]
    moment = re.sub(r"\s+", " ", (r.get("moment") or "").strip().rstrip(".")).lower()
    problems = phrase_ok(moment, private_terms(day, allowed), names) if moment else ["empty"]
    r["moment_checked"] = problems
    if problems:
        r["muse_moment"], moment = moment, GENERIC_MOMENT[r["size"]]
    r["moment"] = moment

    # Crisis: Muse's read, with the plain-text backstop on top.
    flags = safety.scan(own_words(day))
    if r.get("crisis", "none") == "none" and flags["crisis"] != "none":
        r["crisis"] = flags["crisis"]

    # Fits: only real friends, only an interest the person allowed for that friend.
    by_name = {m["name"]: m for m in friends}
    fits = {}
    for f in r.get("fits", []):
        m = by_name.get(f.get("name"))
        if not m or m["name"] in fits:
            continue
        options = m.get("allowed_interests", [])
        interest = next((i for i in options if i.lower() == (f.get("interest") or "").lower()), None)
        fits[m["name"]] = {"interest": interest or (options[0] if options else None),
                           "action": f.get("action") if f.get("action") in TYPES else "message",
                           "surprise": bool(f.get("surprise"))}
    r["fits"] = fits
    return r
