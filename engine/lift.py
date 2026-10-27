"""Write one lift for one friend, then prove it leaks nothing.

The writer is blind on purpose: it only ever sees the person's first name, the
friend's name, one allowed interest and the kind of lift. It cannot leak what
it never saw. Two checks still run on every line: the plain-text lint
(engine/voice.py) and a separate Muse call that sees the private facts and
answers only "does this line give any of it away?".
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine import muse  # noqa: E402
from engine.interests import NEVER  # noqa: E402
from engine.voice import lint  # noqa: E402

WRITE_PROMPT = ROOT / "prompts" / "lift_v1.txt"
CHECK_PROMPT = ROOT / "prompts" / "check_v1.txt"

WRITE_SCHEMA = {
    "title": "lift_options",
    "type": "object",
    "properties": {"options": {"type": "array", "items": {"type": "string"}}},
    "required": ["options"],
}
CHECK_SCHEMA = {
    "title": "lift_check",
    "type": "object",
    "properties": {
        "leak": {"type": "boolean"},
        "harmless_if_wrong": {"type": "boolean"},
        "voice_ok": {"type": "boolean"},
        "reason": {"type": "string"},
    },
    "required": ["leak", "harmless_if_wrong", "voice_ok", "reason"],
}

# Used only if every written option fails the checks twice. Safe by construction.
FALLBACK = {
    "support": "{name} could use a little lift this week. {name}'s into {interest}. Plan something small around it.",
    "good": "Things are good with {name} lately. A little {interest} plan would make it even better.",
}


def pick_interest(member, pattern, recent=()):
    """One interest the person allowed for this friend, and still current."""
    allowed = [i for i in member.get("allowed_interests", []) if not NEVER.search(i)]
    status = {i.get("topic", "").lower(): i.get("status", "") for i in pattern.get("signals", {}).get("interests", [])}
    if status:
        allowed = [i for i in allowed if status.get(i.lower(), "current") == "current"]
    if not allowed:
        return None
    used = " ".join(recent).lower()
    fresh = [i for i in allowed if i.lower() not in used]
    return (fresh or allowed)[0]


def private_terms(situation, member):
    """Words from the private side that must never show up in this friend's line."""
    pattern = situation["pattern"]
    terms = set()
    for line in pattern.get("journal", []):
        # Proper nouns in the person's private writing (people, places, companies)
        for w in re.findall(r"(?<![.!?]\s)(?<!^)\b[A-Z][a-zA-Z]{2,}\b", line):
            terms.add(w)
    for t in pattern.get("signals", {}).get("reel_themes", {}).get("recent", []):
        terms.add(t)
    terms -= {situation["user"]["name"], member["name"], "I", "The", "And"}
    return sorted(terms)


def private_facts(situation):
    p = situation["pattern"]
    return {"signals": p.get("signals", {}), "private_writing": p.get("journal", []),
            "other_people": [m["name"] for m in situation["circle"]]}


def write(situation, member, kind, recent=(), effort="low"):
    """Returns {to, kind, interest, text, attempts, checks, fallback}."""
    user = situation["user"]["name"]
    interest = pick_interest(member, situation["pattern"], situation.get("recent_lines", {}).get(member["name"], []))
    others = [m["name"] for m in situation["circle"] if m["name"] != member["name"]]
    terms = private_terms(situation, member)
    facts = json.dumps(private_facts(situation), ensure_ascii=False)
    brief = {"person": user, "friend": member["name"], "relation": member.get("relation", ""),
             "interest": interest, "kind": kind, "language": member.get("language", "en"),
             "recent_lines_to_this_friend": list(recent)}

    feedback, attempts = [], []
    for _ in range(2):
        b = dict(brief, avoid_these_problems=feedback) if feedback else brief
        opts = muse.ask(WRITE_PROMPT.read_text(), json.dumps(b, ensure_ascii=False), schema=WRITE_SCHEMA,
                        effort=effort, label="lift_write").get("options", [])[:3]
        for text in opts:
            text = text.strip()
            problems = lint(text, interest, others, terms, member.get("language", "en"))
            attempts.append({"text": text, "lint": problems})
            if problems:
                feedback += problems
                continue
            check = muse.ask(CHECK_PROMPT.read_text(),
                             json.dumps({"line": text, "private_facts": facts}, ensure_ascii=False),
                             schema=CHECK_SCHEMA, effort="low", label="lift_check")
            attempts[-1]["check"] = check
            if not check["leak"] and check["harmless_if_wrong"] and check["voice_ok"]:
                return {"to": member["name"], "kind": kind, "interest": interest, "text": text,
                        "attempts": attempts, "fallback": False}
            feedback.append(check["reason"])
    text = FALLBACK[kind].format(name=user, interest=interest or "the things they love")
    return {"to": member["name"], "kind": kind, "interest": interest, "text": text,
            "attempts": attempts, "fallback": True}
