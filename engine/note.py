"""Write one note for one friend, then prove it leaks nothing.

The note is two plain sentences. Code writes the first from the family the day
belongs to ("Arjun's having a good day."; the exact word only once Iris has earned
it, see engine/decide.py), so it is always grammatical and never more specific than
allowed. Muse writes only the second: one natural line to the friend with one idea
("Maybe send a song to keep it going?"). It never repeats the name and never reads like a button label. The writer is blind on purpose: it
only ever sees the person's first name, the friend's relation, the mood word,
one shared interest and the action type. Not even the moment behind the mood. It cannot leak what it never saw. Two
checks still run on every note: the plain-text word check (engine/voice.py)
and a separate Muse call that sees the private day and answers only "does this
note give any of it away?".
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402
from engine.day import private_terms  # noqa: E402
from engine.interests import NEVER  # noqa: E402
from engine.voice import lint  # noqa: E402

WRITE_PROMPT = ROOT / "prompts" / "note.txt"
CHECK_PROMPT = ROOT / "prompts" / "check.txt"

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
FALLBACK = "{opener} How about some {interest} talk this week?"

# The first sentence, written by code so it always reads right.
OPENERS = {
    "a good day": "{name}'s having a good day.",
    "a great day": "{name}'s having a great day.",
    "an easy day": "{name}'s having an easy day.",
    "a full day": "{name}'s having a full day.",
    "a lot on": "{name} has a lot on today.",
    "a bit low": "{name}'s feeling a bit low today.",
}
SOFTEN = {"tired": "a bit tired", "stressed": "a bit stressed", "nervous": "a bit nervous",
          "restless": "a bit restless", "low": "a bit low", "sad": "a little sad"}
PLAIN = {"busy", "focused"}   # "Arjun's busy today" reads better than "feeling busy"


def opener(name, shown):
    """'Arjun's feeling a bit low today.' A family phrase, or once earned, the exact word, softened on down days."""
    if shown in OPENERS:
        return OPENERS[shown].format(name=name)
    if shown in PLAIN:
        return f"{name}'s {shown} today."
    return f"{name}'s feeling {SOFTEN.get(shown, shown)} today."


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
    shown = reading.get("shown") or reading["mood"]
    first = opener(user, shown) if lang == "en" else None

    attempts, echoing = [], set()
    for interest in options:
        feedback = []
        for _ in range(2):
            brief = {"person": user, "relation": member.get("relation", ""),
                     "mood": shown, "first_sentence": first, "interest": interest,
                     "action": action["type"], "language": lang, "recent_notes_to_this_friend": list(recent)}
            if feedback:
                brief["avoid_these_problems"] = feedback
            opts = muse.ask(WRITE_PROMPT.read_text(), json.dumps(brief, ensure_ascii=False), schema=WRITE_SCHEMA,
                            effort=effort, label="note_write").get("options", [])[:3]
            for text in opts:
                text = text.strip()
                if first and not text.startswith(user):
                    text = first + " " + text   # Muse wrote only the second sentence
                need = None if action["type"] in OPTIONAL_INTEREST else interest
                problems = lint(text, need, others, terms, lang, person=user)
                if first and not text.startswith(first):
                    problems.append(f"does not open with {first!r}")
                attempts.append({"text": text, "interest": interest, "lint": problems})
                if problems:
                    feedback += problems
                    continue
                check = muse.ask(CHECK_PROMPT.read_text(),
                                 json.dumps({"note": text, "allowed": {"mood": shown, "interest": interest},
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
            text = FALLBACK.format(opener=first, interest=re.sub(r"^the ", "", interest))
            if lang == "en" and not lint(text, None, others, terms, lang, person=user):
                return {"to": member["name"], "interest": interest, "text": text,
                        "attempts": attempts, "fallback": True}
    return None
