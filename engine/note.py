"""Write one note for one friend, then prove it leaks nothing. Iris v2.

The note is minimal: the person's name, how they feel today in a word or two,
and a short nudge to connect with one idea. The writer is blind on purpose: it
only ever sees the person's first name, the friend's relation, the mood word,
one shared interest and the action type. Not even the moment behind the mood. It cannot leak what it never saw. Two
checks still run on every note: the plain-text word check (engine/voice.py)
and a separate Muse call that sees the private day and answers only "does this
note give any of it away?".
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402
from engine.day import private_terms  # noqa: E402
from engine.interests import NEVER  # noqa: E402
from engine.voice import lint  # noqa: E402

WRITE_PROMPT = ROOT / "prompts" / "note_v1.txt"
CHECK_PROMPT = ROOT / "prompts" / "check_v2.txt"

WRITE_SCHEMA = {
    "title": "note_options",
    "type": "object",
    "properties": {"options": {"type": "array", "items": {"type": "string"}}},
    "required": ["options"],
}
CHECK_SCHEMA = {
    "title": "note_check",
    "type": "object",
    "properties": {
        "leak": {"type": "boolean"},
        "harmless_if_wrong": {"type": "boolean"},
        "voice_ok": {"type": "boolean"},
        "interest_echoes": {"type": "boolean"},
        "reason": {"type": "string"},
    },
    "required": ["leak", "harmless_if_wrong", "voice_ok", "interest_echoes", "reason"],
}

# Used only if every written option fails the checks twice. Safe by construction.
FALLBACK = "{name}, {mood} today. Maybe a little {interest} plan with {name} this week?"
OPTIONAL_INTEREST = {"song", "treat"}   # the action is the idea; forcing the interest in reads oddly


def interests_for(member, first=None):
    """Interests the person allowed for this friend, Muse's pick first."""
    allowed = [i for i in member.get("allowed_interests", []) if not NEVER.search(i)]
    if first in allowed:
        allowed.remove(first)
        allowed.insert(0, first)
    return allowed


def write(situation, member, reading, action, recent=(), effort="low"):
    """Returns {to, interest, text, attempts, fallback}, or None if no interest is safe today."""
    user = situation["user"]["name"]
    fit = reading["fits"].get(member["name"], {})
    options = interests_for(member, fit.get("interest"))
    others = [m["name"] for m in situation["circle"] if m["name"] != member["name"]]
    terms = private_terms(situation["day"], member.get("allowed_interests", []))
    facts = json.dumps({"day": situation["day"], "other_people": others}, ensure_ascii=False)
    lang = member.get("language", "en")

    attempts, echoing = [], set()
    for interest in options:
        feedback = []
        for _ in range(2):
            brief = {"person": user, "relation": member.get("relation", ""),
                     "mood": reading["mood"], "interest": interest,
                     "action": action["type"], "language": lang, "recent_notes_to_this_friend": list(recent)}
            if feedback:
                brief["avoid_these_problems"] = feedback
            opts = muse.ask(WRITE_PROMPT.read_text(), json.dumps(brief, ensure_ascii=False), schema=WRITE_SCHEMA,
                            effort=effort, label="note_write").get("options", [])[:3]
            for text in opts:
                text = text.strip()
                need = None if action["type"] in OPTIONAL_INTEREST else interest
                problems = lint(text, need, others, terms, lang)
                attempts.append({"text": text, "interest": interest, "lint": problems})
                if problems:
                    feedback += problems
                    continue
                check = muse.ask(CHECK_PROMPT.read_text(),
                                 json.dumps({"note": text, "allowed": {"mood": reading["mood"], "interest": interest},
                                             "interest_required": need is not None,
                                             "private_day": facts}, ensure_ascii=False),
                                 schema=CHECK_SCHEMA, effort="low", label="note_check")
                attempts[-1]["check"] = check
                if check.get("interest_echoes"):
                    echoing.add(interest)
                    break
                if not check["leak"] and check["harmless_if_wrong"] and check["voice_ok"]:
                    return {"to": member["name"], "interest": interest, "text": text,
                            "attempts": attempts, "fallback": False}
                feedback.append(check["reason"])
            if interest in echoing:
                break  # this interest points at the private reason; try the next one
        if interest not in echoing:
            text = FALLBACK.format(name=user, mood=reading["mood"], interest=interest)
            if not lint(text, interest, others, terms, lang) and lang == "en":
                return {"to": member["name"], "interest": interest, "text": text,
                        "attempts": attempts, "fallback": True}
    return None
